#!/usr/bin/env tsx

/**
 * Comprehensive Priority Scraper for SwissMenu AI
 * 
 * This script is designed to scrape ~570 products from Migros, focusing on:
 * - Priority 1 categories: Pasta & Rice, Meat & Poultry, Vegetables, Dairy & Eggs, Pantry
 * - Essential missing ingredients identified in the scraping strategy
 * - Proper rate limiting and error handling
 * - Progress tracking with resume capability
 * - API credit estimation and tracking
 * 
 * Features:
 * - ScrapingBee API integration with credit management
 * - Resume from failures with checkpoint system
 * - Detailed logging and progress reporting
 * - Database deduplication
 * - URL validation
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as cheerio from 'cheerio'
import * as fs from 'fs/promises'
import * as path from 'path'
import axios from 'axios'
import pLimit from 'p-limit'

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  // API Settings
  scrapingBee: {
    creditsPerProductPage: 1,
    creditsPerCategoryPage: 10,
    maxCreditsToUse: 600, // Conservative limit
    render_js: true,
    premium_proxy: true,
    country_code: 'ch',
    wait: 3000,
    block_ads: true,
    stealth_proxy: true
  },
  
  // Rate Limiting
  delayBetweenRequests: 3000, // 3 seconds
  maxConcurrent: 1, // Sequential to avoid rate limits
  requestTimeout: 60000, // 60 seconds
  
  // Scraping Limits
  maxProductsPerSearch: 10,
  maxProductsPerCategory: 30,
  targetTotalProducts: 570,
  
  // Checkpoint & Logging
  checkpointInterval: 10, // Save progress every 10 products
  logDir: path.join(process.cwd(), 'logs'),
  checkpointFile: 'priority-scraper-checkpoint.json',
  progressFile: 'priority-scraper-progress.json'
}

// Priority categories and essential products
const PRIORITY_TARGETS = {
  // Essential missing ingredients by category
  essentialProducts: {
    dairy: [
      { query: 'crème fraîche', expectedNames: ['Crème fraîche', 'Crème fraîche légère'] },
      { query: 'mascarpone', expectedNames: ['Mascarpone Galbani', 'M-Classic Mascarpone'] },
      { query: 'ricotta', expectedNames: ['Ricotta Galbani', 'M-Classic Ricotta'] },
      { query: 'parmesan râpé', expectedNames: ['Parmesan râpé', 'Parmigiano Reggiano râpé'] },
      { query: 'raclette fromage', expectedNames: ['Fromage à raclette', 'Raclette du Valais'] },
      { query: 'fondue mélange', expectedNames: ['Mélange à fondue', 'Fondue moitié-moitié'] },
      { query: 'crème à café', expectedNames: ['Crème à café', 'Crème entière UHT'] }
    ],
    pantry: [
      { query: 'levure sèche', expectedNames: ['Levure sèche', 'Levure de boulanger'] },
      { query: 'levure chimique', expectedNames: ['Levure chimique', 'Poudre à lever'] },
      { query: 'bicarbonate de soude', expectedNames: ['Bicarbonate de soude', 'Bicarbonate alimentaire'] },
      { query: 'pesto genovese', expectedNames: ['Pesto alla Genovese', 'Barilla Pesto'] },
      { query: 'pesto rosso', expectedNames: ['Pesto rosso', 'Pesto rouge'] }
    ],
    meat: [
      { query: 'lardons fumés', expectedNames: ['Lardons fumés', 'Lardons nature'] },
      { query: 'jambon cuit', expectedNames: ['Jambon cuit', 'Jambon de dinde'] },
      { query: 'salami milano', expectedNames: ['Salami Milano', 'Salami nostrano'] },
      { query: 'cervelas', expectedNames: ['Cervelas', 'Cervelas géant'] },
      { query: 'viande séchée grisons', expectedNames: ['Viande séchée des Grisons', 'Bündnerfleisch'] }
    ],
    swiss: [
      { query: 'rösti hero', expectedNames: ['Hero Rösti', 'Rösti prêt à l\'emploi'] },
      { query: 'spätzli frais', expectedNames: ['Spätzli frais', 'Spätzli aux œufs'] },
      { query: 'knöpfli', expectedNames: ['Knöpfli frais', 'Knöpfli aux œufs'] },
      { query: 'bircher muesli', expectedNames: ['Bircher muesli', 'Familia Bircher'] },
      { query: 'aromat knorr', expectedNames: ['Aromat Knorr', 'Aromat'] }
    ]
  },
  
  // Category pages for bulk scraping
  categoryPages: {
    pasta_rice: [
      'https://www.migros.ch/fr/category/epicerie/pates-riz-legumineuses/pates',
      'https://www.migros.ch/fr/category/epicerie/pates-riz-legumineuses/riz',
      'https://www.migros.ch/fr/category/epicerie/pates-riz-legumineuses/cereales'
    ],
    meat_poultry: [
      'https://www.migros.ch/fr/category/viande-poisson/viande/boeuf',
      'https://www.migros.ch/fr/category/viande-poisson/viande/porc',
      'https://www.migros.ch/fr/category/viande-poisson/viande/volaille',
      'https://www.migros.ch/fr/category/viande-poisson/viande/veau-agneau'
    ],
    vegetables: [
      'https://www.migros.ch/fr/category/fruits-legumes/legumes',
      'https://www.migros.ch/fr/category/fruits-legumes/salades',
      'https://www.migros.ch/fr/category/fruits-legumes/herbes-aromatiques'
    ],
    dairy_eggs: [
      'https://www.migros.ch/fr/category/lait-produits-laitiers-oeufs/fromage',
      'https://www.migros.ch/fr/category/lait-produits-laitiers-oeufs/lait-creme',
      'https://www.migros.ch/fr/category/lait-produits-laitiers-oeufs/oeufs',
      'https://www.migros.ch/fr/category/lait-produits-laitiers-oeufs/yogourt'
    ],
    pantry: [
      'https://www.migros.ch/fr/category/epicerie/huiles-vinaigres',
      'https://www.migros.ch/fr/category/epicerie/epices-condiments',
      'https://www.migros.ch/fr/category/epicerie/farines-sucre',
      'https://www.migros.ch/fr/category/epicerie/conserves'
    ]
  }
}

// Progress tracking
interface ScrapingProgress {
  startTime: Date
  lastCheckpoint: Date
  creditsUsed: number
  productsScraped: number
  productsSaved: number
  errors: string[]
  completedSearches: string[]
  completedCategories: string[]
  failedUrls: string[]
}

interface Checkpoint {
  progress: ScrapingProgress
  remainingSearches: Array<{category: string, query: string}>
  remainingCategories: Array<{name: string, url: string}>
}

class ComprehensivePriorityScraper {
  private scraper: ProxyScraper
  private progress: ScrapingProgress
  private checkpoint?: Checkpoint
  private limit = pLimit(CONFIG.maxConcurrent)
  
  constructor() {
    if (!process.env.SCRAPINGBEE_API_KEY) {
      throw new Error('SCRAPINGBEE_API_KEY environment variable is required')
    }
    
    this.scraper = new ProxyScraper({
      service: 'scrapingbee',
      apiKey: process.env.SCRAPINGBEE_API_KEY
    })
    
    this.progress = {
      startTime: new Date(),
      lastCheckpoint: new Date(),
      creditsUsed: 0,
      productsScraped: 0,
      productsSaved: 0,
      errors: [],
      completedSearches: [],
      completedCategories: [],
      failedUrls: []
    }
  }
  
  async run(options: { resume?: boolean; testMode?: boolean } = {}) {
    await this.log('🚀 Starting Comprehensive Priority Scraper', 'INFO')
    await this.log(`Mode: ${options.testMode ? 'TEST' : 'PRODUCTION'}`, 'INFO')
    
    try {
      // Load checkpoint if resuming
      if (options.resume) {
        await this.loadCheckpoint()
      }
      
      // Estimate credits needed
      const estimatedCredits = await this.estimateCredits()
      await this.log(`📊 Estimated credits needed: ${estimatedCredits}`, 'INFO')
      
      if (estimatedCredits > CONFIG.scrapingBee.maxCreditsToUse) {
        await this.log(`⚠️  Estimated credits (${estimatedCredits}) exceed limit (${CONFIG.scrapingBee.maxCreditsToUse})`, 'WARNING')
      }
      
      // Phase 1: Essential products search
      await this.scrapeEssentialProducts(options.testMode)
      
      // Check if we've reached the target
      if (this.progress.productsScraped >= CONFIG.targetTotalProducts) {
        await this.log(`✅ Target reached: ${this.progress.productsScraped} products scraped`, 'SUCCESS')
        return
      }
      
      // Phase 2: Category page scraping
      await this.scrapeCategoryPages(options.testMode)
      
      // Final report
      await this.generateFinalReport()
      
    } catch (error) {
      await this.log(`Fatal error: ${error}`, 'ERROR')
      this.progress.errors.push(`Fatal: ${error}`)
    } finally {
      await this.saveProgress()
      await prisma.$disconnect()
    }
  }
  
  private async scrapeEssentialProducts(testMode = false) {
    await this.log('\n📦 Phase 1: Scraping Essential Missing Products', 'INFO')
    await this.log('=' .repeat(50), 'INFO')
    
    // Build search queue
    const searchQueue: Array<{category: string, query: string}> = []
    
    for (const [category, searches] of Object.entries(PRIORITY_TARGETS.essentialProducts)) {
      for (const search of searches) {
        // Skip if already completed (for resume)
        if (this.progress.completedSearches.includes(`${category}:${search.query}`)) {
          continue
        }
        searchQueue.push({ category, query: search.query })
      }
    }
    
    if (testMode) {
      searchQueue.splice(5) // Limit to 5 searches in test mode
    }
    
    await this.log(`Queued ${searchQueue.length} searches`, 'INFO')
    
    // Process searches
    for (const search of searchQueue) {
      if (this.progress.creditsUsed >= CONFIG.scrapingBee.maxCreditsToUse) {
        await this.log('Credit limit reached, stopping...', 'WARNING')
        break
      }
      
      try {
        await this.searchAndScrapeProducts(search.category, search.query)
        this.progress.completedSearches.push(`${search.category}:${search.query}`)
        
        // Checkpoint
        if (this.progress.productsScraped % CONFIG.checkpointInterval === 0) {
          await this.saveCheckpoint(searchQueue, [])
        }
        
        // Rate limiting
        await this.delay(CONFIG.delayBetweenRequests)
        
      } catch (error) {
        await this.log(`Failed search ${search.query}: ${error}`, 'ERROR')
        this.progress.errors.push(`Search failed: ${search.query}`)
      }
    }
  }
  
  private async searchAndScrapeProducts(category: string, query: string) {
    await this.log(`\n🔍 Searching: "${query}" in ${category}`, 'INFO')
    
    const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(query)}`
    
    try {
      // Scrape search results page
      const html = await this.scraper.scrapeUrl(searchUrl)
      this.progress.creditsUsed += CONFIG.scrapingBee.creditsPerCategoryPage
      
      const $ = cheerio.load(html)
      const productUrls = this.extractProductUrls($, CONFIG.maxProductsPerSearch)
      
      await this.log(`Found ${productUrls.length} products`, 'INFO')
      
      // Scrape individual products
      for (const url of productUrls) {
        if (this.progress.creditsUsed >= CONFIG.scrapingBee.maxCreditsToUse) {
          break
        }
        
        try {
          const product = await this.scrapeAndSaveProduct(url, category)
          if (product) {
            await this.log(`  ✅ ${product.name} - CHF ${product.priceChf}`, 'SUCCESS')
          }
        } catch (error) {
          await this.log(`  ❌ Failed: ${url}`, 'ERROR')
          this.progress.failedUrls.push(url)
        }
        
        await this.delay(CONFIG.delayBetweenRequests)
      }
      
    } catch (error) {
      throw new Error(`Search scraping failed: ${error}`)
    }
  }
  
  private async scrapeCategoryPages(testMode = false) {
    await this.log('\n📂 Phase 2: Scraping Category Pages', 'INFO')
    await this.log('=' .repeat(50), 'INFO')
    
    // Build category queue
    const categoryQueue: Array<{name: string, url: string}> = []
    
    for (const [categoryName, urls] of Object.entries(PRIORITY_TARGETS.categoryPages)) {
      for (const url of urls) {
        if (this.progress.completedCategories.includes(url)) {
          continue
        }
        categoryQueue.push({ name: categoryName, url })
      }
    }
    
    if (testMode) {
      categoryQueue.splice(3) // Limit to 3 categories in test mode
    }
    
    await this.log(`Queued ${categoryQueue.length} category pages`, 'INFO')
    
    // Process categories
    for (const category of categoryQueue) {
      if (this.progress.creditsUsed >= CONFIG.scrapingBee.maxCreditsToUse) {
        await this.log('Credit limit reached, stopping...', 'WARNING')
        break
      }
      
      if (this.progress.productsScraped >= CONFIG.targetTotalProducts) {
        await this.log('Target product count reached', 'SUCCESS')
        break
      }
      
      try {
        await this.scrapeCategoryPage(category.name, category.url)
        this.progress.completedCategories.push(category.url)
        
        // Checkpoint
        await this.saveCheckpoint([], categoryQueue)
        
      } catch (error) {
        await this.log(`Failed category ${category.url}: ${error}`, 'ERROR')
        this.progress.errors.push(`Category failed: ${category.url}`)
      }
    }
  }
  
  private async scrapeCategoryPage(categoryName: string, categoryUrl: string) {
    await this.log(`\n🌐 Scraping category: ${categoryName}`, 'INFO')
    await this.log(`URL: ${categoryUrl}`, 'INFO')
    
    try {
      const html = await this.scraper.scrapeUrl(categoryUrl)
      this.progress.creditsUsed += CONFIG.scrapingBee.creditsPerCategoryPage
      
      const $ = cheerio.load(html)
      const products = this.extractProductsFromCategory($, CONFIG.maxProductsPerCategory)
      
      await this.log(`Found ${products.length} products on page`, 'INFO')
      
      // Save products directly from category page
      for (const product of products) {
        try {
          await this.saveProduct({
            ...product,
            category: categoryName,
            source: 'scrapingbee'
          })
          await this.log(`  ✅ ${product.name} - CHF ${product.priceChf}`, 'SUCCESS')
          this.progress.productsScraped++
          this.progress.productsSaved++
        } catch (error) {
          await this.log(`  ⚠️  Failed to save: ${product.name}`, 'WARNING')
        }
      }
      
    } catch (error) {
      throw new Error(`Category scraping failed: ${error}`)
    }
  }
  
  private async scrapeAndSaveProduct(url: string, category: string) {
    const product = await this.scraper.scrapeProduct(url)
    this.progress.creditsUsed += CONFIG.scrapingBee.creditsPerProductPage
    this.progress.productsScraped++
    
    if (product) {
      await this.saveProduct({
        ...product,
        category,
        source: 'scrapingbee'
      })
      this.progress.productsSaved++
      return product
    }
    
    return null
  }
  
  private extractProductUrls($: cheerio.Root, limit: number): string[] {
    const urls: string[] = []
    const selectors = [
      'a[href*="/product/"]',
      '.product-tile a',
      '.product-card a',
      '[data-testid="product-link"]',
      'article a[href*="/fr/product/"]'
    ]
    
    for (const selector of selectors) {
      $(selector).each((_, elem) => {
        if (urls.length >= limit) return false
        
        const href = $(elem).attr('href')
        if (href && !href.includes('/category/')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
          if (!urls.includes(fullUrl) && fullUrl.includes('/product/')) {
            urls.push(fullUrl)
          }
        }
      })
    }
    
    return urls
  }
  
  private extractProductsFromCategory($: cheerio.Root, limit: number): any[] {
    const products: any[] = []
    const selectors = [
      '[data-testid*="product"]',
      '.product-tile',
      '.product-card',
      'article[data-cy="product-card"]'
    ]
    
    for (const selector of selectors) {
      if (products.length >= limit) break
      
      $(selector).each((index, elem) => {
        if (products.length >= limit) return false
        
        try {
          const $elem = $(elem)
          
          // Extract product info
          const name = $elem.find('[data-cy="product-card-title"], .product-name, h3').first().text().trim()
          const priceText = $elem.find('[data-cy="product-price"], .price').first().text()
          const priceMatch = priceText.match(/(\d+[.,]\d{2})/)
          const priceChf = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0
          
          const link = $elem.find('a').attr('href')
          const url = link ? (link.startsWith('http') ? link : `https://www.migros.ch${link}`) : null
          
          const imageUrl = $elem.find('img').attr('src') || $elem.find('img').attr('data-src')
          
          // Extract ID
          const idMatch = url?.match(/\/product\/(?:mo\/)?(\d+)/)
          const id = idMatch ? idMatch[1] : `scraped-${Date.now()}-${index}`
          
          if (name && priceChf > 0) {
            products.push({
              id,
              migrosId: id,
              name,
              brand: name.split(' ')[0],
              priceChf,
              url,
              imageUrl
            })
          }
        } catch (error) {
          // Skip malformed products
        }
      })
    }
    
    return products
  }
  
  private async saveProduct(product: any) {
    try {
      // Check if product exists
      const existing = await prisma.migrosProduct.findFirst({
        where: {
          OR: [
            { migrosId: product.migrosId },
            { url: product.url },
            { name: product.name }
          ]
        }
      })
      
      const productData = {
        migrosId: product.migrosId || product.id,
        name: product.name,
        brand: product.brand,
        priceChf: product.priceChf,
        price: product.priceChf,
        url: product.url || '',
        imageUrl: product.imageUrl || '',
        category: product.category,
        source: product.source || 'scrapingbee',
        lastScraped: new Date(),
        lastUpdated: new Date()
      }
      
      if (existing) {
        await prisma.migrosProduct.update({
          where: { id: existing.id },
          data: productData
        })
      } else {
        await prisma.migrosProduct.create({
          data: {
            id: product.id || product.migrosId || `scraped-${Date.now()}`,
            ...productData
          }
        })
      }
    } catch (error) {
      throw new Error(`Database error: ${error}`)
    }
  }
  
  private async estimateCredits(): Promise<number> {
    let credits = 0
    
    // Essential products searches
    const totalSearches = Object.values(PRIORITY_TARGETS.essentialProducts)
      .reduce((sum, searches) => sum + searches.length, 0)
    credits += totalSearches * CONFIG.scrapingBee.creditsPerCategoryPage
    credits += totalSearches * CONFIG.maxProductsPerSearch * CONFIG.scrapingBee.creditsPerProductPage
    
    // Category pages
    const totalCategories = Object.values(PRIORITY_TARGETS.categoryPages)
      .reduce((sum, urls) => sum + urls.length, 0)
    credits += totalCategories * CONFIG.scrapingBee.creditsPerCategoryPage
    
    return credits
  }
  
  private async loadCheckpoint() {
    try {
      const checkpointPath = path.join(CONFIG.logDir, CONFIG.checkpointFile)
      const data = await fs.readFile(checkpointPath, 'utf-8')
      this.checkpoint = JSON.parse(data)
      this.progress = {
        ...this.checkpoint.progress,
        startTime: new Date(this.checkpoint.progress.startTime),
        lastCheckpoint: new Date(this.checkpoint.progress.lastCheckpoint)
      }
      await this.log('✅ Checkpoint loaded successfully', 'SUCCESS')
    } catch (error) {
      await this.log('No checkpoint found, starting fresh', 'INFO')
    }
  }
  
  private async saveCheckpoint(remainingSearches: any[], remainingCategories: any[]) {
    const checkpoint: Checkpoint = {
      progress: this.progress,
      remainingSearches,
      remainingCategories
    }
    
    try {
      await fs.mkdir(CONFIG.logDir, { recursive: true })
      const checkpointPath = path.join(CONFIG.logDir, CONFIG.checkpointFile)
      await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2))
      this.progress.lastCheckpoint = new Date()
    } catch (error) {
      await this.log(`Failed to save checkpoint: ${error}`, 'ERROR')
    }
  }
  
  private async saveProgress() {
    try {
      await fs.mkdir(CONFIG.logDir, { recursive: true })
      const progressPath = path.join(CONFIG.logDir, CONFIG.progressFile)
      await fs.writeFile(progressPath, JSON.stringify(this.progress, null, 2))
    } catch (error) {
      await this.log(`Failed to save progress: ${error}`, 'ERROR')
    }
  }
  
  private async generateFinalReport() {
    const duration = (Date.now() - this.progress.startTime.getTime()) / 1000 / 60
    
    await this.log('\n' + '='.repeat(60), 'INFO')
    await this.log('📊 SCRAPING COMPLETE - FINAL REPORT', 'SUCCESS')
    await this.log('='.repeat(60), 'INFO')
    
    await this.log(`\n📈 Performance Metrics:`, 'INFO')
    await this.log(`Duration: ${duration.toFixed(1)} minutes`, 'INFO')
    await this.log(`Credits used: ${this.progress.creditsUsed}`, 'INFO')
    await this.log(`Products scraped: ${this.progress.productsScraped}`, 'INFO')
    await this.log(`Products saved: ${this.progress.productsSaved}`, 'INFO')
    await this.log(`Success rate: ${((this.progress.productsSaved / this.progress.productsScraped) * 100).toFixed(1)}%`, 'INFO')
    
    await this.log(`\n📋 Coverage:`, 'INFO')
    await this.log(`Searches completed: ${this.progress.completedSearches.length}`, 'INFO')
    await this.log(`Categories scraped: ${this.progress.completedCategories.length}`, 'INFO')
    await this.log(`Failed URLs: ${this.progress.failedUrls.length}`, 'WARNING')
    
    if (this.progress.errors.length > 0) {
      await this.log(`\n⚠️  Errors encountered: ${this.progress.errors.length}`, 'WARNING')
      this.progress.errors.slice(0, 5).forEach(async (err) => {
        await this.log(`  - ${err}`, 'WARNING')
      })
    }
    
    // Database summary
    const totalProducts = await prisma.migrosProduct.count()
    const byCategory = await prisma.migrosProduct.groupBy({
      by: ['category'],
      _count: true,
      orderBy: { _count: { category: 'desc' } }
    })
    
    await this.log(`\n💾 Database Status:`, 'INFO')
    await this.log(`Total products: ${totalProducts}`, 'INFO')
    await this.log(`\nProducts by category:`, 'INFO')
    byCategory.forEach(async (cat) => {
      await this.log(`  ${cat.category || 'uncategorized'}: ${cat._count}`, 'INFO')
    })
    
    // Save final report
    const reportPath = path.join(CONFIG.logDir, `scraping-report-${new Date().toISOString().split('T')[0]}.json`)
    const report = {
      summary: {
        duration: `${duration.toFixed(1)} minutes`,
        creditsUsed: this.progress.creditsUsed,
        productsScraped: this.progress.productsScraped,
        productsSaved: this.progress.productsSaved,
        totalInDatabase: totalProducts
      },
      progress: this.progress,
      categoryBreakdown: byCategory
    }
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    await this.log(`\n📄 Full report saved to: ${reportPath}`, 'SUCCESS')
  }
  
  private async log(message: string, level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') {
    const timestamp = new Date().toISOString()
    const emoji = {
      'INFO': '📝',
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'ERROR': '❌'
    }[level]
    
    const logMessage = `[${timestamp}] ${emoji} ${message}`
    console.log(logMessage)
    
    // Also write to log file
    try {
      await fs.mkdir(CONFIG.logDir, { recursive: true })
      const logFile = path.join(CONFIG.logDir, `priority-scraper-${new Date().toISOString().split('T')[0]}.log`)
      await fs.appendFile(logFile, logMessage + '\n')
    } catch (error) {
      // Ignore logging errors
    }
  }
  
  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options = {
    resume: args.includes('--resume'),
    testMode: args.includes('--test')
  }
  
  console.log('🚀 SwissMenu AI - Comprehensive Priority Scraper')
  console.log('=' .repeat(50))
  console.log('Target: ~570 products from priority categories')
  console.log('Categories: Pasta & Rice, Meat & Poultry, Vegetables, Dairy & Eggs, Pantry')
  console.log('=' .repeat(50))
  
  if (options.testMode) {
    console.log('⚠️  Running in TEST MODE - Limited scraping')
  }
  
  if (options.resume) {
    console.log('↻  Resuming from checkpoint...')
  }
  
  const scraper = new ComprehensivePriorityScraper()
  await scraper.run(options)
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { ComprehensivePriorityScraper }