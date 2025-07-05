#!/usr/bin/env tsx

// Optimized Migros scraper using MigrosProduct model

import { ProxyScraper } from '../lib/proxy-scraper'
import { db } from '../lib/db'
import { migrosCategories, CategoryConfig } from '../config/migros-categories'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'

dotenv.config({ path: '.env.local' })

interface ScrapingStats {
  totalProducts: number
  newProducts: number
  updatedProducts: number
  failedProducts: number
  creditsUsed: number
}

async function scrapeCategory(scraper: ProxyScraper, categoryUrl: string, categoryName: string, limit = 50): Promise<ScrapingStats> {
  const stats: ScrapingStats = {
    totalProducts: 0,
    newProducts: 0,
    updatedProducts: 0,
    failedProducts: 0,
    creditsUsed: 0
  }

  console.log(`\n🔍 Scraping category: ${categoryName}`)
  console.log(`📍 URL: ${categoryUrl}`)

  try {
    const html = await scraper.scrapeUrl(categoryUrl)
    stats.creditsUsed += 10
    
    const $ = cheerio.load(html)
    const productUrls: string[] = []
    
    $('a[href*="/product/"]').each((_, elem) => {
      const href = $(elem).attr('href')
      if (href && href.includes('/product/') && !href.includes('/category/')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
        if (!productUrls.includes(fullUrl)) {
          productUrls.push(fullUrl)
        }
      }
    })

    console.log(`📦 Found ${productUrls.length} products`)
    
    const productsToScrape = productUrls.slice(0, limit)
    
    for (let i = 0; i < productsToScrape.length; i++) {
      const url = productsToScrape[i]
      console.log(`\n[${i + 1}/${productsToScrape.length}] Scraping: ${url}`)
      
      try {
        const product = await scraper.scrapeProduct(url)
        stats.creditsUsed += 10
        
        if (product) {
          stats.totalProducts++
          
          // Save to MigrosProduct table
          const existing = await db.migrosProduct.findFirst({
            where: { id: product.id }
          })

          if (existing) {
            await db.migrosProduct.update({
              where: { id: product.id },
              data: {
                name: product.name,
                brand: product.brand,
                priceChf: product.priceChf,
                url: product.url,
                imageUrl: product.imageUrl,
                category: categoryName,
                lastUpdated: new Date()
              }
            })
            stats.updatedProducts++
            console.log(`  ✅ Updated: ${product.name} - CHF ${product.priceChf}`)
          } else {
            await db.migrosProduct.create({
              data: {
                id: product.id,
                name: product.name,
                brand: product.brand,
                priceChf: product.priceChf,
                url: product.url,
                imageUrl: product.imageUrl,
                category: categoryName,
                lastUpdated: new Date()
              }
            })
            stats.newProducts++
            console.log(`  ✨ Created: ${product.name} - CHF ${product.priceChf}`)
          }
        } else {
          stats.failedProducts++
          console.log(`  ❌ Failed to parse product`)
        }
      } catch (error) {
        stats.failedProducts++
        console.log(`  ❌ Error: ${error}`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
  } catch (error) {
    console.error(`Failed to scrape category: ${error}`)
  }
  
  return stats
}

async function main() {
  console.log('🚀 Migros Product Scraper\n')
  
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found')
    return
  }
  
  const args = process.argv.slice(2)
  
  // Parse arguments
  let productsPerUrl = 20
  const limitIndex = args.indexOf('--limit')
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    productsPerUrl = parseInt(args[limitIndex + 1], 10)
  }
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  try {
    const startTime = Date.now()
    const globalStats: ScrapingStats = {
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      failedProducts: 0,
      creditsUsed: 0
    }
    
    if (args.includes('--test')) {
      // Test with pasta category
      console.log('🧪 Test mode: Scraping pasta URLs only')
      console.log(`📦 Products per URL: ${productsPerUrl}\n`)
      
      const pastaCategory = migrosCategories.find(c => c.name === 'pasta-rice')!
      
      for (const url of pastaCategory.urls) {
        const stats = await scrapeCategory(scraper, url, 'pasta-rice', productsPerUrl)
        
        globalStats.totalProducts += stats.totalProducts
        globalStats.newProducts += stats.newProducts
        globalStats.updatedProducts += stats.updatedProducts
        globalStats.failedProducts += stats.failedProducts
        globalStats.creditsUsed += stats.creditsUsed
      }
    } else {
      // Scrape priority categories
      console.log('⭐ Scraping high priority categories')
      console.log(`📦 Products per URL: ${productsPerUrl}\n`)
      
      const priorityCategories = migrosCategories.filter(c => c.priority === 1)
      
      for (const category of priorityCategories) {
        console.log(`\n📂 Processing: ${category.displayName}`)
        
        for (const url of category.urls) {
          const stats = await scrapeCategory(scraper, url, category.name, productsPerUrl)
          
          globalStats.totalProducts += stats.totalProducts
          globalStats.newProducts += stats.newProducts
          globalStats.updatedProducts += stats.updatedProducts
          globalStats.failedProducts += stats.failedProducts
          globalStats.creditsUsed += stats.creditsUsed
        }
      }
    }
    
    // Final summary
    const duration = Math.round((Date.now() - startTime) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 SCRAPING COMPLETE')
    console.log('='.repeat(50))
    console.log(`Total products scraped: ${globalStats.totalProducts}`)
    console.log(`New products: ${globalStats.newProducts}`)
    console.log(`Updated products: ${globalStats.updatedProducts}`)
    console.log(`Failed: ${globalStats.failedProducts}`)
    console.log(`API credits used: ${globalStats.creditsUsed}`)
    console.log(`Estimated cost: $${(globalStats.creditsUsed * 0.0003).toFixed(2)}`)
    console.log(`Duration: ${minutes}m ${seconds}s`)
    
    // Database stats
    const totalInDb = await db.migrosProduct.count()
    console.log(`\n📦 Total products in database: ${totalInDb}`)
    
  } catch (error) {
    console.error('Fatal error:', error)
  }
}

if (require.main === module) {
  main().catch(console.error)
}