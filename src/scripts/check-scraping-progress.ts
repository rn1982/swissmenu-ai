#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'

async function checkProgress() {
  console.log('\n📊 Scraping Progress Report\n')
  
  // Get all categories
  const categories = await db.migrosProduct.groupBy({
    by: ['category'],
    _count: true,
    orderBy: {
      _count: {
        category: 'desc'
      }
    }
  })
  
  console.log('Products by category:')
  let total = 0
  categories.forEach(cat => {
    const count = cat._count
    console.log(`  ${cat.category || 'uncategorized'}: ${count} products`)
    total += count
  })
  
  console.log(`\nTotal products: ${total}`)
  
  // Get recent products
  console.log('\n🕐 Recently scraped (last 10):')
  const recent = await db.migrosProduct.findMany({
    orderBy: { lastUpdated: 'desc' },
    take: 10,
    select: {
      name: true,
      priceChf: true,
      category: true,
      lastUpdated: true
    }
  })
  
  recent.forEach(p => {
    const time = p.lastUpdated.toLocaleTimeString()
    console.log(`  [${time}] ${p.name} - CHF ${p.priceChf}`)
  })
  
  // Check URL coverage
  const withUrls = await db.migrosProduct.count({
    where: { url: { not: null } }
  })
  
  const withPrices = await db.migrosProduct.count({
    where: { priceChf: { not: null } }
  })
  
  console.log('\n📈 Data quality:')
  console.log(`  Products with URLs: ${withUrls}/${total} (${Math.round(withUrls/total*100)}%)`)
  console.log(`  Products with prices: ${withPrices}/${total} (${Math.round(withPrices/total*100)}%)`)
  
  // Estimate completion
  console.log('\n⏱️  Test estimation:')
  console.log('  Target: 3 pasta URLs × 10 products = 30 products')
  console.log(`  Progress: ${recent.filter(p => p.category === 'pasta-rice').length}/10 from current run`)
}

checkProgress().catch(console.error)