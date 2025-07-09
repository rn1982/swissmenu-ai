#!/usr/bin/env node

// Parallel scraper using ScrapingBee for faster product database updates

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
  // Fixed Migros category URLs that work with ScrapingBee
  categoryUrls: [
    // Pasta & Rice
    { category: 'pasta', url: 'https://www.migros.ch/fr/category/p%C3%A2tes-riz-c%C3%A9r%C3%A9ales/p%C3%A2tes' },
    { category: 'rice', url: 'https://www.migros.ch/fr/category/p%C3%A2tes-riz-c%C3%A9r%C3%A9ales/riz' },
    { category: 'rice', url: 'https://www.migros.ch/fr/category/plats-cuisin%C3%A9s-conserves/produits-asiatiques' },
    
    // Meat & Poultry
    { category: 'meat', url: 'https://www.migros.ch/fr/category/viande-poisson/viande-de-boeuf' },
    { category: 'meat', url: 'https://www.migros.ch/fr/category/viande-poisson/viande-hach%C3%A9e' },
    { category: 'meat', url: 'https://www.migros.ch/fr/category/viande-poisson/viande-de-porc' },
    { category: 'meat', url: 'https://www.migros.ch/fr/category/viande-poisson/viande-de-veau' },
    { category: 'meat', url: 'https://www.migros.ch/fr/category/viande-poisson/volaille' },
    
    // Vegetables
    { category: 'vegetables', url: 'https://www.migros.ch/fr/category/fruits-l%C3%A9gumes/l%C3%A9gumes' },
    { category: 'vegetables', url: 'https://www.migros.ch/fr/category/produits-surgel%C3%A9s/l%C3%A9gumes-surgel%C3%A9s' },
    
    // Dairy & Eggs
    { category: 'dairy', url: 'https://www.migros.ch/fr/category/produits-laitiers-oeufs/lait-oeufs' },
    { category: 'dairy', url: 'https://www.migros.ch/fr/category/produits-laitiers-oeufs/fromage' },
    { category: 'dairy', url: 'https://www.migros.ch/fr/category/produits-laitiers-oeufs/yogourt' },
    
    // Pantry essentials
    { category: 'pantry', url: 'https://www.migros.ch/fr/category/huile-vinaigre-sauces-condiments/huile-vinaigre' },
    { category: 'pantry', url: 'https://www.migros.ch/fr/category/cuisson-p%C3%A2tisserie/farine-sucre-levure' },
    { category: 'pantry', url: 'https://www.migros.ch/fr/category/huile-vinaigre-sauces-condiments/sel-poivre-%C3%A9pices' },
    { category: 'pantry', url: 'https://www.migros.ch/fr/category/huile-vinaigre-sauces-condiments/%C3%A9pices' },
    { category: 'pantry', url: 'https://www.migros.ch/fr/category/plats-cuisin%C3%A9s-conserves/conserves' },
    { category: 'pantry', url: 'https://www.migros.ch/fr/category/plats-cuisin%C3%A9s-conserves/soupes-sauces' }
  ],
  
  // Parallel configuration
  maxConcurrent: 5, // Number of concurrent requests
  productsPerPage: 20, // Products to extract per page
  delayBetweenBatches: 2000, // Delay between batches
  maxRetries: 2,
  
  // Paths
  logPath: path.join(process.cwd(), 'logs', 'parallel-scraper.log'),
  progressPath: path.join(process.cwd(), 'logs', 'scraping-progress.json')
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

// Load progress
async function loadProgress(): Promise<Map<string, boolean>> {
  try {
    const data = await fs.readFile(CONFIG.progressPath, 'utf-8')
    const progressArray = JSON.parse(data)
    return new Map(progressArray)
  } catch {
    return new Map()
  }
}

// Save progress
async function saveProgress(progress: Map<string, boolean>) {
  try {
    await fs.mkdir(path.dirname(CONFIG.progressPath), { recursive: true })
    await fs.writeFile(CONFIG.progressPath, JSON.stringify(Array.from(progress)))
  } catch (error) {
    await log(`Failed to save progress: ${error}`, 'ERROR')
  }
}

// Extract products from HTML
function extractProducts(html: string, categoryUrl: string): ScrapedProduct[] {
  const $ = cheerio.load(html)
  const products: ScrapedProduct[] = []
  
  // Find product containers - multiple selectors for different page types
  const selectors = [
    'article[data-cy="product-card"]',
    'div[data-testid="product-card"]',
    'a[href*="/product/"]',
    '.product-item',
    '.product-card'
  ]
  
  let productElements: any = $()
  for (const selector of selectors) {
    productElements = $(selector)
    if (productElements.length > 0) break
  }
  
  productElements.each((index: number, element: any) => {
    try {
      const $el = $(element)
      
      // Extract data based on various structures
      const name = $el.find('[data-cy="product-name"]').text().trim() ||
                  $el.find('.product-name').text().trim() ||
                  $el.find('h3').first().text().trim() ||
                  $el.attr('aria-label') || ''
      
      const priceText = $el.find('[data-cy="product-price"]').text() ||
                       $el.find('.price').text() ||
                       $el.find('[class*="price"]').text() || ''
      
      const href = $el.attr('href') || $el.find('a').first().attr('href') || ''
      const productUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
      
      // Extract price
      const priceMatch = priceText.match(/(\d+[\.\,]\d{2})/)
      const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0
      
      // Extract image
      const imageUrl = $el.find('img').first().attr('src') || 
                      $el.find('img').first().attr('data-src') || ''
      
      // Extract brand
      const brand = $el.find('.brand').text().trim() ||
                   $el.find('[class*="brand"]').text().trim() ||
                   name.split(' ')[0] // Use first word as brand fallback
      
      if (name && price > 0) {
        products.push({
          id: `migros-${Date.now()}-${index}`,
          name,
          brand: brand || undefined,
          priceChf: price,
          url: productUrl,
          imageUrl: imageUrl || undefined,
          source: 'proxy-scraper'
        })
      }
    } catch (error) {
      console.error('Error extracting product:', error)
    }
  })
  
  return products
}

