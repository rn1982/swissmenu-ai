#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'

async function checkPastaProducts() {
  console.log('\n📦 Checking pasta products in database...\n')
  
  const products = await db.migrosProduct.findMany({
    where: { category: 'pasta-rice' },
    orderBy: { lastUpdated: 'desc' },
    take: 20
  })
  
  console.log(`Found ${products.length} pasta products:\n`)
  
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`)
    console.log(`   Price: CHF ${p.priceChf || 'N/A'}`)
    console.log(`   URL: ${p.url || 'No URL'}`)
    console.log(`   Updated: ${p.lastUpdated.toLocaleString()}\n`)
  })
  
  // Summary stats
  const withPrices = products.filter(p => p.priceChf !== null)
  const withUrls = products.filter(p => p.url !== null)
  
  console.log('📊 Summary:')
  console.log(`Total products: ${products.length}`)
  console.log(`With prices: ${withPrices.length}`)
  console.log(`With URLs: ${withUrls.length}`)
}

checkPastaProducts().catch(console.error)