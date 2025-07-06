#!/usr/bin/env node

// Quick population script for ScrapingBee - scrapes key products efficiently

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// Priority products to scrape (most common Swiss groceries)
const PRIORITY_SEARCHES = [
  // Pasta & Rice
  { query: 'barilla pasta', category: 'pasta', limit: 5 },
  { query: 'riz uncle bens', category: 'rice', limit: 3 },
  
  // Meat & Poultry
  { query: 'poulet migros', category: 'meat', limit: 5 },
  { query: 'viande hachée', category: 'meat', limit: 3 },
  
  // Vegetables
  { query: 'tomates', category: 'vegetables', limit: 5 },
  { query: 'salade', category: 'vegetables', limit: 3 },
  
  // Dairy
  { query: 'lait migros', category: 'dairy', limit: 3 },
  { query: 'gruyère', category: 'dairy', limit: 3 },
  { query: 'yogourt', category: 'dairy', limit: 3 },
  
  // Bakery
  { query: 'pain mi-blanc', category: 'bakery', limit: 3 },
  { query: 'croissant', category: 'bakery', limit: 2 },
  
  // Pantry
  { query: 'huile olive', category: 'pantry', limit: 3 },
  { query: 'sel', category: 'pantry', limit: 2 },
  { query: 'farine', category: 'pantry', limit: 2 }
]

async function scrapeProducts(scraper: ProxyScraper, query: string, limit: number) {
  const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(query)}`
  console.log(`\n🔍 Searching: ${query}`)
  
  try {
    const html = await scraper.scrapeUrl(searchUrl)
    const $ = cheerio.load(html)
    
    // Extract product URLs
    const productUrls: string[] = []
    $('a[href*="/product/"]').each((_, elem) => {
      const href = $(elem).attr('href')
      if (href && !href.includes('/category/')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
        if (!productUrls.includes(fullUrl)) {
          productUrls.push(fullUrl)
        }
      }
    })
    
    console.log(`Found ${productUrls.length} products`)
    
    // Scrape individual products
    const products = []
    for (const url of productUrls.slice(0, limit)) {
      try {
        const product = await scraper.scrapeProduct(url)
        if (product) {
          products.push(product)
          console.log(`  ✓ ${product.name} - CHF ${product.priceChf}`)
        }
      } catch (error) {
        console.log(`  ✗ Failed to scrape ${url}`)
      }
      
      // Shorter delay for quick population
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return products
  } catch (error) {
    console.error(`Search failed for "${query}": ${error}`)
    return []
  }
}

async function updateDatabase(products: any[], category: string) {
  let created = 0
  let updated = 0
  
  for (const product of products) {
    try {
      const existing = await prisma.migrosProduct.findFirst({
        where: {
          OR: [
            { migrosId: product.id },
            { url: product.url }
          ]
        }
      })

      if (existing) {
        await prisma.migrosProduct.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            brand: product.brand,
            price: product.priceChf,
            url: product.url,
            imageUrl: product.imageUrl,
            category: category,
            source: 'scrapingbee',
            lastScraped: new Date()
          }
        })
        updated++
      } else {
        await prisma.migrosProduct.create({
          data: {
            migrosId: product.id,
            name: product.name,
            brand: product.brand,
            price: product.priceChf,
            url: product.url,
            imageUrl: product.imageUrl,
            category: category,
            source: 'scrapingbee',
            lastScraped: new Date()
          }
        })
        created++
      }
    } catch (error) {
      console.error(`Database error for ${product.name}:`, error)
    }
  }
  
  return { created, updated }
}

async function main() {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found in environment')
    return
  }

  console.log('🐝 Starting ScrapingBee quick population...')
  console.log(`Will scrape ${PRIORITY_SEARCHES.reduce((sum, s) => sum + s.limit, 0)} products total`)
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  let totalCreated = 0
  let totalUpdated = 0
  let totalScraped = 0
  
  try {
    for (const search of PRIORITY_SEARCHES) {
      const products = await scrapeProducts(scraper, search.query, search.limit)
      if (products.length > 0) {
        const result = await updateDatabase(products, search.category)
        totalCreated += result.created
        totalUpdated += result.updated
        totalScraped += products.length
      }
    }
    
    console.log('\n✅ Quick population complete!')
    console.log(`📊 Summary:`)
    console.log(`- Products scraped: ${totalScraped}`)
    console.log(`- New products: ${totalCreated}`)
    console.log(`- Updated products: ${totalUpdated}`)
    console.log(`- Estimated credits used: ${totalScraped * 10}`)
    
    // Show final database status
    const scrapingBeeCount = await prisma.migrosProduct.count({
      where: { source: 'scrapingbee' }
    })
    console.log(`\n📦 Total ScrapingBee products in database: ${scrapingBeeCount}`)
    
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}