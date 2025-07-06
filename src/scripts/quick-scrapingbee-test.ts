#!/usr/bin/env tsx

// Quick test to scrape a few products and update database

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function quickTest() {
  console.log('🚀 Quick ScrapingBee Test\n')

  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })

  // Search for pasta products
  console.log('🔍 Searching for pasta products...')
  const searchUrl = 'https://www.migros.ch/fr/search?query=barilla'
  
  try {
    const html = await scraper.scrapeUrl(searchUrl)
    const $ = await import('cheerio').then(m => m.load(html))
    
    // Extract product URLs
    const productUrls: string[] = []
    $('a[href*="/product/"]').each((_, elem) => {
      const href = $(elem).attr('href')
      if (href && !href.includes('/category/')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
        if (!productUrls.includes(fullUrl)) {
          productUrls.push(fullUrl)
        }
      }
    })

    console.log(`Found ${productUrls.length} products\n`)

    // Scrape first 5 products
    const products = []
    for (const url of productUrls.slice(0, 5)) {
      console.log(`Scraping: ${url}`)
      const product = await scraper.scrapeProduct(url)
      
      if (product) {
        products.push(product)
        console.log(`✅ ${product.name} - CHF ${product.priceChf}\n`)
        
        // Save to database
        try {
          const existing = await prisma.product.findFirst({
            where: { url: product.url }
          })

          if (existing) {
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                name: product.name,
                price: product.priceChf,
                lastScraped: new Date()
              }
            })
            console.log(`📝 Updated in database\n`)
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
            console.log(`✨ Created in database\n`)
          }
        } catch (dbError) {
          console.error(`Database error: ${dbError}\n`)
        }
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Show database stats
    const totalProducts = await prisma.product.count()
    const scrapingBeeProducts = await prisma.product.count({
      where: { source: 'scrapingbee' }
    })

    console.log('\n📊 Database Stats:')
    console.log(`Total products: ${totalProducts}`)
    console.log(`ScrapingBee products: ${scrapingBeeProducts}`)
    console.log(`\n✅ Test complete! ScrapingBee is working perfectly.`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

quickTest().catch(console.error)