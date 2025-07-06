import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function testScrapingBee() {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found')
    return
  }

  console.log('🐝 Testing ScrapingBee with single product...')
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  try {
    // Test with a specific product URL
    const testUrl = 'https://www.migros.ch/fr/product/104075600000'
    console.log(`\n🔍 Scraping: ${testUrl}`)
    
    const product = await scraper.scrapeProduct(testUrl)
    
    if (product) {
      console.log('\n✅ Successfully scraped:')
      console.log(`Name: ${product.name}`)
      console.log(`Brand: ${product.brand}`)
      console.log(`Price: CHF ${product.priceChf}`)
      console.log(`URL: ${product.url}`)
      
      // Save to database
      console.log('\n💾 Saving to database...')
      
      const productId = product.id || `scrapingbee-${Date.now()}`
      
      const saved = await prisma.migrosProduct.upsert({
        where: { 
          id: productId
        },
        create: {
          id: productId,
          migrosId: product.id,
          name: product.name,
          brand: product.brand || 'N/A',
          price: product.priceChf,
          priceChf: product.priceChf,
          url: product.url,
          imageUrl: product.imageUrl || '',
          category: 'pasta',
          source: 'scrapingbee',
          lastScraped: new Date()
        },
        update: {
          name: product.name,
          brand: product.brand || 'N/A',
          price: product.priceChf,
          priceChf: product.priceChf,
          url: product.url,
          imageUrl: product.imageUrl || '',
          source: 'scrapingbee',
          lastScraped: new Date()
        }
      })
      
      console.log('✅ Saved to database with ID:', saved.id)
      
      // Check total count
      const count = await prisma.migrosProduct.count({
        where: { source: 'scrapingbee' }
      })
      console.log(`\n📊 Total ScrapingBee products: ${count}`)
      
    } else {
      console.log('❌ Failed to scrape product')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testScrapingBee()