#!/usr/bin/env node

import { scrapeProductsWithPlaywright, closePlaywrightScraper } from '../lib/migros-playwright'
import { db } from '../lib/db'
import * as fs from 'fs/promises'
import * as path from 'path'

// Configuration
const CONFIG = {
  // Categories to scrape (rotate through one at a time)
  categories: ['pasta', 'meat', 'vegetables', 'dairy', 'bakery', 'beverages', 'frozen', 'pantry', 'snacks'],
  
  // Log file path
  logPath: path.join(process.cwd(), 'logs', 'scraping.log'),
  
  // Success tracking file
  statsPath: path.join(process.cwd(), 'logs', 'scraping-stats.json'),
  
  // Maximum retries per category
  maxRetries: 3,
  
  // Delay between retries (ms)
  retryDelay: 5000,
  
  // Delay between categories (ms)
  categoryDelay: 10000
}

// Logging functions
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

// Load or initialize statistics
async function loadStats(): Promise<any> {
  try {
    const data = await fs.readFile(CONFIG.statsPath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      categoriesScraped: {},
      lastRun: null,
      productCounts: {}
    }
  }
}

// Save statistics
async function saveStats(stats: any) {
  try {
    await fs.mkdir(path.dirname(CONFIG.statsPath), { recursive: true })
    await fs.writeFile(CONFIG.statsPath, JSON.stringify(stats, null, 2))
  } catch (error) {
    await log(`Failed to save statistics: ${error}`, 'ERROR')
  }
}

// Get the next category to scrape (round-robin)
function getNextCategory(stats: any): string {
  const categoryCounts = CONFIG.categories.map(cat => ({
    category: cat,
    count: stats.categoriesScraped[cat] || 0
  }))
  
  // Sort by least scraped
  categoryCounts.sort((a, b) => a.count - b.count)
  
  return categoryCounts[0].category
}

// Scrape a single category with retries
async function scrapeCategory(category: string, retries = 0): Promise<{ success: boolean; products: any[]; source: string }> {
  try {
    await log(`Scraping category: ${category} (attempt ${retries + 1}/${CONFIG.maxRetries})`)
    
    const products = await scrapeProductsWithPlaywright(category)
    
    if (products.length === 0) {
      throw new Error('No products returned')
    }
    
    // Analyze sources
    const sources = {
      api: products.filter(p => p.source === 'api').length,
      scraped: products.filter(p => p.source === 'scraped').length,
      fallback: products.filter(p => p.source === 'fallback').length
    }
    
    const primarySource = sources.api > 0 ? 'api' : 
                         sources.scraped > 0 ? 'scraped' : 'fallback'
    
    await log(`Category ${category}: ${products.length} products (${sources.api} API, ${sources.scraped} scraped, ${sources.fallback} fallback)`, 'SUCCESS')
    
    return { success: true, products, source: primarySource }
    
  } catch (error) {
    await log(`Failed to scrape ${category}: ${error.message}`, 'ERROR')
    
    if (retries < CONFIG.maxRetries - 1) {
      await log(`Retrying in ${CONFIG.retryDelay}ms...`, 'WARNING')
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay))
      return scrapeCategory(category, retries + 1)
    }
    
    return { success: false, products: [], source: 'error' }
  }
}

// Update database with scraped products
async function updateDatabase(category: string, products: any[]) {
  try {
    // Only update products that were actually scraped (not fallback)
    const scrapedProducts = products.filter(p => p.source !== 'fallback')
    
    if (scrapedProducts.length === 0) {
      await log(`No new scraped products for ${category}, skipping database update`, 'WARNING')
      return
    }
    
    // Delete existing products in this category that were scraped
    await db.migrosProduct.deleteMany({
      where: {
        category,
        id: {
          notIn: products.filter(p => p.source === 'fallback').map(p => p.id)
        }
      }
    })
    
    // Insert new scraped products
    const dbProducts = scrapedProducts.map(product => ({
      id: product.id,
      name: product.name,
      brand: product.brand || null,
      priceChf: product.priceChf || null,
      unit: category === 'pasta' ? '500g' : 
            category === 'meat' ? '500g' :
            category === 'vegetables' ? '1kg' :
            category === 'dairy' ? '1L' : '',
      category: product.category || category,
      url: product.url || null,
      imageUrl: product.imageUrl || null,
      ariaLabel: product.ariaLabel || null,
      lastUpdated: new Date()
    }))
    
    await db.migrosProduct.createMany({
      data: dbProducts,
      skipDuplicates: true
    })
    
    await log(`Updated database with ${scrapedProducts.length} products for ${category}`, 'SUCCESS')
    
  } catch (error) {
    await log(`Database update failed for ${category}: ${error}`, 'ERROR')
  }
}

// Main scheduled scraping function
async function runScheduledScraping() {
  const startTime = Date.now()
  await log('=== Starting scheduled scraping run ===', 'INFO')
  
  const stats = await loadStats()
  stats.totalRuns++
  stats.lastRun = new Date().toISOString()
  
  // Determine which category to scrape
  const category = getNextCategory(stats)
  await log(`Selected category for this run: ${category}`, 'INFO')
  
  try {
    // Scrape the category
    const result = await scrapeCategory(category)
    
    // Update statistics
    stats.categoriesScraped[category] = (stats.categoriesScraped[category] || 0) + 1
    stats.productCounts[category] = result.products.length
    
    if (result.success) {
      stats.successfulRuns++
      
      // Update database if we got real data
      if (result.source !== 'fallback') {
        await updateDatabase(category, result.products)
      }
    } else {
      stats.failedRuns++
    }
    
    // Save statistics
    await saveStats(stats)
    
    const duration = Date.now() - startTime
    await log(`Scraping run completed in ${duration}ms`, 'INFO')
    
    // Print summary
    console.log('\n📊 Scraping Summary:')
    console.log(`Category: ${category}`)
    console.log(`Products: ${result.products.length}`)
    console.log(`Source: ${result.source}`)
    console.log(`Duration: ${duration}ms`)
    console.log(`Success Rate: ${Math.round(stats.successfulRuns / stats.totalRuns * 100)}%`)
    
  } catch (error) {
    await log(`Unexpected error during scraping: ${error}`, 'ERROR')
    stats.failedRuns++
    await saveStats(stats)
  } finally {
    await closePlaywrightScraper()
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Swiss Menu AI - Scheduled Scraper

Usage:
  npm run scrape:scheduled          Run one scraping cycle
  npm run scrape:scheduled stats    Show scraping statistics
  npm run scrape:scheduled reset    Reset statistics

Options:
  --category <name>   Scrape specific category
  --all              Scrape all categories
  --help             Show this help

Cron Setup (for 3-5 AM daily):
  0 3 * * * cd /path/to/swissmenu-ai && npm run scrape:scheduled
  0 4 * * * cd /path/to/swissmenu-ai && npm run scrape:scheduled
  0 5 * * * cd /path/to/swissmenu-ai && npm run scrape:scheduled
    `)
    process.exit(0)
  }
  
  if (args[0] === 'stats') {
    const stats = await loadStats()
    console.log('\n📊 Scraping Statistics:')
    console.log(JSON.stringify(stats, null, 2))
    process.exit(0)
  }
  
  if (args[0] === 'reset') {
    await saveStats({
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      categoriesScraped: {},
      lastRun: null,
      productCounts: {}
    })
    console.log('✅ Statistics reset')
    process.exit(0)
  }
  
  // Run the scraper
  await runScheduledScraping()
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { runScheduledScraping }