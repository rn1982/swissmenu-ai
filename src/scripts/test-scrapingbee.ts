#!/usr/bin/env tsx

// Test ScrapingBee proxy service for Migros scraping
// ScrapingBee offers 1000 free API credits for testing

import { ProxyScraper } from '../lib/proxy-scraper'
import * as dotenv from 'dotenv'
import * as fs from 'fs/promises'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function setupScrapingBee() {
  console.log(`
🐝 ScrapingBee Setup Guide
═══════════════════════════

ScrapingBee offers a free trial with 1000 API credits. Here's how to get started:

1. Sign up for free trial:
   https://www.scrapingbee.com/

2. Get your API key from dashboard:
   https://app.scrapingbee.com/dashboard

3. Add to your .env.local file:
   SCRAPINGBEE_API_KEY=your_api_key_here

4. Run this test again

Current status: ${process.env.SCRAPINGBEE_API_KEY ? '✅ API key configured' : '❌ API key not found'}
`)

  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.log('\n💡 Tip: ScrapingBee free trial includes:')
    console.log('- 1000 API credits')
    console.log('- JavaScript rendering')
    console.log('- Residential proxies')
    console.log('- Anti-bot bypass')
    console.log('- Swiss IP addresses available')
    return false
  }
  
  return true
}

async function testScrapingBee() {
  const isConfigured = await setupScrapingBee()
  if (!isConfigured) {
    return
  }

  console.log('\n🧪 Testing ScrapingBee with Migros...\n')

  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })

  try {
    // Test 1: Simple page load
    console.log('📋 Test 1: Homepage access')
    const homepageHtml = await scraper.scrapeUrl('https://www.migros.ch/fr')
    console.log(`✅ Homepage loaded (${homepageHtml.length} chars)`)
    
    // Save for inspection
    const debugDir = path.join(process.cwd(), 'debug-scrapingbee')
    await fs.mkdir(debugDir, { recursive: true })
    await fs.writeFile(
      path.join(debugDir, 'homepage.html'),
      homepageHtml
    )

    // Test 2: Product page with known working URL
    console.log('\n📋 Test 2: Product page (Barilla pasta)')
    const productUrl = 'https://www.migros.ch/fr/product/mo/11790'
    const product = await scraper.scrapeProduct(productUrl)
    
    if (product) {
      console.log('✅ Product scraped successfully:')
      console.log(`   Name: ${product.name}`)
      console.log(`   Brand: ${product.brand || 'N/A'}`)
      console.log(`   Price: CHF ${product.priceChf}`)
      console.log(`   ID: ${product.id}`)
    } else {
      console.log('❌ Failed to parse product data')
      console.log('   Check debug-scrapingbee/11790.html for raw HTML')
    }

    // Test 3: Category page
    console.log('\n📋 Test 3: Category page (pasta)')
    const categoryProducts = await scraper.scrapeCategory('pasta', 3)
    console.log(`✅ Found ${categoryProducts.length} products in pasta category`)
    
    categoryProducts.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} - CHF ${p.priceChf}`)
    })

    // Test 4: Check if we can detect Cloudflare
    console.log('\n📋 Test 4: Cloudflare detection')
    const htmlSnippet = homepageHtml.substring(0, 1000)
    const hasCloudflare = htmlSnippet.includes('cloudflare') || 
                         htmlSnippet.includes('cf-browser-verification')
    console.log(`   Cloudflare detected: ${hasCloudflare ? '⚠️ Yes' : '✅ No'}`)

    // API usage stats
    console.log('\n📊 ScrapingBee API Usage:')
    console.log('   Check your dashboard for remaining credits:')
    console.log('   https://app.scrapingbee.com/dashboard')
    console.log('\n💡 Each request uses:')
    console.log('   - 1 credit for standard proxy')
    console.log('   - 10 credits for premium proxy with JS rendering')
    console.log('   - 25 credits for stealth proxy (maximum anti-detection)')

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Authentication error - check your API key')
    } else if (error.response?.status === 402) {
      console.log('\n💳 Credits exhausted - upgrade your plan')
    } else if (error.response?.status === 429) {
      console.log('\n⏳ Rate limit exceeded - slow down requests')
    }
  }
}

async function compareWithFallback() {
  console.log('\n📊 Comparing ScrapingBee results with fallback data...\n')

  const database = await import('../lib/swiss-product-database')
  const swissProducts = database.swissProducts
  const workingProducts = swissProducts.filter(p => p.url)
  
  console.log(`Found ${workingProducts.length} products with URLs in fallback database`)
  console.log('\nTesting first 3 products...\n')

  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })

  for (const fallbackProduct of workingProducts.slice(0, 3)) {
    console.log(`Testing: ${fallbackProduct.name}`)
    console.log(`Fallback URL: ${fallbackProduct.url}`)
    
    try {
      const scrapedProduct = await scraper.scrapeProduct(fallbackProduct.url!)
      
      if (scrapedProduct) {
        console.log(`✅ Scraped successfully`)
        console.log(`   Name match: ${scrapedProduct.name.includes('Barilla') ? '✅' : '❌'}`)
        console.log(`   Price: Fallback CHF ${fallbackProduct.priceChf} vs Scraped CHF ${scrapedProduct.priceChf}`)
      } else {
        console.log(`❌ Failed to scrape`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error}`)
    }
    
    console.log('')
    
    // Be nice to the API
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

// Main execution
async function main() {
  console.log('🚀 SwissMenu AI - ScrapingBee Proxy Test\n')
  
  await testScrapingBee()
  
  if (process.env.SCRAPINGBEE_API_KEY) {
    await compareWithFallback()
  }
  
  console.log('\n✨ Test complete!')
}

main().catch(console.error)