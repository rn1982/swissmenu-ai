#!/usr/bin/env node

// Enhanced scheduled scraper using ScrapingBee for real Migros data

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'
import * as fs from 'fs/promises'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  categories: [
    { name: 'pasta', queries: ['pâtes', 'pasta', 'spaghetti'] },
    { name: 'meat', queries: ['viande', 'poulet', 'boeuf'] },
    { name: 'vegetables', queries: ['légumes', 'tomates', 'salade'] },
    { name: 'dairy', queries: ['lait', 'fromage', 'yogourt'] },
    { name: 'bakery', queries: ['pain', 'croissant', 'baguette'] },
    { name: 'beverages', queries: ['boissons', 'eau', 'jus'] },
    { name: 'frozen', queries: ['surgelés', 'glace', 'pizza surgelée'] },
    { name: 'pantry', queries: ['conserves', 'riz', 'huile'] },
    { name: 'snacks', queries: ['snacks', 'chips', 'chocolat'] }
  ],
  
  logPath: path.join(process.cwd(), 'logs', 'scrapingbee.log'),
  statsPath: path.join(process.cwd(), 'logs', 'scrapingbee-stats.json'),
  
  productsPerQuery: 10,
  delayBetweenRequests: 3000,
  maxRetries: 2
}

// Logging
async function log(message: string, level: 'INFO' | 'ERROR' | 'SUCCESS' | 'WARNING' = 'INFO') {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] ${message}\n`
  
  console.log(logMessage.trim())
  
  try {
    await fs.mkdir(path.dirname(CONFIG.logPath), { recursive: true })
    await fs.appendFile(CONFIG.logPath, logMessage)
  } catch (error) {
    console.error('Failed to write to log file:', error)
  }
}

// Load stats
async function loadStats(): Promise<any> {
  try {
    const data = await fs.readFile(CONFIG.statsPath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      productsScraped: 0,
      creditsUsed: 0,
      categoriesScraped: {},
      lastRun: null
    }
  }
}

// Save stats
async function saveStats(stats: any) {
  try {
    await fs.mkdir(path.dirname(CONFIG.statsPath), { recursive: true })
    await fs.writeFile(CONFIG.statsPath, JSON.stringify(stats, null, 2))
  } catch (error) {
    await log(`Failed to save statistics: ${error}`, 'ERROR')
  }
}

// Get next category to scrape
function getNextCategory(stats: any) {
  const categoryCounts = CONFIG.categories.map(cat => ({
    category: cat.name,
    count: stats.categoriesScraped[cat.name] || 0
  }))
  
  categoryCounts.sort((a, b) => a.count - b.count)
  return CONFIG.categories.find(c => c.name === categoryCounts[0].category)!
}

// Scrape products from search
async function scrapeProductsFromSearch(scraper: ProxyScraper, query: string, limit: number) {
  const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(query)}`
  await log(`Searching: ${query}`)
  
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
    
    await log(`Found ${productUrls.length} products for "${query}"`)
    
    // Scrape individual products
    const products = []
    for (const url of productUrls.slice(0, limit)) {
      try {
        const product = await scraper.scrapeProduct(url)
        if (product) {
          products.push(product)
          await log(`  ✓ ${product.name} - CHF ${product.priceChf}`)
        }
      } catch (error) {
        await log(`  ✗ Failed to scrape ${url}`, 'WARNING')
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests))
    }
    
    return products
  } catch (error) {
    await log(`Search failed for "${query}": ${error}`, 'ERROR')
    return []
  }
}

// Update database
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
      await log(`Database error for ${product.name}: ${error}`, 'ERROR')
    }
  }
  
  await log(`Database updated: ${created} created, ${updated} updated`, 'SUCCESS')
  return { created, updated }
}

// Main scraping function
async function runScheduledScraping() {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    await log('SCRAPINGBEE_API_KEY not found in environment', 'ERROR')
    return
  }

  const startTime = Date.now()
  await log('=== Starting ScrapingBee scheduled scraping ===', 'INFO')
  
  const stats = await loadStats()
  stats.totalRuns++
  stats.lastRun = new Date().toISOString()
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  try {
    // Get next category
    const categoryConfig = getNextCategory(stats)
    await log(`Selected category: ${categoryConfig.name}`, 'INFO')
    
    // Scrape products
    const allProducts = []
    for (const query of categoryConfig.queries) {
      const products = await scrapeProductsFromSearch(
        scraper, 
        query, 
        CONFIG.productsPerQuery
      )
      allProducts.push(...products)
    }
    
    // Update database
    const dbResult = await updateDatabase(allProducts, categoryConfig.name)
    
    // Update stats
    stats.successfulRuns++
    stats.productsScraped += allProducts.length
    stats.creditsUsed += allProducts.length * 10 // Approximate
    stats.categoriesScraped[categoryConfig.name] = 
      (stats.categoriesScraped[categoryConfig.name] || 0) + 1
    
    await saveStats(stats)
    
    const duration = Date.now() - startTime
    await log(`Scraping completed in ${duration}ms`, 'SUCCESS')
    
    // Print summary
    console.log('\n📊 Scraping Summary:')
    console.log(`Category: ${categoryConfig.name}`)
    console.log(`Products scraped: ${allProducts.length}`)
    console.log(`Database: ${dbResult.created} created, ${dbResult.updated} updated`)
    console.log(`Duration: ${duration}ms`)
    console.log(`Credits used (est): ${allProducts.length * 10}`)
    
  } catch (error) {
    await log(`Scraping failed: ${error}`, 'ERROR')
    stats.failedRuns = (stats.failedRuns || 0) + 1
    await saveStats(stats)
  } finally {
    await prisma.$disconnect()
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help')) {
    console.log(`
ScrapingBee Scheduled Scraper

Usage:
  npm run scrape:scrapingbee          Run one scraping cycle
  npm run scrape:scrapingbee stats    Show statistics
  npm run scrape:scrapingbee reset    Reset statistics

Cron Setup:
  0 3 * * * cd /path/to/swissmenu-ai && npm run scrape:scrapingbee
  0 4 * * * cd /path/to/swissmenu-ai && npm run scrape:scrapingbee
  0 5 * * * cd /path/to/swissmenu-ai && npm run scrape:scrapingbee
    `)
    process.exit(0)
  }
  
  if (args[0] === 'stats') {
    const stats = await loadStats()
    console.log('\n📊 ScrapingBee Statistics:')
    console.log(JSON.stringify(stats, null, 2))
    console.log(`\nEstimated monthly cost: $${(stats.creditsUsed * 0.0003).toFixed(2)}`)
    process.exit(0)
  }
  
  if (args[0] === 'reset') {
    await saveStats({
      totalRuns: 0,
      successfulRuns: 0,
      productsScraped: 0,
      creditsUsed: 0,
      categoriesScraped: {},
      lastRun: null
    })
    console.log('✅ Statistics reset')
    process.exit(0)
  }
  
  await runScheduledScraping()
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { runScheduledScraping }