// Scrape a single URL
async function scrapeUrl(scraper: ProxyScraper, url: string, retries = 0): Promise<ScrapedProduct[]> {
  try {
    await log(`Scraping: ${url}`)
    const html = await scraper.scrapeUrl(url)
    const products = extractProducts(html, url)
    await log(`Found ${products.length} products from ${url}`, 'SUCCESS')
    return products
  } catch (error) {
    if (retries < CONFIG.maxRetries) {
      await log(`Retry ${retries + 1}/${CONFIG.maxRetries} for ${url}`, 'WARNING')
      await new Promise(resolve => setTimeout(resolve, 5000))
      return scrapeUrl(scraper, url, retries + 1)
    }
    await log(`Failed to scrape ${url}: ${error}`, 'ERROR')
    return []
  }
}

// Process URLs in parallel batches
async function scrapeInParallel(scraper: ProxyScraper, urls: string[]): Promise<ScrapedProduct[]> {
  const allProducts: ScrapedProduct[] = []
  
  // Process in batches
  for (let i = 0; i < urls.length; i += CONFIG.maxConcurrent) {
    const batch = urls.slice(i, i + CONFIG.maxConcurrent)
    await log(`Processing batch ${Math.floor(i / CONFIG.maxConcurrent) + 1}/${Math.ceil(urls.length / CONFIG.maxConcurrent)}`)
    
    // Run batch in parallel
    const promises = batch.map(url => scrapeUrl(scraper, url))
    const results = await Promise.all(promises)
    
    // Collect results
    for (const products of results) {
      allProducts.push(...products)
    }
    
    // Delay between batches
    if (i + CONFIG.maxConcurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches))
    }
  }
  
  return allProducts
}

// Update database
async function updateDatabase(products: ScrapedProduct[]): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0
  
  for (const product of products) {
    try {
      // Check if product exists
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
            priceChf: product.priceChf,
            price: product.priceChf, // Legacy field
            url: product.url,
            imageUrl: product.imageUrl,
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
            priceChf: product.priceChf,
            price: product.priceChf, // Legacy field
            url: product.url,
            imageUrl: product.imageUrl,
            category: product.category,
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
  
  return { created, updated }
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  const testMode = args.includes('--test')
  const limit = args.includes('--limit') ? 
    parseInt(args[args.indexOf('--limit') + 1]) : undefined
  
  if (!process.env.SCRAPINGBEE_API_KEY) {
    await log('SCRAPINGBEE_API_KEY not found in environment', 'ERROR')
    return
  }
  
  const startTime = Date.now()
  await log('=== Starting Parallel ScrapingBee Scraper ===', 'INFO')
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  try {
    // Load progress
    const progress = await loadProgress()
    
    // Filter URLs to process
    const urlsToProcess = CONFIG.categoryUrls
      .filter(item => !progress.get(item.url))
      .slice(0, limit)
    
    if (urlsToProcess.length === 0) {
      await log('All URLs already processed. Run with --reset to start over.', 'INFO')
      return
    }
    
    await log(`Processing ${urlsToProcess.length} URLs in parallel...`, 'INFO')
    
    // Extract URLs
    const urls = urlsToProcess.map(item => item.url)
    
    // Scrape in parallel
    const products = await scrapeInParallel(scraper, urls)
    
    await log(`Total products scraped: ${products.length}`, 'SUCCESS')
    
    // Update database
    if (!testMode && products.length > 0) {
      const dbResult = await updateDatabase(products)
      await log(`Database updated: ${dbResult.created} created, ${dbResult.updated} updated`, 'SUCCESS')
    }
    
    // Update progress
    for (const item of urlsToProcess) {
      progress.set(item.url, true)
    }
    await saveProgress(progress)
    
    // Summary
    const duration = Date.now() - startTime
    console.log('\n📊 Parallel Scraping Summary:')
    console.log(`URLs processed: ${urlsToProcess.length}`)
    console.log(`Products scraped: ${products.length}`)
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`)
    console.log(`Average: ${(products.length / urlsToProcess.length).toFixed(1)} products/URL`)
    console.log(`Credits used (est): ${urlsToProcess.length * 10}`)
    
  } catch (error) {
    await log(`Fatal error: ${error}`, 'ERROR')
  } finally {
    await prisma.$disconnect()
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help')) {
    console.log(`
Parallel ScrapingBee Scraper

Usage:
  npm run scrape:parallel              Run parallel scraping
  npm run scrape:parallel --test       Test mode (no DB updates)
  npm run scrape:parallel --limit 5    Limit URLs to process
  npm run scrape:parallel --reset      Reset progress

Features:
  - Concurrent scraping (5 parallel requests)
  - Progress tracking and resume capability
  - Automatic retries on failures
  - Database deduplication
    `)
    process.exit(0)
  }
  
  if (args.includes('--reset')) {
    fs.unlink(CONFIG.progressPath).then(() => {
      console.log('✅ Progress reset')
      process.exit(0)
    }).catch(() => {
      console.log('✅ No progress to reset')
      process.exit(0)
    })
  } else {
    main().catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
  }
}

export { scrapeInParallel }