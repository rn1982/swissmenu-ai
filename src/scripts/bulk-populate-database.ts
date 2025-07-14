#!/usr/bin/env node

// Bulk database population script - efficiently scrapes products from all categories

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'
import * as fs from 'fs/promises'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// Fixed Migros category URLs (verified working)
const CATEGORY_URLS = {
  'pasta': [
    'https://www.migros.ch/fr/category/110503000000',  // Pâtes
    'https://www.migros.ch/fr/category/110504000000',  // Riz
    'https://www.migros.ch/fr/category/518508000000'   // Nouilles asiatiques
  ],
  'meat': [
    'https://www.migros.ch/fr/category/210100200000',  // Bœuf
    'https://www.migros.ch/fr/category/210103700000',  // Viande hachée
    'https://www.migros.ch/fr/category/210100700000',  // Porc
    'https://www.migros.ch/fr/category/210101600000',  // Veau
    'https://www.migros.ch/fr/category/210100300000'   // Volaille
  ],
  'vegetables': [
    'https://www.migros.ch/fr/category/120100100000',  // Légumes frais
    'https://www.migros.ch/fr/category/126100300000'   // Légumes surgelés
  ],
  'dairy': [
    'https://www.migros.ch/fr/category/170100100000',  // Lait & œufs
    'https://www.migros.ch/fr/category/170100200000',  // Fromage
    'https://www.migros.ch/fr/category/170100400000'   // Yogourt
  ],
  'bakery': [
    'https://www.migros.ch/fr/category/130100100000',  // Pain
    'https://www.migros.ch/fr/category/130100300000',  // Pâtisserie
    'https://www.migros.ch/fr/category/130100400000'   // Biscuits
  ],
  'pantry': [
    'https://www.migros.ch/fr/category/110521000000',  // Huiles
    'https://www.migros.ch/fr/category/110511000000',  // Farine
    'https://www.migros.ch/fr/category/110513000000',  // Sel & épices
    'https://www.migros.ch/fr/category/110502000000',  // Sauces
    'https://www.migros.ch/fr/category/110507000000',  // Conserves
    'https://www.migros.ch/fr/category/110501000000'   // Condiments
  ],
  'beverages': [
    'https://www.migros.ch/fr/category/320200000000',  // Eau
    'https://www.migros.ch/fr/category/310200000000',  // Jus
    'https://www.migros.ch/fr/category/310100000000'   // Boissons sucrées
  ]
}

// Progress tracking
let totalScraped = 0
let totalSaved = 0
let totalErrors = 0

async function scrapeCategory(scraper: ProxyScraper, categoryUrl: string, category: string, limit: number) {
  console.log(`\n📦 Scraping ${category} from: ${categoryUrl}`)
  
  try {
    const html = await scraper.scrapeUrl(categoryUrl)
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
    
    console.log(`Found ${productUrls.length} products in ${category}`)
    
    // Scrape individual products
    const products = []
    for (const url of productUrls.slice(0, limit)) {
      try {
        const product = await scraper.scrapeProduct(url)
        if (product) {
          products.push({ ...product, category })
          console.log(`  ✓ ${product.name} - CHF ${product.priceChf}`)
          totalScraped++
        }
      } catch (error) {
        console.log(`  ✗ Failed to scrape ${url}`)
        totalErrors++
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    return products
  } catch (error) {
    console.error(`Failed to scrape category ${category}:`, error)
    return []
  }
}

async function saveProducts(products: any[]) {
  let saved = 0
  
  for (const product of products) {
    try {
      const productId = product.id || `${product.category}-${Date.now()}-${Math.random()}`
      
      await prisma.migrosProduct.upsert({
        where: { id: productId },
        create: {
          id: productId,
          migrosId: product.id,
          name: product.name,
          brand: product.brand || 'N/A',
          price: product.priceChf,
          priceChf: product.priceChf,
          url: product.url,
          imageUrl: product.imageUrl || '',
          category: product.category,
          source: 'scrapingbee',
          lastScraped: new Date()
        },
        update: {
          name: product.name,
          price: product.priceChf,
          priceChf: product.priceChf,
          url: product.url,
          imageUrl: product.imageUrl || '',
          source: 'scrapingbee',
          lastScraped: new Date()
        }
      })
      saved++
      totalSaved++
    } catch (error) {
      console.error(`Failed to save product ${product.name}:`, error)
    }
  }
  
  return saved
}

async function main() {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found in environment')
    return
  }

  const args = process.argv.slice(2)
  const productsPerCategory = parseInt(args[0]) || 10
  const targetCategories = args[1] ? args[1].split(',') : Object.keys(CATEGORY_URLS)
  
  console.log('🐝 Starting bulk database population with ScrapingBee')
  console.log(`📊 Settings:`)
  console.log(`  - Products per category: ${productsPerCategory}`)
  console.log(`  - Categories: ${targetCategories.join(', ')}`)
  console.log(`  - Estimated time: ${targetCategories.length * productsPerCategory * 3}s`)
  console.log(`  - Estimated credits: ${targetCategories.length * productsPerCategory * 10}`)
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  const startTime = Date.now()
  
  try {
    // Scrape each category
    for (const category of targetCategories) {
      if (!CATEGORY_URLS[category as keyof typeof CATEGORY_URLS]) {
        console.log(`⚠️  Unknown category: ${category}`)
        continue
      }
      
      const urls = CATEGORY_URLS[category as keyof typeof CATEGORY_URLS]
      const productsPerUrl = Math.ceil(productsPerCategory / urls.length)
      
      for (const url of urls) {
        const products = await scrapeCategory(scraper, url, category, productsPerUrl)
        if (products.length > 0) {
          const saved = await saveProducts(products)
          console.log(`💾 Saved ${saved} products from ${category}`)
        }
      }
    }
    
    // Final report
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log('\n✅ Bulk population complete!')
    console.log(`📊 Final Report:`)
    console.log(`  - Total scraped: ${totalScraped} products`)
    console.log(`  - Total saved: ${totalSaved} products`)
    console.log(`  - Total errors: ${totalErrors}`)
    console.log(`  - Duration: ${duration}s`)
    console.log(`  - Credits used: ~${totalScraped * 10}`)
    
    // Check database status
    const dbStats = await prisma.migrosProduct.groupBy({
      by: ['category', 'source'],
      _count: true
    })
    
    console.log('\n📦 Database Status:')
    const categories: any = {}
    dbStats.forEach(stat => {
      if (stat.category && stat.source) {
        if (!categories[stat.category]) categories[stat.category] = {}
        categories[stat.category][stat.source] = stat._count
      }
    })
    
    Object.entries(categories).forEach(([cat, sources]: [string, any]) => {
      const scrapingbee = sources['scrapingbee'] || 0
      const fallback = sources['fallback'] || 0
      console.log(`  ${cat}: ${scrapingbee} real + ${fallback} fallback = ${scrapingbee + fallback} total`)
    })
    
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// CLI usage
if (require.main === module) {
  console.log(`
Usage: npx tsx src/scripts/bulk-populate-database.ts [products_per_category] [categories]

Examples:
  npx tsx src/scripts/bulk-populate-database.ts 10                    # 10 products from all categories
  npx tsx src/scripts/bulk-populate-database.ts 20 pasta,meat,dairy   # 20 products from specific categories
  npx tsx src/scripts/bulk-populate-database.ts 5                     # Quick test with 5 products per category
`)
  
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}