#!/usr/bin/env tsx

// Optimized category scraper using fixed Migros URLs

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import { migrosCategories, CategoryConfig } from '../config/migros-categories'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'
import * as fs from 'fs/promises'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

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
    // Scrape category page
    const html = await scraper.scrapeUrl(categoryUrl)
    stats.creditsUsed += 10 // Category page with JS
    
    const $ = cheerio.load(html)
    
    // Extract product URLs
    const productUrls: string[] = []
    
    // Multiple selectors for different page layouts
    const selectors = [
      'a[href*="/product/"]',
      '[data-testid="product-link"]',
      '.product-link',
      '[class*="product-card"] a',
      '[class*="product-tile"] a'
    ]
    
    selectors.forEach(selector => {
      $(selector).each((_, elem) => {
        const href = $(elem).attr('href')
        if (href && href.includes('/product/') && !href.includes('/category/')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
          if (!productUrls.includes(fullUrl)) {
            productUrls.push(fullUrl)
          }
        }
      })
    })

    console.log(`📦 Found ${productUrls.length} products`)
    
    // Scrape individual products (up to limit)
    const productsToScrape = productUrls.slice(0, limit)
    
    for (let i = 0; i < productsToScrape.length; i++) {
      const url = productsToScrape[i]
      console.log(`\n[${i + 1}/${productsToScrape.length}] Scraping: ${url}`)
      
      try {
        const product = await scraper.scrapeProduct(url)
        stats.creditsUsed += 10 // Product page with JS
        
        if (product) {
          stats.totalProducts++
          
          // Save to database
          const existing = await prisma.product.findFirst({
            where: {
              OR: [
                { migrosId: product.id },
                { url: product.url }
              ]
            }
          })

          if (existing) {
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                name: product.name,
                brand: product.brand,
                price: product.priceChf,
                url: product.url,
                imageUrl: product.imageUrl,
                category: categoryName,
                source: 'scrapingbee',
                lastScraped: new Date()
              }
            })
            stats.updatedProducts++
            console.log(`  ✅ Updated: ${product.name} - CHF ${product.priceChf}`)
          } else {
            await prisma.product.create({
              data: {
                migrosId: product.id,
                name: product.name,
                brand: product.brand,
                price: product.priceChf,
                url: product.url,
                imageUrl: product.imageUrl,
                category: categoryName,
                source: 'scrapingbee',
                lastScraped: new Date()
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
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
  } catch (error) {
    console.error(`Failed to scrape category: ${error}`)
  }
  
  return stats
}

async function scrapeCategoryGroup(category: CategoryConfig, productsPerUrl = 20): Promise<ScrapingStats> {
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })
  
  const totalStats: ScrapingStats = {
    totalProducts: 0,
    newProducts: 0,
    updatedProducts: 0,
    failedProducts: 0,
    creditsUsed: 0
  }
  
  console.log(`\n📂 Processing category group: ${category.displayName}`)
  console.log(`   Priority: ${category.priority}`)
  console.log(`   URLs: ${category.urls.length}`)
  
  for (const url of category.urls) {
    const stats = await scrapeCategory(scraper, url, category.name, productsPerUrl)
    
    // Aggregate stats
    totalStats.totalProducts += stats.totalProducts
    totalStats.newProducts += stats.newProducts
    totalStats.updatedProducts += stats.updatedProducts
    totalStats.failedProducts += stats.failedProducts
    totalStats.creditsUsed += stats.creditsUsed
  }
  
  return totalStats
}

