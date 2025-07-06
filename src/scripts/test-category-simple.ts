#!/usr/bin/env tsx

// Simple test of category scraping with MigrosProduct model

import { ProxyScraper } from '../lib/proxy-scraper'
import { db } from '../lib/db'
import * as dotenv from 'dotenv'
import * as cheerio from 'cheerio'

dotenv.config({ path: '.env.local' })

async function testCategoryScraping() {
  console.log('🧪 Testing category scraping with real URLs\n')
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })
  
  // Test with pasta category
  const testUrl = 'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires'
  
  try {
    console.log(`📂 Scraping category: ${testUrl}\n`)
    
    // Scrape category page
    const html = await scraper.scrapeUrl(testUrl)
    console.log(`✅ Category page scraped (${html.length} chars)`)
    
    const $ = cheerio.load(html)
    
    // Find product URLs
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
    
    console.log(`\n📦 Found ${productUrls.length} product URLs`)
    console.log('First 5 URLs:')
    productUrls.slice(0, 5).forEach(url => console.log(`  - ${url}`))
    
    // Scrape first 3 products
    console.log('\n🔍 Scraping first 3 products...\n')
    
    for (let i = 0; i < Math.min(3, productUrls.length); i++) {
      const url = productUrls[i]
      console.log(`[${i + 1}/3] ${url}`)
      
      try {
        const product = await scraper.scrapeProduct(url)
        
        if (product) {
          console.log(`✅ ${product.name} - CHF ${product.priceChf}`)
          
          // Save to MigrosProduct table
          const existing = await db.migrosProduct.findFirst({
            where: { id: product.id }
          })
          
          if (existing) {
            await db.migrosProduct.update({
              where: { id: product.id },
              data: {
                name: product.name,
                brand: product.brand,
                priceChf: product.priceChf,
                url: product.url,
                imageUrl: product.imageUrl,
                category: 'pasta',
                lastUpdated: new Date()
              }
            })
            console.log(`   📝 Updated in database`)
          } else {
            await db.migrosProduct.create({
              data: {
                id: product.id,
                name: product.name,
                brand: product.brand,
                priceChf: product.priceChf,
                url: product.url,
                imageUrl: product.imageUrl,
                category: 'pasta',
                lastUpdated: new Date()
              }
            })
            console.log(`   ✨ Created in database`)
          }
        }
      } catch (error) {
        console.log(`❌ Error: ${error}`)
      }
      
      console.log('')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // Show database stats
    const totalProducts = await db.migrosProduct.count()
    const pastaProducts = await db.migrosProduct.count({
      where: { category: 'pasta' }
    })
    
    console.log('📊 Database Stats:')
    console.log(`Total products: ${totalProducts}`)
    console.log(`Pasta products: ${pastaProducts}`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testCategoryScraping().catch(console.error)