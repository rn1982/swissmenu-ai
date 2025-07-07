#!/usr/bin/env tsx

// Focused scraper to expand product database to 500 items
// Targets essential cooking ingredients for recipe matching

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as cheerio from 'cheerio'
import * as fs from 'fs/promises'
import * as path from 'path'
import axios from 'axios'

const prisma = new PrismaClient()

// Essential cooking categories with fixed Migros URLs
const COOKING_CATEGORIES = [
  {
    name: 'meat',
    displayName: 'Viande & Volaille',
    urls: [
      'https://www.migros.ch/fr/category/viande-poisson/viande-fraiche/viande-de-boeuf',
      'https://www.migros.ch/fr/category/viande-poisson/viande-fraiche/viande-hachee',
      'https://www.migros.ch/fr/category/viande-poisson/viande-fraiche/viande-de-porc',
      'https://www.migros.ch/fr/category/viande-poisson/viande-fraiche/viande-de-veau',
      'https://www.migros.ch/fr/category/viande-poisson/viande-fraiche/volaille-fraiche'
    ],
    targetCount: 80
  },
  {
    name: 'vegetables',
    displayName: 'Légumes',
    urls: [
      'https://www.migros.ch/fr/category/fruits-legumes/legumes-frais',
      'https://www.migros.ch/fr/category/fruits-legumes/legumes-frais/legumes-bio',
      'https://www.migros.ch/fr/category/fruits-legumes/salades-herbes-aromatiques',
      'https://www.migros.ch/fr/category/conserves-congelation/legumes-surgeles'
    ],
    targetCount: 100
  },
  {
    name: 'dairy',
    displayName: 'Produits laitiers & Œufs',
    urls: [
      'https://www.migros.ch/fr/category/lait-beurre-oeufs/lait-creme-yogourt',
      'https://www.migros.ch/fr/category/lait-beurre-oeufs/oeufs',
      'https://www.migros.ch/fr/category/fromage-charcuterie/fromage-a-pate-dure',
      'https://www.migros.ch/fr/category/fromage-charcuterie/fromage-a-pate-molle',
      'https://www.migros.ch/fr/category/lait-beurre-oeufs/beurre-margarine'
    ],
    targetCount: 80
  },
  {
    name: 'pantry',
    displayName: 'Épicerie & Essentiels',
    urls: [
      'https://www.migros.ch/fr/category/pates-condiments-conserves/huiles-vinaigres',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/farines-sucres-ingredients',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/sel-epices-bouillons',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/riz',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/conserves'
    ],
    targetCount: 120
  },
  {
    name: 'fish',
    displayName: 'Poisson & Fruits de mer',
    urls: [
      'https://www.migros.ch/fr/category/viande-poisson/poisson-frais',
      'https://www.migros.ch/fr/category/viande-poisson/poisson-fume',
      'https://www.migros.ch/fr/category/viande-poisson/fruits-de-mer',
      'https://www.migros.ch/fr/category/conserves-congelation/poisson-surgele'
    ],
    targetCount: 40
  },
  {
    name: 'herbs-spices',
    displayName: 'Herbes & Épices',
    urls: [
      'https://www.migros.ch/fr/category/pates-condiments-conserves/sel-epices-bouillons/epices',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/sel-epices-bouillons/herbes-aromatiques',
      'https://www.migros.ch/fr/category/fruits-legumes/salades-herbes-aromatiques/herbes-fraiches'
    ],
    targetCount: 40
  },
  {
    name: 'grains-legumes',
    displayName: 'Céréales & Légumineuses',
    urls: [
      'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/cereales',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/legumineuses',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/quinoa-couscous'
    ],
    targetCount: 40
  }
]

// Progress tracking
interface ScrapingProgress {
  startTime: Date
  categoriesCompleted: string[]
  totalProducts: number
  validUrls: number
  invalidUrls: number
  errors: string[]
}

let progress: ScrapingProgress = {
  startTime: new Date(),
  categoriesCompleted: [],
  totalProducts: 0,
  validUrls: 0,
  invalidUrls: 0,
  errors: []
}

