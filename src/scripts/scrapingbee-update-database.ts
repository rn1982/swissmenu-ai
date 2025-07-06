#!/usr/bin/env tsx

// Update Swiss product database with real Migros products using ScrapingBee

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'
import * as fs from 'fs/promises'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

interface ScrapedProduct {
  id: string
  name: string
  brand?: string
  priceChf: number
  url: string
  imageUrl?: string
  category: string
}

async function scrapeProductsFromSearch(query: string, category: string, limit = 20): Promise<ScrapedProduct[]> {
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })

  console.log(`\n🔍 Searching for: ${query} (${category})`)
  const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(query)}`
  
  try {
    const html = await scraper.scrapeUrl(searchUrl)
    const $ = cheerio.load(html)
    
    const products: ScrapedProduct[] = []
    const productElements = $('[data-testid*="product"], [class*="product-tile"]').slice(0, limit)
    
    console.log(`Found ${productElements.length} product elements`)

    // Extract product URLs first
    const productUrls: string[] = []
    productElements.each((_, elem) => {
      const link = $(elem).find('a').attr('href')
      if (link && link.includes('/product/')) {
        const fullUrl = link.startsWith('http') ? link : `https://www.migros.ch${link}`
        productUrls.push(fullUrl)
      }
    })

    console.log(`Extracted ${productUrls.length} product URLs`)

    // Scrape each product individually for accurate data
    for (const url of productUrls.slice(0, limit)) {
      try {
        const product = await scraper.scrapeProduct(url)
        if (product) {
          products.push({
            ...product,
            category
          })
          console.log(`  ✅ ${product.name} - CHF ${product.priceChf}`)
        }
      } catch (error) {
        console.log(`  ❌ Failed to scrape ${url}`)
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return products
  } catch (error) {
    console.error(`Search failed: ${error}`)
    return []
  }
}

async function updateDatabase(products: ScrapedProduct[]) {
  console.log(`\n💾 Updating database with ${products.length} products...`)

  for (const product of products) {
    try {
      // Check if product exists
      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            { migrosId: product.id },
            { url: product.url }
          ]
        }
      })

      if (existing) {
        // Update existing product
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            brand: product.brand,
            price: product.priceChf,
            url: product.url,
            imageUrl: product.imageUrl,
            category: product.category,
            lastScraped: new Date()
          }
        })
        console.log(`  📝 Updated: ${product.name}`)
      } else {
        // Create new product
        await prisma.product.create({
          data: {
            migrosId: product.id,
            name: product.name,
            brand: product.brand,
            price: product.priceChf,
            url: product.url,
            imageUrl: product.imageUrl,
            category: product.category,
            source: 'scrapingbee',
            lastScraped: new Date()
          }
        })
        console.log(`  ✨ Created: ${product.name}`)
      }
    } catch (error) {
      console.error(`  ❌ Error saving ${product.name}:`, error)
    }
  }
}

async function scrapeAllCategories() {
  const categories = [
    { name: 'pasta', queries: ['pâtes', 'pasta', 'spaghetti', 'penne'] },
    { name: 'meat', queries: ['viande', 'poulet', 'boeuf', 'porc'] },
    { name: 'vegetables', queries: ['légumes', 'tomates', 'salade', 'carottes'] },
    { name: 'dairy', queries: ['lait', 'fromage', 'yogourt', 'beurre'] },
    { name: 'bakery', queries: ['pain', 'croissant', 'baguette'] },
    { name: 'beverages', queries: ['boissons', 'eau', 'jus', 'coca'] },
    { name: 'frozen', queries: ['surgelés', 'glace', 'pizza surgelée'] },
    { name: 'pantry', queries: ['conserves', 'riz', 'huile', 'sel'] },
    { name: 'snacks', queries: ['snacks', 'chips', 'chocolat', 'biscuits'] }
  ]

  const allProducts: ScrapedProduct[] = []

  for (const category of categories) {
    console.log(`\n📂 Category: ${category.name}`)
    
    for (const query of category.queries) {
      const products = await scrapeProductsFromSearch(query, category.name, 10)
      allProducts.push(...products)
      
      // Be nice to the API
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  return allProducts
}

async function main() {
  console.log('🚀 ScrapingBee Database Update\n')

  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found')
    return
  }

  try {
    // Option 1: Quick test with one category
    console.log('Running quick test with pasta category...')
    const testProducts = await scrapeProductsFromSearch('pasta barilla', 'pasta', 5)
    
    if (testProducts.length > 0) {
      await updateDatabase(testProducts)
      
      console.log('\n✅ Test successful! Found and saved products.')
      console.log('\n💡 To scrape all categories, run:')
      console.log('   npx tsx src/scripts/scrapingbee-update-database.ts --all')
    } else {
      console.log('❌ No products found in test')
    }

    // Option 2: Full scraping (if --all flag)
    if (process.argv.includes('--all')) {
      console.log('\n🔄 Starting full category scraping...')
      console.log('⚠️  This will use approximately 300-400 API credits')
      
      const allProducts = await scrapeAllCategories()
      await updateDatabase(allProducts)
      
      console.log(`\n✅ Complete! Scraped ${allProducts.length} products`)
    }

    // Show database stats
    const productCount = await prisma.product.count()
    const scrapedCount = await prisma.product.count({
      where: { source: 'scrapingbee' }
    })
    
    console.log('\n📊 Database Statistics:')
    console.log(`  - Total products: ${productCount}`)
    console.log(`  - ScrapingBee products: ${scrapedCount}`)
    console.log(`  - Categories: ${await prisma.product.groupBy({ by: ['category'] }).then(g => g.length)}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)