#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { ProxyScraper } from '../lib/proxy-scraper'
import { db } from '../lib/db'
import { migrosCategories } from '../config/migros-categories'
import * as cheerio from 'cheerio'

async function continueTestScraping() {
  console.log('🚀 Continuing Test Scraping\n')
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY!
  })
  
  const pastaCategory = migrosCategories.find(c => c.name === 'pasta-rice')!
  const limit = 10
  let totalScraped = 0
  let totalCredits = 0
  
  // Get already scraped products
  const existingProducts = await db.migrosProduct.findMany({
    where: { category: 'pasta-rice' },
    select: { id: true }
  })
  const existingIds = new Set(existingProducts.map(p => p.id))
  
  console.log(`📦 Already have ${existingIds.size} pasta products in database\n`)
  
  for (const categoryUrl of pastaCategory.urls) {
    console.log(`\n🔍 Scraping: ${categoryUrl}`)
    
    try {
      const html = await scraper.scrapeUrl(categoryUrl)
      totalCredits += 10
      
      const $ = cheerio.load(html)
      const productUrls: string[] = []
      
      $('a[href*="/product/"]').each((_, elem) => {
        const href = $(elem).attr('href')
        if (href && href.includes('/product/') && !href.includes('/category/')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
          
          // Extract ID to check if already scraped
          const idMatch = fullUrl.match(/\/product\/(\d+)/)
          const productId = idMatch ? idMatch[1] : null
          
          if (productId && !existingIds.has(productId) && !productUrls.includes(fullUrl)) {
            productUrls.push(fullUrl)
          }
        }
      })
      
      console.log(`Found ${productUrls.length} new products to scrape`)
      
      // Scrape only up to limit
      const toScrape = productUrls.slice(0, Math.max(0, limit - totalScraped))
      
      for (let i = 0; i < toScrape.length; i++) {
        const url = toScrape[i]
        console.log(`\n[${totalScraped + 1}/${limit}] ${url}`)
        
        try {
          const product = await scraper.scrapeProduct(url)
          totalCredits += 10
          
          if (product) {
            await db.migrosProduct.create({
              data: {
                id: product.id,
                name: product.name,
                brand: product.brand,
                priceChf: product.priceChf,
                url: product.url,
                imageUrl: product.imageUrl,
                category: 'pasta-rice',
                lastUpdated: new Date()
              }
            })
            totalScraped++
            console.log(`✨ Created: ${product.name} - CHF ${product.priceChf}`)
          }
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log(`⏭️  Skipping (already exists)`)
          } else {
            console.log(`❌ Error: ${error}`)
          }
        }
        
        if (totalScraped >= limit) break
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      if (totalScraped >= limit) break
    } catch (error) {
      console.error(`Failed to scrape category: ${error}`)
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST COMPLETE')
  console.log('='.repeat(50))
  console.log(`New products scraped: ${totalScraped}`)
  console.log(`API credits used: ${totalCredits}`)
  console.log(`Estimated cost: $${(totalCredits * 0.0003).toFixed(2)}`)
  
  const totalPasta = await db.migrosProduct.count({
    where: { category: 'pasta-rice' }
  })
  console.log(`\nTotal pasta products in database: ${totalPasta}`)
}

continueTestScraping().catch(console.error)