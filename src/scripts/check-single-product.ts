#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { ProxyScraper } from '../lib/proxy-scraper'
import { db } from '../lib/db'

async function checkProduct() {
  const productUrl = 'https://www.migros.ch/fr/product/104074500000'
  
  console.log('🔍 Checking M-Classic macaronis de l\'alpage...\n')
  
  // Check what's in database
  const dbProduct = await db.migrosProduct.findFirst({
    where: { id: '104074500000' }
  })
  
  console.log('📦 Database record:')
  console.log(`Name: ${dbProduct?.name}`)
  console.log(`Price: CHF ${dbProduct?.priceChf}`)
  console.log(`URL: ${dbProduct?.url}`)
  console.log(`Last updated: ${dbProduct?.lastUpdated}\n`)
  
  // Scrape again to check current price
  console.log('🌐 Scraping product page again...')
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })
  
  try {
    const product = await scraper.scrapeProduct(productUrl)
    
    if (product) {
      console.log('\n✅ Fresh scrape result:')
      console.log(`Name: ${product.name}`)
      console.log(`Price: CHF ${product.priceChf}`)
      console.log(`ID: ${product.id}`)
      
      if (product.priceChf !== dbProduct?.priceChf) {
        console.log(`\n⚠️  Price mismatch!`)
        console.log(`Database: CHF ${dbProduct?.priceChf}`)
        console.log(`Fresh scrape: CHF ${product.priceChf}`)
        console.log(`Your manual check: CHF 1.90`)
      }
    }
    
    // Let's also save the HTML to debug
    console.log('\n💾 Saving HTML for manual inspection...')
    const html = await scraper.scrapeUrl(productUrl)
    
    const fs = await import('fs/promises')
    await fs.writeFile('debug-macaronis.html', html)
    console.log('Saved to: debug-macaronis.html')
    
    // Search for price patterns in HTML
    const priceMatches = html.match(/(\d+[.,]\d{2})\s*(?:CHF|Fr\.?)/gi)
    if (priceMatches) {
      console.log('\n💰 All prices found in HTML:')
      priceMatches.slice(0, 10).forEach(match => console.log(`  - ${match}`))
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkProduct().catch(console.error)