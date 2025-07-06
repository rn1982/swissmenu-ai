#!/usr/bin/env node

// Populate database using search queries (more reliable than category pages)

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// Search queries that return good results
const SEARCH_QUERIES = {
  'pasta': ['pâtes barilla', 'spaghetti', 'penne', 'fusilli', 'lasagne'],
  'meat': ['poulet', 'boeuf haché', 'escalope porc', 'saucisse', 'jambon'],
  'vegetables': ['tomates', 'salade', 'carottes', 'pommes terre', 'oignons'],
  'dairy': ['lait', 'fromage gruyère', 'yogourt', 'beurre', 'crème'],
  'bakery': ['pain', 'croissant', 'pain complet', 'baguette'],
  'pantry': ['huile olive', 'sel', 'farine', 'sucre', 'pâte tomate']
}

let totalScraped = 0
let totalSaved = 0

async function searchAndScrape(scraper: ProxyScraper, query: string, category: string, limit: number) {
  const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(query)}`
  console.log(`\n🔍 Searching: "${query}" for ${category}`)
  
  try {
    const html = await scraper.scrapeUrl(searchUrl)
    const $ = cheerio.load(html)
    
    // Extract product URLs from search results
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
          products.push({ ...product, category })
          console.log(`  ✓ ${product.name} - CHF ${product.priceChf}`)
          totalScraped++
        }
      } catch (error) {
        console.log(`  ✗ Failed to scrape product`)
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    return products
  } catch (error) {
    console.error(`Search failed for "${query}":`, error)
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
      console.error(`Failed to save product:`, error.message)
    }
  }
  
  return saved
}

async function main() {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found')
    return
  }

  const args = process.argv.slice(2)
  const productsPerQuery = parseInt(args[0]) || 3
  const categories = args[1] ? args[1].split(',') : Object.keys(SEARCH_QUERIES)
  
  console.log('🐝 Starting database population via search')
  console.log(`📊 Settings:`)
  console.log(`  - Products per query: ${productsPerQuery}`)
  console.log(`  - Categories: ${categories.join(', ')}`)
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  const startTime = Date.now()
  
  try {
    for (const category of categories) {
      if (!SEARCH_QUERIES[category]) {
        console.log(`⚠️  Unknown category: ${category}`)
        continue
      }
      
      console.log(`\n📦 Category: ${category}`)
      const queries = SEARCH_QUERIES[category]
      
      for (const query of queries) {
        const products = await searchAndScrape(scraper, query, category, productsPerQuery)
        if (products.length > 0) {
          const saved = await saveProducts(products)
          console.log(`💾 Saved ${saved} products`)
        }
      }
    }
    
    // Final report
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log('\n✅ Population complete!')
    console.log(`📊 Summary:`)
    console.log(`  - Total scraped: ${totalScraped}`)
    console.log(`  - Total saved: ${totalSaved}`)
    console.log(`  - Duration: ${duration}s`)
    console.log(`  - Credits used: ~${totalScraped * 10}`)
    
    // Check final database status
    const scrapingBeeCount = await prisma.migrosProduct.count({
      where: { source: 'scrapingbee' }
    })
    const totalCount = await prisma.migrosProduct.count()
    
    console.log(`\n📦 Database Status:`)
    console.log(`  - ScrapingBee products: ${scrapingBeeCount}`)
    console.log(`  - Total products: ${totalCount}`)
    
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  console.log(`
Usage: npx tsx src/scripts/populate-by-search.ts [products_per_query] [categories]

Examples:
  npx tsx src/scripts/populate-by-search.ts 3                     # 3 products per query, all categories
  npx tsx src/scripts/populate-by-search.ts 5 pasta,meat,dairy    # 5 products per query, specific categories
  npx tsx src/scripts/populate-by-search.ts 2                     # Quick test with 2 products per query
`)
  
  main()
}