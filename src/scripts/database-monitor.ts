#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'

async function monitorDatabase() {
  console.log('\n🚀 SwissMenu AI - Database Monitor')
  console.log('==================================')
  console.log(`📅 Report generated: ${new Date().toLocaleString('fr-CH')}`)
  
  // Overall stats
  const totalProducts = await db.migrosProduct.count()
  const productsWithUrls = await db.migrosProduct.count({ where: { url: { not: null } } })
  const productsWithPrices = await db.migrosProduct.count({ where: { priceChf: { not: null } } })
  const recentlyScraped = await db.migrosProduct.count({ 
    where: { 
      lastScraped: { 
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      } 
    } 
  })
  
  console.log('\n📊 Overall Statistics:')
  console.log('---------------------')
  console.log(`Total products: ${totalProducts}`)
  console.log(`Products with URLs: ${productsWithUrls} (${Math.round(productsWithUrls/totalProducts*100)}%)`)
  console.log(`Products with prices: ${productsWithPrices} (${Math.round(productsWithPrices/totalProducts*100)}%)`)
  console.log(`Recently scraped (<7 days): ${recentlyScraped} (${Math.round(recentlyScraped/totalProducts*100)}%)`)
  
  // Category breakdown
  const categories = await db.migrosProduct.groupBy({
    by: ['category'],
    _count: true,
    _avg: { priceChf: true },
    orderBy: { _count: { category: 'desc' } }
  })
  
  console.log('\n📦 Products by Category:')
  console.log('------------------------')
  console.log('Category'.padEnd(15) + 'Count'.padEnd(8) + 'Avg Price CHF')
  console.log('-'.repeat(40))
  
  categories.forEach(cat => {
    const avgPrice = cat._avg.priceChf ? cat._avg.priceChf.toFixed(2) : 'N/A'
    console.log(
      `${(cat.category || 'uncategorized').padEnd(15)}${cat._count.toString().padEnd(8)}${avgPrice}`
    )
  })
  
  // Source distribution
  const sources = await db.migrosProduct.groupBy({
    by: ['source'],
    _count: true
  })
  
  console.log('\n🌐 Products by Source:')
  console.log('----------------------')
  sources.forEach(src => {
    console.log(`${(src.source || 'unknown').padEnd(20)} ${src._count} products`)
  })
  
  // Recent activity
  console.log('\n⏱️  Recent Activity:')
  console.log('-------------------')
  
  const recentProducts = await db.migrosProduct.findMany({
    orderBy: { lastUpdated: 'desc' },
    take: 10,
    select: {
      name: true,
      category: true,
      priceChf: true,
      lastUpdated: true,
      source: true
    }
  })
  
  recentProducts.forEach(p => {
    const time = p.lastUpdated.toLocaleString('fr-CH')
    console.log(`[${time}] ${p.name} (${p.category}) - CHF ${p.priceChf || '?'} via ${p.source}`)
  })
  
  // Quality metrics
  console.log('\n🎯 Data Quality Metrics:')
  console.log('------------------------')
  
  const missingPrices = await db.migrosProduct.count({ where: { priceChf: null } })
  const missingUrls = await db.migrosProduct.count({ where: { url: null } })
  const missingBrands = await db.migrosProduct.count({ where: { brand: null } })
  const outdated = await db.migrosProduct.count({
    where: {
      lastScraped: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
      }
    }
  })
  
  console.log(`Missing prices: ${missingPrices} products`)
  console.log(`Missing URLs: ${missingUrls} products`)
  console.log(`Missing brands: ${missingBrands} products`)
  console.log(`Outdated (>7 days): ${outdated} products`)
  
  // Priority recommendations
  console.log('\n🎯 Priority Recommendations:')
  console.log('---------------------------')
  
  const lowCategories = categories.filter(c => c._count < 30)
  if (lowCategories.length > 0) {
    console.log('\n1. Categories needing expansion (< 30 products):')
    lowCategories.forEach(cat => {
      console.log(`   - ${cat.category}: Only ${cat._count} products`)
    })
  }
  
  if (outdated > 50) {
    console.log(`\n2. Update outdated products: ${outdated} products haven't been scraped in 7+ days`)
  }
  
  if (missingPrices > 20) {
    console.log(`\n3. Fix missing prices: ${missingPrices} products have no price information`)
  }
  
  // Essential ingredients check
  const essentialChecks = [
    { name: 'Crème fraîche', category: 'dairy' },
    { name: 'Pesto', category: 'pantry' },
    { name: 'Lardons', category: 'meat' },
    { name: 'Levure', category: 'pantry' },
    { name: 'Rösti', category: 'pantry' }
  ]
  
  console.log('\n🔍 Essential Ingredients Check:')
  console.log('-------------------------------')
  
  for (const check of essentialChecks) {
    const found = await db.migrosProduct.count({
      where: {
        name: { contains: check.name, mode: 'insensitive' },
        category: check.category
      }
    })
    
    console.log(`${check.name}: ${found > 0 ? '✅ Found' : '❌ Missing'}`)
  }
  
  console.log('\n✅ Monitor complete!\n')
}

monitorDatabase().catch(console.error).finally(() => db.$disconnect())