// Logging with timestamp
function log(message: string, level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') {
  const timestamp = new Date().toISOString()
  const emoji = {
    'INFO': '📝',
    'SUCCESS': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌'
  }[level]
  
  console.log(`[${timestamp}] ${emoji} ${message}`)
}

// Save progress to file
async function saveProgress() {
  const progressPath = path.join(process.cwd(), 'logs', 'scraping-progress.json')
  await fs.mkdir(path.dirname(progressPath), { recursive: true })
  await fs.writeFile(progressPath, JSON.stringify(progress, null, 2))
}

// Validate URL by making a HEAD request
async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: (status) => status < 400
    })
    return response.status === 200
  } catch {
    return false
  }
}

// Extract products from category page
async function scrapeProductsFromCategory(
  scraper: ProxyScraper,
  categoryUrl: string,
  limit: number
): Promise<any[]> {
  try {
    log(`Scraping category: ${categoryUrl}`)
    
    const html = await scraper.scrapeUrl(categoryUrl)
    const $ = cheerio.load(html)
    
    const products: any[] = []
    const productElements = $('[data-testid*="product"], .product-card, article[data-cy="product-card"]')
    
    log(`Found ${productElements.length} product elements`)
    
    productElements.each((index, elem) => {
      if (index >= limit) return
      
      try {
        const $elem = $(elem)
        
        // Extract product info
        const name = $elem.find('[data-cy="product-card-title"]').text().trim() ||
                    $elem.find('.product-name').text().trim() ||
                    $elem.find('h3').first().text().trim()
        
        const priceText = $elem.find('[data-cy="product-price"]').text() ||
                         $elem.find('.price').text()
        
        const priceMatch = priceText.match(/(\d+[.,]\d{2})/)
        const priceChf = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null
        
        const link = $elem.find('a').attr('href')
        const fullUrl = link ? (link.startsWith('http') ? link : `https://www.migros.ch${link}`) : null
        
        // Extract Migros ID from various sources
        const productId = $elem.attr('data-product-id') ||
                         $elem.attr('id') ||
                         (fullUrl ? fullUrl.match(/\/(\d+)$/)?.[1] : null) ||
                         `scraped-${Date.now()}-${index}`
        
        const imageUrl = $elem.find('img').attr('src') ||
                        $elem.find('img').attr('data-src')
        
        if (name && priceChf) {
          products.push({
            id: productId,
            name,
            brand: name.split(' ')[0], // First word often brand
            priceChf,
            url: fullUrl,
            imageUrl,
            source: 'scrapingbee'
          })
        }
      } catch (error) {
        log(`Error parsing product: ${error}`, 'WARNING')
      }
    })
    
    log(`Successfully extracted ${products.length} products`)
    return products
    
  } catch (error) {
    log(`Failed to scrape category: ${error}`, 'ERROR')
    progress.errors.push(`Category scrape failed: ${categoryUrl}`)
    return []
  }
}

// Update database with new products
async function updateDatabase(products: any[], category: string): Promise<{ created: number, updated: number }> {
  let created = 0
  let updated = 0
  
  for (const product of products) {
    try {
      // Check if product exists
      const existing = await prisma.migrosProduct.findFirst({
        where: {
          OR: [
            { migrosId: product.id },
            { url: product.url },
            { name: product.name }
          ]
        }
      })
      
      if (existing) {
        // Update existing product
        await prisma.migrosProduct.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            brand: product.brand,
            price: product.priceChf,
            priceChf: product.priceChf,
            url: product.url,
            imageUrl: product.imageUrl,
            category: category,
            source: 'scrapingbee',
            lastScraped: new Date(),
            lastUpdated: new Date()
          }
        })
        updated++
      } else {
        // Create new product
        await prisma.migrosProduct.create({
          data: {
            migrosId: product.id,
            name: product.name,
            brand: product.brand || '',
            price: product.priceChf,
            priceChf: product.priceChf,
            url: product.url || '',
            imageUrl: product.imageUrl || '',
            category: category,
            source: 'scrapingbee',
            lastScraped: new Date(),
            lastUpdated: new Date()
          }
        })
        created++
      }
      
      // Validate URL if present
      if (product.url) {
        const isValid = await validateUrl(product.url)
        if (isValid) {
          progress.validUrls++
        } else {
          progress.invalidUrls++
          log(`Invalid URL: ${product.url}`, 'WARNING')
        }
      }
      
    } catch (error) {
      log(`Database error for ${product.name}: ${error}`, 'ERROR')
    }
  }
  
  return { created, updated }
}

