#!/usr/bin/env node

// Parallel scraping script to quickly populate 100 real products

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'
import { performance } from 'perf_hooks'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// Search queries optimized for Swiss products
const SEARCH_QUERIES = {
  'pasta': ['barilla', 'spaghetti', 'penne', 'fusilli', 'lasagne', 'tagliatelle'],
  'meat': ['poulet', 'boeuf', 'porc', 'veau', 'viande hachée', 'saucisse'],
  'dairy': ['lait', 'fromage', 'yogourt', 'beurre', 'crème', 'mozzarella'],
  'vegetables': ['tomates', 'salade', 'carottes', 'oignons', 'pommes terre', 'courgettes'],
  'bakery': ['pain', 'croissant', 'baguette', 'pain complet', 'brioche'],
  'pantry': ['huile', 'sel', 'farine', 'sucre', 'riz', 'pâtes tomate', 'vinaigre']
}

const BATCH_SIZE = 5 // Number of concurrent requests
const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds

let totalScraped = 0
let totalSaved = 0
let totalErrors = 0

// Progress bar
function updateProgress(current: number, total: number, category: string) {
  const percent = Math.round((current / total) * 100)
  const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2))
  process.stdout.write(`\r[${bar}] ${percent}% | ${current}/${total} products | Current: ${category}`)
}

async function searchProducts(scraper: ProxyScraper, query: string, limit: number = 10): Promise<string[]> {
  const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(query)}`
  
  try {
    const html = await scraper.scrapeUrl(searchUrl)
    const $ = cheerio.load(html)
    
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
    
    return productUrls.slice(0, limit)
  } catch (error) {
    console.error(`\nSearch failed for "${query}"`)
    return []
  }
}

async function scrapeProductBatch(scraper: ProxyScraper, urls: string[], category: string): Promise<any[]> {
  const promises = urls.map(async (url) => {
    try {
      const product = await scraper.scrapeProduct(url)
      if (product) {
        totalScraped++
        return { ...product, category }
      }
    } catch (error) {
      totalErrors++
    }
    return null
  })
  
  const results = await Promise.all(promises)
  return results.filter(p => p !== null)
}

async function saveProducts(products: any[]): Promise<number> {
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
          price: product.priceChf,
          priceChf: product.priceChf,
          source: 'scrapingbee',
          lastScraped: new Date()
        }
      })
      saved++
      totalSaved++
    } catch (error) {
      // Skip duplicates or errors
    }
  }
  
  return saved
}

async function main() {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found')
    return
  }

  console.log('🐝 Starting parallel scraping of 100 products...')
  console.log('📊 Configuration:')
  console.log(`  - Target: 100 products`)
  console.log(`  - Batch size: ${BATCH_SIZE} concurrent requests`)
  console.log(`  - Categories: ${Object.keys(SEARCH_QUERIES).join(', ')}`)
  console.log('\n')

  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })

  const startTime = performance.now()
  const targetTotal = 100
  
  try {
    // Collect all product URLs first
    console.log('📍 Phase 1: Collecting product URLs...')
    const allProductUrls: { url: string, category: string }[] = []
    
    for (const [category, queries] of Object.entries(SEARCH_QUERIES)) {
      for (const query of queries) {
        const urls = await searchProducts(scraper, query, 5)
        urls.forEach(url => allProductUrls.push({ url, category }))
        
        if (allProductUrls.length >= targetTotal) break
      }
      if (allProductUrls.length >= targetTotal) break
    }
    
    // Limit to target number
    const urlsToScrape = allProductUrls.slice(0, targetTotal)
    console.log(`\n✓ Found ${urlsToScrape.length} product URLs\n`)
    
    // Phase 2: Scrape products in batches
    console.log('📍 Phase 2: Scraping products in parallel...\n')
    
    for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
      const batch = urlsToScrape.slice(i, i + BATCH_SIZE)
      const urls = batch.map(b => b.url)
      const category = batch[0].category
      
      updateProgress(i, targetTotal, category)
      
      const products = await scrapeProductBatch(scraper, urls, category)
      if (products.length > 0) {
        await saveProducts(products)
      }
      
      // Delay between batches
      if (i + BATCH_SIZE < urlsToScrape.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }
    }
    
    updateProgress(targetTotal, targetTotal, 'Complete')
    console.log('\n')
    
    // Final report
    const duration = Math.round((performance.now() - startTime) / 1000)
    console.log('\n✅ Parallel scraping complete!')
    console.log('📊 Results:')
    console.log(`  - Scraped: ${totalScraped} products`)
    console.log(`  - Saved: ${totalSaved} products`)
    console.log(`  - Errors: ${totalErrors}`)
    console.log(`  - Duration: ${duration} seconds`)
    console.log(`  - Speed: ${(totalScraped / duration).toFixed(1)} products/second`)
    console.log(`  - Credits used: ~${totalScraped * 10}`)
    
    // Database status
    const count = await prisma.migrosProduct.count({
      where: { source: 'scrapingbee' }
    })
    console.log(`\n📦 Total ScrapingBee products in database: ${count}`)
    
  } catch (error) {
    console.error('\nFatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch(console.error)
}