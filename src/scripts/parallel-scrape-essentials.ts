#!/usr/bin/env tsx
import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { promises as fs } from 'fs'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

// Comprehensive list of essential ingredients
const ESSENTIAL_INGREDIENTS = [
  // Fish & Seafood (20 products)
  { query: 'saumon frais', category: 'fish', priority: 1 },
  { query: 'filet de saumon', category: 'fish', priority: 1 },
  { query: 'filet de perche', category: 'fish', priority: 1 },
  { query: 'cabillaud', category: 'fish', priority: 1 },
  { query: 'thon frais', category: 'fish', priority: 2 },
  { query: 'crevettes', category: 'fish', priority: 1 },
  { query: 'poisson blanc', category: 'fish', priority: 2 },
  
  // Herbs & Spices (40 products)
  { query: 'basilic frais', category: 'herbs', priority: 1 },
  { query: 'persil frais', category: 'herbs', priority: 1 },
  { query: 'thym frais', category: 'herbs', priority: 1 },
  { query: 'romarin frais', category: 'herbs', priority: 1 },
  { query: 'origan', category: 'herbs', priority: 2 },
  { query: 'sauge fraîche', category: 'herbs', priority: 2 },
  { query: 'coriandre fraîche', category: 'herbs', priority: 2 },
  { query: 'menthe fraîche', category: 'herbs', priority: 3 },
  { query: 'herbes de provence', category: 'herbs', priority: 1 },
  { query: 'épices mélange', category: 'herbs', priority: 2 },
  { query: 'curry poudre', category: 'herbs', priority: 1 },
  { query: 'paprika', category: 'herbs', priority: 1 },
  { query: 'cumin moulu', category: 'herbs', priority: 2 },
  { query: 'curcuma', category: 'herbs', priority: 2 },
  { query: 'cannelle', category: 'herbs', priority: 3 },
  { query: 'muscade', category: 'herbs', priority: 3 },
  
  // Essential Condiments (30 products)
  { query: 'huile olive extra vierge', category: 'pantry', priority: 1 },
  { query: 'huile olive', category: 'pantry', priority: 1 },
  { query: 'vinaigre balsamique', category: 'pantry', priority: 1 },
  { query: 'vinaigre de vin', category: 'pantry', priority: 2 },
  { query: 'moutarde de dijon', category: 'pantry', priority: 1 },
  { query: 'sauce soja', category: 'pantry', priority: 1 },
  { query: 'mayonnaise', category: 'pantry', priority: 2 },
  { query: 'ketchup', category: 'pantry', priority: 3 },
  { query: 'fond de veau', category: 'pantry', priority: 1 },
  { query: 'bouillon de légumes', category: 'pantry', priority: 1 },
  { query: 'bouillon de poulet', category: 'pantry', priority: 1 },
  { query: 'concentré de tomates', category: 'pantry', priority: 1 },
  { query: 'sauce tomate', category: 'pantry', priority: 2 },
  { query: 'miel', category: 'pantry', priority: 2 },
  { query: 'cornichons', category: 'pantry', priority: 3 },
  { query: 'câpres', category: 'pantry', priority: 3 },
  { query: 'olives vertes', category: 'pantry', priority: 3 },
  { query: 'olives noires', category: 'pantry', priority: 3 },
  
  // Specialty Grains (15 products)
  { query: 'quinoa', category: 'rice', priority: 1 },
  { query: 'couscous', category: 'rice', priority: 1 },
  { query: 'polenta', category: 'rice', priority: 1 },
  { query: 'boulgour', category: 'rice', priority: 2 },
  { query: 'riz basmati', category: 'rice', priority: 1 },
  { query: 'riz arborio', category: 'rice', priority: 2 },
  
  // Fresh Vegetables (40 products)
  { query: 'courgette', category: 'vegetables', priority: 1 },
  { query: 'aubergine', category: 'vegetables', priority: 1 },
  { query: 'poivron rouge', category: 'vegetables', priority: 1 },
  { query: 'poivron vert', category: 'vegetables', priority: 2 },
  { query: 'brocoli', category: 'vegetables', priority: 1 },
  { query: 'champignons de paris', category: 'vegetables', priority: 1 },
  { query: 'échalote', category: 'vegetables', priority: 1 },
  { query: 'gingembre frais', category: 'vegetables', priority: 1 },
  { query: 'poireau', category: 'vegetables', priority: 2 },
  { query: 'céleri branche', category: 'vegetables', priority: 2 },
  { query: 'épinards frais', category: 'vegetables', priority: 2 },
  { query: 'haricots verts', category: 'vegetables', priority: 2 },
  { query: 'petits pois', category: 'vegetables', priority: 3 },
  { query: 'maïs', category: 'vegetables', priority: 3 },
  
  // Citrus & Fruits (20 products)
  { query: 'citron', category: 'fruits', priority: 1 },
  { query: 'citron vert', category: 'fruits', priority: 1 },
  { query: 'orange', category: 'fruits', priority: 1 },
  { query: 'pomme', category: 'fruits', priority: 2 },
  { query: 'abricot', category: 'fruits', priority: 2 },
  { query: 'pêche', category: 'fruits', priority: 3 },
  { query: 'avocat', category: 'fruits', priority: 1 },
  { query: 'mangue', category: 'fruits', priority: 3 },
  
  // Bakery Essentials (15 products)
  { query: 'pâte feuilletée', category: 'bakery', priority: 1 },
  { query: 'pâte brisée', category: 'bakery', priority: 1 },
  { query: 'pâte à pizza', category: 'bakery', priority: 2 },
  { query: 'pain baguette', category: 'bakery', priority: 2 },
  { query: 'pain complet', category: 'bakery', priority: 3 },
  
  // Nuts & Seeds (20 products)
  { query: 'amandes', category: 'nuts', priority: 1 },
  { query: 'noix', category: 'nuts', priority: 2 },
  { query: 'noisettes', category: 'nuts', priority: 2 },
  { query: 'pignons de pin', category: 'nuts', priority: 1 },
  { query: 'graines de sésame', category: 'nuts', priority: 2 },
  { query: 'graines de tournesol', category: 'nuts', priority: 3 },
  
  // Additional pantry staples
  { query: 'chapelure', category: 'pantry', priority: 2 },
  { query: 'levure chimique', category: 'pantry', priority: 3 },
  { query: 'fécule', category: 'pantry', priority: 3 },
  { query: 'gélatine', category: 'pantry', priority: 3 }
]

