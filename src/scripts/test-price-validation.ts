#!/usr/bin/env node

// Test script for price validation system

import { ProxyScraper } from '../lib/proxy-scraper'
import { saveScrapedProductWithValidation, getPriceValidationStats, getProductsNeedingPriceReview } from '../lib/database-helpers'
import { db } from '../lib/db'
import * as dotenv from 'dotenv'

dotenv.config()

// Test products with known multi-pack issues
const testProducts = [
  {
    url: 'https://www.migros.ch/fr/product/mo/11790',  // Original macaronis example
    name: 'M-Classic macaronis',
    expectedSinglePrice: 1.90,
    expectedMultiPrice: 3.95
  },
  {
    url: 'https://www.migros.ch/fr/product/mo/10110',
    name: 'Test product with multiple sizes',
    expectedSinglePrice: null  // Unknown, will discover
  },
  {
    url: 'https://www.migros.ch/fr/product/mo/12345',
    name: 'Test product single pack',
    expectedSinglePrice: null
  }
]

async function testPriceValidation() {
  console.log('🧪 Testing Price Validation System\n')

  // Initialize scraper
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })

  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY environment variable not set')
    return
  }

  // Test each product
  for (const testProduct of testProducts) {
    console.log(`\n📦 Testing: ${testProduct.name}`)
    console.log(`URL: ${testProduct.url}`)
    
    try {
      const scrapedProduct = await scraper.scrapeProduct(testProduct.url)
      
      if (scrapedProduct) {
        console.log('\n✅ Scraping successful:')
        console.log(`- Name: ${scrapedProduct.name}`)
        console.log(`- Main Price: CHF ${scrapedProduct.priceChf}`)
        console.log(`- Confidence: ${scrapedProduct.priceConfidence}`)
        
        if (scrapedProduct.allPrices && scrapedProduct.allPrices.length > 1) {
          console.log(`- All Prices Found: ${scrapedProduct.allPrices.map(p => `CHF ${p}`).join(', ')}`)
        }
        
        if (scrapedProduct.priceVariants) {
          console.log('- Price Variants:')
          scrapedProduct.priceVariants.forEach(v => {
            console.log(`  * ${v.size}: CHF ${v.price}`)
          })
        }

        // Validate against expected prices
        if (testProduct.expectedSinglePrice) {
          const isCorrect = Math.abs(scrapedProduct.priceChf - testProduct.expectedSinglePrice) < 0.1
          console.log(`\n🎯 Expected single unit price: CHF ${testProduct.expectedSinglePrice}`)
          console.log(`   Got: CHF ${scrapedProduct.priceChf} - ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`)
        }

        // Save to database
        await saveScrapedProductWithValidation(scrapedProduct)
        console.log('💾 Saved to database with validation data')
        
      } else {
        console.log('❌ Failed to scrape product')
      }
    } catch (error) {
      console.error('❌ Error:', error)
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Show statistics
  console.log('\n📊 Price Validation Statistics:')
  const stats = await getPriceValidationStats()
  console.log(`- Total Products: ${stats.total}`)
  console.log(`- High Confidence: ${stats.highConfidence} (${stats.percentageHighConfidence}%)`)
  console.log(`- Medium Confidence: ${stats.mediumConfidence} (${stats.percentageMediumConfidence}%)`)
  console.log(`- Low Confidence: ${stats.lowConfidence} (${stats.percentageLowConfidence}%)`)
  console.log(`- Needs Review: ${stats.needsReview}`)

  // Show products needing review
  const reviewProducts = await getProductsNeedingPriceReview()
  if (reviewProducts.length > 0) {
    console.log('\n⚠️  Products Needing Price Review:')
    reviewProducts.slice(0, 10).forEach(p => {
      console.log(`- ${p.name}: CHF ${p.priceChf || 'NO PRICE'} (${p.priceConfidence || 'NO CONFIDENCE'})`)
    })
    if (reviewProducts.length > 10) {
      console.log(`... and ${reviewProducts.length - 10} more`)
    }
  }

  await db.$disconnect()
}

// Run the test
testPriceValidation().catch(console.error)