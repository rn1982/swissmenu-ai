#!/usr/bin/env node

// Quick script to populate essential Swiss products for testing

import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// Essential product URLs for testing (verified working)
const ESSENTIAL_PRODUCTS = [
  // Pasta
  { url: 'https://www.migros.ch/fr/product/104102000000', category: 'pasta' },  // M-Budget spaghetti
  { url: 'https://www.migros.ch/fr/product/104041100000', category: 'pasta' },  // M-Classic spaghetti
  { url: 'https://www.migros.ch/fr/product/104063100000', category: 'pasta' },  // Penne
  
  // Meat
  { url: 'https://www.migros.ch/fr/product/243996970000', category: 'meat' },   // Poulet miccata
  { url: 'https://www.migros.ch/fr/product/243998700000', category: 'meat' },   // Poulet cordonbleu
  { url: 'https://www.migros.ch/fr/product/231113800000', category: 'meat' },   // Viande hachée
  
  // Vegetables
  { url: 'https://www.migros.ch/fr/product/266003700000', category: 'vegetables' }, // Tomates
  { url: 'https://www.migros.ch/fr/product/263412500000', category: 'vegetables' }, // Salade
  { url: 'https://www.migros.ch/fr/product/262023500000', category: 'vegetables' }, // Carottes
  
  // Dairy
  { url: 'https://www.migros.ch/fr/product/250134600000', category: 'dairy' },  // Lait entier
  { url: 'https://www.migros.ch/fr/product/120003200000', category: 'dairy' },  // Gruyère
  { url: 'https://www.migros.ch/fr/product/175039000000', category: 'dairy' },  // Yogourt nature
  
  // Bakery
  { url: 'https://www.migros.ch/fr/product/114103100000', category: 'bakery' }, // Pain mi-blanc
  { url: 'https://www.migros.ch/fr/product/110103200000', category: 'bakery' }, // Croissant
  
  // Pantry
  { url: 'https://www.migros.ch/fr/product/141311300000', category: 'pantry' }, // Huile olive
  { url: 'https://www.migros.ch/fr/product/134501000000', category: 'pantry' }, // Sel
  { url: 'https://www.migros.ch/fr/product/130720100000', category: 'pantry' }, // Farine
]

async function scrapeEssentials() {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.error('❌ SCRAPINGBEE_API_KEY not found')
    return
  }

  console.log('🐝 Scraping essential products for testing...')
  console.log(`📊 Will scrape ${ESSENTIAL_PRODUCTS.length} products`)
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  let scraped = 0
  let saved = 0
  
  for (const item of ESSENTIAL_PRODUCTS) {
    try {
      console.log(`\n🔍 Scraping ${item.category} product...`)
      const product = await scraper.scrapeProduct(item.url)
      
      if (product) {
        console.log(`✓ ${product.name} - CHF ${product.priceChf}`)
        scraped++
        
        // Save to database
        const productId = product.id || `${item.category}-${Date.now()}`
        
        await prisma.migrosProduct.upsert({
          where: { id: productId },
          create: {
            id: productId,
            migrosId: product.id,
            name: product.name,
            brand: product.brand || 'N/A',
            price: product.priceChf,
            priceChf: product.priceChf,
            url: product.url,
            imageUrl: product.imageUrl || '',
            category: item.category,
            source: 'scrapingbee',
            lastScraped: new Date()
          },
          update: {
            price: product.priceChf,
            priceChf: product.priceChf,
            source: 'scrapingbee',
            lastScraped: new Date()
          }
        })
        saved++
      }
    } catch (error) {
      console.log(`✗ Failed to scrape ${item.category} product`)
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n✅ Essential products scraped!')
  console.log(`📊 Summary:`)
  console.log(`  - Scraped: ${scraped}/${ESSENTIAL_PRODUCTS.length}`)
  console.log(`  - Saved: ${saved}`)
  
  // Final database status
  const count = await prisma.migrosProduct.count({
    where: { source: 'scrapingbee' }
  })
  console.log(`\n📦 Total ScrapingBee products: ${count}`)
  
  await prisma.$disconnect()
}

scrapeEssentials().catch(console.error)