const CONCURRENT_SEARCHES = 5
const CONCURRENT_PRODUCTS = 8
const MAX_PRODUCTS_PER_SEARCH = 4

// Rate limiting
const DELAY_BETWEEN_BATCHES = 2000
const DELAY_BETWEEN_PRODUCTS = 500

async function extractProductUrlsFromSearch(searchUrl: string): Promise<string[]> {
  try {
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: searchUrl,
        render_js: 'true',
        premium_proxy: 'true',
        country_code: 'ch',
        wait: '3000',
        block_ads: 'true',
        custom_google: 'false',
        stealth_proxy: 'true'
      },
      timeout: 60000
    })
    
    const $ = cheerio.load(response.data)
    const productUrls: string[] = []
    
    // Multiple selectors for better coverage
    const selectors = [
      'a[href*="/product/"]',
      '.product-tile a[href]',
      '[data-testid="product-tile"] a',
      '.m-product-card a'
    ]
    
    selectors.forEach(selector => {
      $(selector).each((_, element) => {
        const href = $(element).attr('href')
        if (href && href.includes('/product/') && !href.includes('/productgroup/')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
          if (!productUrls.includes(fullUrl)) {
            productUrls.push(fullUrl)
          }
        }
      })
    })
    
    return productUrls
    
  } catch (error) {
    console.error('❌ Search failed:', error.message)
    return []
  }
}

