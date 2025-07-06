#!/usr/bin/env tsx
import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'
import axios from 'axios'
import * as cheerio from 'cheerio'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

// Essential ingredients we need for recipes
const ESSENTIAL_SEARCHES = [
  // Fish & Seafood
  { query: 'saumon', category: 'fish' },
  { query: 'filet%20de%20perche', category: 'fish' },
  { query: 'cabillaud', category: 'fish' },
  { query: 'crevettes', category: 'fish' },
  
  // Herbs & Spices  
  { query: 'basilic%20frais', category: 'herbs' },
  { query: 'persil', category: 'herbs' },
  { query: 'thym', category: 'herbs' },
  { query: 'romarin', category: 'herbs' },
  { query: 'herbes%20de%20provence', category: 'herbs' },
  { query: 'épices', category: 'herbs' },
  
  // Essential condiments
  { query: 'huile%20olive', category: 'pantry' },
  { query: 'vinaigre%20balsamique', category: 'pantry' },
  { query: 'moutarde%20dijon', category: 'pantry' },
  { query: 'sauce%20soja', category: 'pantry' },
  { query: 'fond%20de%20veau', category: 'pantry' },
  { query: 'bouillon%20légumes', category: 'pantry' },
  
  // Specialty grains
  { query: 'quinoa', category: 'rice' },
  { query: 'couscous', category: 'rice' },
  { query: 'polenta', category: 'rice' },
  
  // Key vegetables
  { query: 'courgette', category: 'vegetables' },
  { query: 'aubergine', category: 'vegetables' },
  { query: 'poivron', category: 'vegetables' },
  { query: 'brocoli', category: 'vegetables' },
  { query: 'champignons', category: 'vegetables' },
  { query: 'échalote', category: 'vegetables' },
  { query: 'gingembre', category: 'vegetables' },
  
  // Citrus & fruits
  { query: 'citron', category: 'fruits' },
  { query: 'citron%20vert', category: 'fruits' },
  { query: 'orange', category: 'fruits' },
  { query: 'abricot', category: 'fruits' },
  
  // Bakery essentials
  { query: 'pâte%20feuilletée', category: 'bakery' },
  { query: 'pâte%20brisée', category: 'bakery' },
  
  // Nuts & seeds
  { query: 'amandes', category: 'nuts' },
  { query: 'pignons%20de%20pin', category: 'nuts' },
  { query: 'graines%20de%20sésame', category: 'nuts' }
]

const BATCH_SIZE = 3

async function extractProductUrlsFromSearch(scraper: ProxyScraper, searchUrl: string): Promise<string[]> {
  try {
    console.log(`🐝 Scraping search page: ${searchUrl}`)
    
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: searchUrl,
        render_js: 'true',
        premium_proxy: 'true',
        country_code: 'ch',
        wait: '3000',
        block_ads: 'true'
      },
      timeout: 60000
    })
    
    const $ = cheerio.load(response.data)
    const productUrls: string[] = []
    
    // Extract product URLs from search results
    $('a[href*="/product/"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href && !href.includes('/productgroup/')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
        if (!productUrls.includes(fullUrl)) {
          productUrls.push(fullUrl)
        }
      }
    })
    
    console.log(`✅ Found ${productUrls.length} products`)
    return productUrls
    
  } catch (error) {
    console.error('❌ Search scraping failed:', error.message)
    return []
  }
}

async function scrapeProductBatch(scraper: ProxyScraper, urls: string[], category: string): Promise<number> {
  console.log(`\n📦 Scraping batch of ${urls.length} products...`)
  
  let successCount = 0
  
  for (const url of urls) {
    try {
      const product = await scraper.scrapeProduct(url)
      
      if (product && product.name && product.priceChf > 0) {
        // Enhanced product data
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
        
        console.log(`✅ Saved: ${product.name} (${category}) - CHF ${product.priceChf}`)
        successCount++
      }
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error.message)
    }
    
    // Small delay between products
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return successCount
}

function extractUnit(productName: string): string {
  // Extract unit from product name
  const unitMatch = productName.match(/(\d+\s*[gkmlL])\b|\b(\d+\s*pièces?)\b/i)
  return unitMatch ? unitMatch[0] : ''
}

async function main() {
  console.log('🌟 Starting to scrape essential ingredients for recipes...')
  console.log(`📊 Total searches: ${ESSENTIAL_SEARCHES.length}`)
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  let totalScraped = 0
  let totalSearches = 0
  
  try {
    for (const search of ESSENTIAL_SEARCHES) {
      totalSearches++
      console.log(`\n\n🔍 [${totalSearches}/${ESSENTIAL_SEARCHES.length}] Searching: ${decodeURIComponent(search.query)} (${search.category})`)
      
      const searchUrl = `https://www.migros.ch/fr/search?query=${search.query}`
      const productUrls = await extractProductUrlsFromSearch(scraper, searchUrl)
      
      if (productUrls.length === 0) {
        console.log(`⚠️  No products found for: ${search.query}`)
        continue
      }
      
      // Take first 3-5 products
      const urlsToScrape = productUrls.slice(0, 5)
      console.log(`📦 Will scrape ${urlsToScrape.length} products`)
      
      // Process in small batches
      for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
        const batch = urlsToScrape.slice(i, i + BATCH_SIZE)
        const scraped = await scrapeProductBatch(scraper, batch, search.category)
        totalScraped += scraped
        
        // Progress update
        console.log(`📊 Progress: ${totalScraped} products scraped so far`)
      }
      
      // Delay between searches
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log('\n\n✅ Scraping complete!')
    console.log(`📊 Total products scraped: ${totalScraped}`)
    
    // Final database status
    const categoryCounts = await prisma.migrosProduct.groupBy({
      by: ['category'],
      _count: true,
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    })
    
    console.log('\n📊 Updated database status:')
    categoryCounts.forEach(({ category, _count }) => {
      console.log(`  ${category}: ${_count} products`)
    })
    
    const total = await prisma.migrosProduct.count()
    console.log(`\n📦 Total products in database: ${total}`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main().catch(console.error)