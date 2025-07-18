#!/usr/bin/env tsx

/**
 * Pre-scraping Check Script
 * 
 * Run this before starting the comprehensive scraper to:
 * - Check current database status
 * - Verify ScrapingBee API key
 * - Estimate credits needed
 * - Show missing essential products
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import axios from 'axios'

const prisma = new PrismaClient()

// Essential products we're looking for
const ESSENTIAL_PRODUCTS = {
  dairy: ['crème fraîche', 'mascarpone', 'ricotta', 'parmesan râpé', 'raclette', 'fondue'],
  pantry: ['levure', 'bicarbonate', 'pesto'],
  meat: ['lardons', 'jambon cuit', 'salami', 'cervelas', 'viande séchée'],
  swiss: ['rösti', 'spätzli', 'knöpfli', 'bircher muesli', 'aromat']
}

async function checkDatabaseStatus() {
  console.log('\n📊 DATABASE STATUS')
  console.log('==================')
  
  const totalProducts = await prisma.migrosProduct.count()
  console.log(`Total products: ${totalProducts}`)
  
  const withPrices = await prisma.migrosProduct.count({
    where: { priceChf: { not: null } }
  })
  console.log(`Products with prices: ${withPrices} (${((withPrices/totalProducts)*100).toFixed(1)}%)`)
  
  const withUrls = await prisma.migrosProduct.count({
    where: { url: { not: null } }
  })
  console.log(`Products with URLs: ${withUrls} (${((withUrls/totalProducts)*100).toFixed(1)}%)`)
  
  const scrapingBee = await prisma.migrosProduct.count({
    where: { source: 'scrapingbee' }
  })
  console.log(`ScrapingBee sourced: ${scrapingBee}`)
  
  // Category breakdown
  console.log('\n📦 PRODUCTS BY CATEGORY')
  console.log('======================')
  
  const categories = await prisma.migrosProduct.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } }
  })
  
  categories.forEach(cat => {
    console.log(`${(cat.category || 'uncategorized').padEnd(20)} ${cat._count}`)
  })
}

async function checkEssentialProducts() {
  console.log('\n🔍 ESSENTIAL PRODUCTS CHECK')
  console.log('===========================')
  
  for (const [category, products] of Object.entries(ESSENTIAL_PRODUCTS)) {
    console.log(`\n${category.toUpperCase()}:`)
    
    for (const productName of products) {
      const found = await prisma.migrosProduct.findMany({
        where: {
          name: {
            contains: productName,
            mode: 'insensitive'
          }
        }
      })
      
      if (found.length > 0) {
        console.log(`  ✅ ${productName} - ${found.length} variant(s) found`)
      } else {
        console.log(`  ❌ ${productName} - MISSING`)
      }
    }
  }
}

async function checkScrapingBeeCredits() {
  console.log('\n🐝 SCRAPINGBEE API CHECK')
  console.log('========================')
  
  if (!process.env.SCRAPINGBEE_API_KEY) {
    console.log('❌ SCRAPINGBEE_API_KEY not found in environment')
    return false
  }
  
  console.log('✅ API key found')
  
  // Test API with a simple request
  try {
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: 'https://httpbin.org/get'
      },
      timeout: 10000
    })
    
    console.log('✅ API key is valid and working')
    
    // Note: ScrapingBee doesn't provide a direct way to check remaining credits
    // You need to check this in their dashboard
    console.log('\n⚠️  Check your remaining credits at:')
    console.log('   https://app.scrapingbee.com/dashboard')
    
    return true
  } catch (error: any) {
    console.log('❌ API key validation failed:', error.response?.data || error.message)
    return false
  }
}

async function estimateCreditsNeeded() {
  console.log('\n💰 CREDIT ESTIMATION')
  console.log('====================')
  
  const missingCount = Object.values(ESSENTIAL_PRODUCTS)
    .reduce((sum, products) => sum + products.length, 0)
  
  console.log(`Essential product searches: ${missingCount}`)
  console.log(`Category pages to scrape: ~15`)
  console.log(`Target new products: ~570`)
  
  const searchCredits = missingCount * 10 // Category pages
  const productCredits = missingCount * 5 * 1 // ~5 products per search
  const categoryCredits = 15 * 10 // Category pages
  const categoryProductCredits = 15 * 30 * 1 // ~30 products per category
  
  const totalCredits = searchCredits + productCredits + categoryCredits + categoryProductCredits
  
  console.log('\nEstimated credits:')
  console.log(`  Search pages: ${searchCredits}`)
  console.log(`  Product pages: ${productCredits + categoryProductCredits}`)
  console.log(`  TOTAL: ~${totalCredits} credits`)
  
  console.log('\n📌 Note: The scraper is configured to use max 600 credits')
}

async function main() {
  console.log('🚀 PRE-SCRAPING CHECK FOR SWISSMENU AI')
  console.log('======================================')
  
  try {
    await checkDatabaseStatus()
    await checkEssentialProducts()
    const apiValid = await checkScrapingBeeCredits()
    await estimateCreditsNeeded()
    
    console.log('\n📋 RECOMMENDATIONS')
    console.log('==================')
    
    if (!apiValid) {
      console.log('❌ Fix API key issues before proceeding')
    } else {
      console.log('✅ API key is valid')
    }
    
    const totalProducts = await prisma.migrosProduct.count()
    if (totalProducts < 100) {
      console.log('⚠️  Database has very few products - full scraping recommended')
    } else if (totalProducts < 500) {
      console.log('📈 Database could benefit from expansion')
    } else {
      console.log('✅ Database has good product coverage')
    }
    
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Check ScrapingBee credits at dashboard')
    console.log('2. Run test mode first: npm run scrape:priority:test')
    console.log('3. If successful, run full: npm run scrape:priority')
    console.log('4. Monitor progress in logs/ directory')
    
  } catch (error) {
    console.error('Error during check:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch(console.error)
}