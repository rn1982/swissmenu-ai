#!/usr/bin/env tsx

// Test ScrapingBee with a single known product

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function testSingleProduct() {
  console.log('🧪 Testing ScrapingBee with single product\n')

  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })

  // Test with known working Barilla product
  const testUrl = 'https://www.migros.ch/fr/product/mo/11790'
  
  try {
    console.log(`📦 Scraping: ${testUrl}`)
    const product = await scraper.scrapeProduct(testUrl)
    
    if (product) {
      console.log('\n✅ Successfully scraped:')
      console.log(`Name: ${product.name}`)
      console.log(`Price: CHF ${product.priceChf}`)
      console.log(`ID: ${product.id}`)
      console.log(`URL: ${product.url}`)
      
      // Save to database
      console.log('\n💾 Saving to database...')
      
      const existing = await prisma.product.findFirst({
        where: { url: product.url }
      })

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            price: product.priceChf,
            source: 'scrapingbee',
            lastScraped: new Date()
          }
        })
        console.log('📝 Updated existing product')
      } else {
        await prisma.product.create({
          data: {
            migrosId: product.id,
            name: product.name,
            brand: product.brand,
            price: product.priceChf,
            url: product.url,
            category: 'pasta',
            source: 'scrapingbee',
            lastScraped: new Date()
          }
        })
        console.log('✨ Created new product')
      }
      
      // Check database
      const dbProduct = await prisma.product.findFirst({
        where: { url: product.url }
      })
      
      console.log('\n🎉 Success! Product in database:')
      console.log(`- ${dbProduct?.name}`)
      console.log(`- CHF ${dbProduct?.price}`)
      console.log(`- Source: ${dbProduct?.source}`)
      
    } else {
      console.log('❌ Failed to scrape product')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSingleProduct().catch(console.error)