// Main scraping function
async function expandProductDatabase() {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    log('SCRAPINGBEE_API_KEY not found!', 'ERROR')
    return
  }
  
  log('=== Starting Product Database Expansion ===', 'INFO')
  log(`Target: 500 products across cooking essentials`, 'INFO')
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  // Get current product count
  const currentCount = await prisma.migrosProduct.count()
  log(`Current database size: ${currentCount} products`, 'INFO')
  
  try {
    // Process each category
    for (const category of COOKING_CATEGORIES) {
      log(`\n📦 Processing ${category.displayName} (target: ${category.targetCount} products)`, 'INFO')
      
      // Check current count for this category
      const categoryCount = await prisma.migrosProduct.count({
        where: { category: category.name }
      })
      
      log(`Current ${category.name} products: ${categoryCount}`, 'INFO')
      
      if (categoryCount >= category.targetCount) {
        log(`Category already has enough products, skipping...`, 'SUCCESS')
        progress.categoriesCompleted.push(category.name)
        continue
      }
      
      const needed = category.targetCount - categoryCount
      const allProducts: any[] = []
      
      // Scrape from each URL
      for (const url of category.urls) {
        if (allProducts.length >= needed) break
        
        const products = await scrapeProductsFromCategory(
          scraper,
          url,
          Math.ceil(needed / category.urls.length)
        )
        
        allProducts.push(...products)
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      // Update database
      log(`Updating database with ${allProducts.length} products...`, 'INFO')
      const { created, updated } = await updateDatabase(allProducts, category.name)
      
      progress.totalProducts += created
      progress.categoriesCompleted.push(category.name)
      
      log(`${category.displayName}: ${created} created, ${updated} updated`, 'SUCCESS')
      
      // Save progress
      await saveProgress()
      
      // Check if we've reached 500 products
      const totalNow = await prisma.migrosProduct.count()
      if (totalNow >= 500) {
        log(`\n🎉 Target reached! Database now has ${totalNow} products`, 'SUCCESS')
        break
      }
    }
    
    // Final summary
    const finalCount = await prisma.migrosProduct.count()
    const duration = (Date.now() - progress.startTime.getTime()) / 1000 / 60
    
    log('\n📊 === SCRAPING COMPLETE ===', 'SUCCESS')
    log(`Total products in database: ${finalCount}`, 'SUCCESS')
    log(`New products added: ${progress.totalProducts}`, 'SUCCESS')
    log(`Valid URLs: ${progress.validUrls}`, 'SUCCESS')
    log(`Invalid URLs: ${progress.invalidUrls}`, 'WARNING')
    log(`Categories completed: ${progress.categoriesCompleted.join(', ')}`, 'SUCCESS')
    log(`Duration: ${duration.toFixed(1)} minutes`, 'INFO')
    
    if (progress.errors.length > 0) {
      log(`\nErrors encountered:`, 'WARNING')
      progress.errors.forEach(err => log(`  - ${err}`, 'WARNING'))
    }
    
    // Category breakdown
    log('\n📈 Products by category:', 'INFO')
    const categoryBreakdown = await prisma.migrosProduct.groupBy({
      by: ['category'],
      _count: true,
      orderBy: { _count: { category: 'desc' } }
    })
    
    categoryBreakdown.forEach(cat => {
      log(`  ${cat.category || 'uncategorized'}: ${cat._count}`, 'INFO')
    })
    
  } catch (error) {
    log(`Fatal error: ${error}`, 'ERROR')
    progress.errors.push(`Fatal: ${error}`)
  } finally {
    await saveProgress()
    await prisma.$disconnect()
  }
}

// Run the scraper
if (require.main === module) {
  expandProductDatabase().catch(error => {
    console.error('Scraping failed:', error)
    process.exit(1)
  })
}

export { expandProductDatabase }