async function main() {
  console.log('🚀 Migros Category Scraper\n')
  
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found')
    return
  }
  
  const args = process.argv.slice(2)
  
  if (args.includes('--help')) {
    console.log(`
Usage:
  npm run scrape:categories                 Scrape high priority categories
  npm run scrape:categories --all           Scrape all categories
  npm run scrape:categories --test          Test with pasta category only
  npm run scrape:categories --stats         Show database statistics
  npm run scrape:categories --limit <n>     Limit products per category URL (default: 20)

Examples:
  npm run scrape:categories --test --limit 10    Test with 10 products per URL
  npm run scrape:categories --limit 30           Scrape priority categories with 30 products each
    `)
    return
  }
  
  if (args.includes('--stats')) {
    const totalProducts = await prisma.product.count()
    const scrapedProducts = await prisma.product.count({
      where: { source: 'scrapingbee' }
    })
    const categoryStats = await prisma.product.groupBy({
      by: ['category'],
      _count: true,
      where: { source: 'scrapingbee' }
    })
    
    console.log('📊 Database Statistics:')
    console.log(`Total products: ${totalProducts}`)
    console.log(`ScrapingBee products: ${scrapedProducts}`)
    console.log('\nProducts by category:')
    categoryStats.forEach(stat => {
      console.log(`  ${stat.category}: ${stat._count} products`)
    })
    
    await prisma.$disconnect()
    return
  }
  
  try {
    const startTime = Date.now()
    let categoriesToScrape: CategoryConfig[] = []
    let productsPerUrl = 20
    
    // Check for --limit parameter
    const limitIndex = args.indexOf('--limit')
    if (limitIndex !== -1 && args[limitIndex + 1]) {
      productsPerUrl = parseInt(args[limitIndex + 1], 10)
      if (isNaN(productsPerUrl) || productsPerUrl < 1) {
        console.error('❌ Invalid limit value. Must be a positive number.')
        return
      }
    }
    
    if (args.includes('--test')) {
      // Test mode: scrape only pasta category
      categoriesToScrape = migrosCategories.filter(c => c.name === 'pasta-rice')
      console.log('🧪 Test mode: Scraping pasta category only')
      console.log(`📦 Products per URL: ${productsPerUrl}`)
    } else if (args.includes('--all')) {
      // Scrape all categories
      categoriesToScrape = migrosCategories
      console.log('🔄 Scraping ALL categories')
      console.log(`📦 Products per URL: ${productsPerUrl}`)
    } else {
      // Default: scrape high priority categories
      categoriesToScrape = migrosCategories.filter(c => c.priority === 1)
      console.log('⭐ Scraping high priority categories')
      console.log(`📦 Products per URL: ${productsPerUrl}`)
    }
    
    const globalStats: ScrapingStats = {
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      failedProducts: 0,
      creditsUsed: 0
    }
    
    // Process each category
    for (const category of categoriesToScrape) {
      const stats = await scrapeCategoryGroup(category, productsPerUrl)
      
      // Aggregate global stats
      globalStats.totalProducts += stats.totalProducts
      globalStats.newProducts += stats.newProducts
      globalStats.updatedProducts += stats.updatedProducts
      globalStats.failedProducts += stats.failedProducts
      globalStats.creditsUsed += stats.creditsUsed
      
      // Summary for this category
      console.log(`\n✅ ${category.displayName} complete:`)
      console.log(`   Products: ${stats.totalProducts}`)
      console.log(`   New: ${stats.newProducts}, Updated: ${stats.updatedProducts}`)
      console.log(`   Credits used: ${stats.creditsUsed}`)
    }
    
    // Final summary
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log('\n' + '='.repeat(50))
    console.log('📊 FINAL SUMMARY')
    console.log('='.repeat(50))
    console.log(`Total products scraped: ${globalStats.totalProducts}`)
    console.log(`New products: ${globalStats.newProducts}`)
    console.log(`Updated products: ${globalStats.updatedProducts}`)
    console.log(`Failed: ${globalStats.failedProducts}`)
    console.log(`API credits used: ${globalStats.creditsUsed}`)
    console.log(`Estimated cost: $${(globalStats.creditsUsed * 0.0003).toFixed(2)}`)
    console.log(`Duration: ${duration} seconds`)
    console.log('\n✨ Scraping complete!')
    
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Add to package.json
if (require.main === module) {
  main().catch(console.error)
}