async function scrapeProduct(scraper: ProxyScraper, url: string, category: string): Promise<boolean> {
  try {
    const product = await scraper.scrapeProduct(url)
    
    if (product && product.name && product.priceChf > 0) {
      const productData = {
        id: product.id,
        migrosId: product.id,
        name: product.name,
        brand: product.brand,
        priceChf: product.priceChf,
        price: product.priceChf,
        unit: product.unit || extractUnit(product.name),
        category: category,
        url: url,
        imageUrl: product.imageUrl,
        ariaLabel: product.name,
        source: 'scrapingbee' as const,
        lastScraped: new Date()
      }
      
      await prisma.migrosProduct.upsert({
        where: { id: productData.id },
        update: productData,
        create: productData
      })
      
      console.log(`✅ ${product.name} (${category}) - CHF ${product.priceChf}`)
      return true
    }
    return false
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

function extractUnit(productName: string): string {
  const unitMatch = productName.match(/(\d+\s*[gkmlL])\b|\b(\d+\s*pièces?)\b/i)
  return unitMatch ? unitMatch[0] : ''
}

async function processSearchBatch(scraper: ProxyScraper, searches: typeof ESSENTIAL_INGREDIENTS): Promise<number> {
  console.log(`\n🔄 Processing batch of ${searches.length} searches...`)
  
  const searchResults = await Promise.all(
    searches.map(async (search) => {
      const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(search.query)}`
      console.log(`🔍 Searching: ${search.query}`)
      const urls = await extractProductUrlsFromSearch(searchUrl)
      return { search, urls: urls.slice(0, MAX_PRODUCTS_PER_SEARCH) }
    })
  )
  
  // Flatten all product URLs with their categories
  const allProducts: Array<{ url: string; category: string }> = []
  searchResults.forEach(({ search, urls }) => {
    urls.forEach(url => allProducts.push({ url, category: search.category }))
  })
  
  console.log(`📦 Found ${allProducts.length} products to scrape`)
  
  // Scrape products in parallel batches
  let scraped = 0
  for (let i = 0; i < allProducts.length; i += CONCURRENT_PRODUCTS) {
    const batch = allProducts.slice(i, i + CONCURRENT_PRODUCTS)
    
    const results = await Promise.all(
      batch.map(({ url, category }) => scrapeProduct(scraper, url, category))
    )
    
    scraped += results.filter(Boolean).length
    
    // Small delay between product batches
    if (i + CONCURRENT_PRODUCTS < allProducts.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PRODUCTS))
    }
  }
  
  return scraped
}

async function main() {
  console.log('🚀 Starting parallel essential ingredients scraping...')
  console.log(`📊 Total searches: ${ESSENTIAL_INGREDIENTS.length}`)
  console.log(`⚡ Parallel configuration: ${CONCURRENT_SEARCHES} searches, ${CONCURRENT_PRODUCTS} products`)
  
  // Create logs directory
  const logDir = path.join(process.cwd(), 'logs')
  await fs.mkdir(logDir, { recursive: true })
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  let totalScraped = 0
  const totalBatches = Math.ceil(ESSENTIAL_INGREDIENTS.length / CONCURRENT_SEARCHES)
  
  try {
    // Sort by priority
    const sortedSearches = [...ESSENTIAL_INGREDIENTS].sort((a, b) => a.priority - b.priority)
    
    // Process in batches
    for (let i = 0; i < sortedSearches.length; i += CONCURRENT_SEARCHES) {
      const batchNum = Math.floor(i / CONCURRENT_SEARCHES) + 1
      console.log(`\n\n📍 Batch ${batchNum}/${totalBatches}`)
      
      const batch = sortedSearches.slice(i, i + CONCURRENT_SEARCHES)
      const scraped = await processSearchBatch(scraper, batch)
      
      totalScraped += scraped
      console.log(`✅ Batch complete: ${scraped} products scraped (Total: ${totalScraped})`)
      
      // Delay between search batches
      if (i + CONCURRENT_SEARCHES < sortedSearches.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }
    }
    
    console.log('\n\n🎉 Scraping complete!')
    console.log(`📊 Total products scraped: ${totalScraped}`)
    
    // Final database status
    const categoryCounts = await prisma.migrosProduct.groupBy({
      by: ['category'],
      _count: true,
      orderBy: { _count: { category: 'desc' } }
    })
    
    console.log('\n📊 Database status by category:')
    let grandTotal = 0
    categoryCounts.forEach(({ category, _count }) => {
      console.log(`  ${category}: ${_count} products`)
      grandTotal += _count
    })
    console.log(`\n📦 Total products in database: ${grandTotal}`)
    
    // Log completion
    await fs.writeFile(
      path.join(logDir, `scraping-complete-${Date.now()}.json`),
      JSON.stringify({ totalScraped, categoryCounts, timestamp: new Date() }, null, 2)
    )
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main().catch(console.error)