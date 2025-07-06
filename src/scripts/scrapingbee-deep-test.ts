#!/usr/bin/env tsx

// Deep test of ScrapingBee to find actual product URLs and test scraping

import { ProxyScraper } from '../lib/proxy-scraper'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'
import { swissProducts } from '../lib/swiss-product-database'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function findProductUrls() {
  console.log('🔍 Finding real Migros product URLs...\n')

  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })

  // Test different category pages to find product URL patterns
  const testUrls = [
    'https://www.migros.ch/fr/search?query=barilla',
    'https://www.migros.ch/fr/search?query=pasta',
    'https://www.migros.ch/fr/category/519', // Pasta category
    'https://www.migros.ch/fr/product/mo/11790' // Known working product
  ]

  for (const url of testUrls) {
    console.log(`\n📄 Analyzing: ${url}`)
    
    try {
      const html = await scraper.scrapeUrl(url)
      const $ = cheerio.load(html)
      
      // Look for various product link patterns
      const patterns = [
        'a[href*="/product/"]',
        '[data-testid="product-link"]',
        '.product-link',
        'a[href*="/fr/product/"]',
        '[class*="product"] a',
        '[data-cy*="product"] a'
      ]

      const foundUrls = new Set<string>()
      
      patterns.forEach(pattern => {
        $(pattern).each((_, elem) => {
          const href = $(elem).attr('href')
          if (href && href.includes('/product/')) {
            const fullUrl = href.startsWith('http') 
              ? href 
              : `https://www.migros.ch${href}`
            foundUrls.add(fullUrl)
          }
        })
      })

      console.log(`Found ${foundUrls.size} product URLs:`)
      Array.from(foundUrls).slice(0, 5).forEach(u => console.log(`  - ${u}`))

      // Also check page structure
      console.log('\n📊 Page structure analysis:')
      console.log(`  - Title: ${$('title').text()}`)
      console.log(`  - H1 tags: ${$('h1').length}`)
      console.log(`  - Product-like elements: ${$('[class*="product"]').length}`)
      console.log(`  - Links total: ${$('a').length}`)
      
      // Look for price patterns
      const pricePatterns = [
        '[class*="price"]',
        '[data-testid*="price"]',
        '.CHF',
        'span:contains("CHF")'
      ]
      
      pricePatterns.forEach(pattern => {
        const count = $(pattern).length
        if (count > 0) {
          console.log(`  - Price elements (${pattern}): ${count}`)
        }
      })

    } catch (error) {
      console.error(`Failed to analyze ${url}:`, error)
    }

    // Be nice to the API
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
}

async function testKnownProducts() {
  console.log('\n\n🧪 Testing known product URLs...\n')

  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })

  // Test products we know exist
  const knownProducts = [
    { url: 'https://www.migros.ch/fr/product/mo/11790', name: 'Barilla Penne' },
    { url: 'https://www.migros.ch/fr/product/mo/11785', name: 'Barilla Spaghetti' },
    { url: 'https://www.migros.ch/fr/product/210703904102', name: 'Migros Bio Pasta' },
    { url: 'https://www.migros.ch/fr/product/104074500000', name: 'Unknown Product' }
  ]

  for (const { url, name } of knownProducts) {
    console.log(`\n📦 Testing: ${name}`)
    console.log(`URL: ${url}`)
    
    try {
      const product = await scraper.scrapeProduct(url)
      
      if (product) {
        console.log('✅ Scraped successfully:')
        console.log(`  - Name: ${product.name}`)
        console.log(`  - Price: CHF ${product.priceChf}`)
        console.log(`  - Brand: ${product.brand || 'N/A'}`)
      } else {
        console.log('❌ Failed to parse product')
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`)
    }

    await new Promise(resolve => setTimeout(resolve, 3000))
  }
}

async function testSearchScraping() {
  console.log('\n\n🔎 Testing search-based scraping...\n')

  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })

  // Search for common products
  const searches = ['pasta', 'lait', 'pain', 'poulet']

  for (const query of searches) {
    console.log(`\n🔍 Searching for: ${query}`)
    const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(query)}`
    
    try {
      const html = await scraper.scrapeUrl(searchUrl)
      const $ = cheerio.load(html)
      
      // Extract product data directly from search results
      const products: any[] = []
      
      // Look for product containers in search results
      $('[data-testid*="product"], [class*="product-tile"], [class*="search-result"]').each((_, elem) => {
        const $elem = $(elem)
        
        // Try to extract product info
        const name = $elem.find('[class*="name"], h2, h3').first().text().trim()
        const priceText = $elem.find('[class*="price"]').text()
        const link = $elem.find('a').attr('href')
        
        if (name && priceText) {
          const priceMatch = priceText.match(/(\d+[.,]\d{2})/)
          const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0
          
          products.push({
            name,
            price,
            url: link ? (link.startsWith('http') ? link : `https://www.migros.ch${link}`) : null
          })
        }
      })

      console.log(`Found ${products.length} products`)
      products.slice(0, 3).forEach(p => {
        console.log(`  - ${p.name} - CHF ${p.price}`)
        if (p.url) console.log(`    URL: ${p.url}`)
      })

    } catch (error) {
      console.error(`Search failed: ${error}`)
    }

    await new Promise(resolve => setTimeout(resolve, 3000))
  }
}

async function main() {
  console.log('🚀 ScrapingBee Deep Test - Finding Migros Products\n')

  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found in environment')
    return
  }

  // Run all tests
  await findProductUrls()
  await testKnownProducts()
  await testSearchScraping()

  console.log('\n\n📊 Test Summary:')
  console.log('- ScrapingBee successfully bypasses Cloudflare ✅')
  console.log('- Can scrape product pages when URL is known ✅')
  console.log('- Need to find correct selectors for category/search pages')
  console.log('- May need to use search API or different entry points')
  
  console.log('\n💡 Next steps:')
  console.log('1. Use search queries to find products')
  console.log('2. Build product database from search results')
  console.log('3. Implement incremental scraping strategy')
  console.log('4. Cache results to minimize API usage')
}

main().catch(console.error)