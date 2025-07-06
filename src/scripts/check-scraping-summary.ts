#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function main() {
  // Get overall stats
  const total = await prisma.migrosProduct.count()
  const scrapingBeeTotal = await prisma.migrosProduct.count({
    where: { source: 'scrapingbee' }
  })
  
  // Get category breakdown
  const categoryStats = await prisma.migrosProduct.groupBy({
    by: ['category'],
    _count: true,
    where: { source: 'scrapingbee' },
    orderBy: { _count: { category: 'desc' } }
  })
  
  // Get recent scrapes
  const recentProducts = await prisma.migrosProduct.findMany({
    where: { source: 'scrapingbee' },
    orderBy: { lastScraped: 'desc' },
    take: 10,
    select: {
      name: true,
      category: true,
      priceChf: true,
      lastScraped: true
    }
  })
  
  console.log('📊 SwissMenu AI - Scraping Summary')
  console.log('==================================')
  console.log(`\n📦 Total Products: ${total}`)
  console.log(`✅ Verified (ScrapingBee): ${scrapingBeeTotal}`)
  console.log(`📋 Fallback Products: ${total - scrapingBeeTotal}`)
  
  console.log('\n📂 Categories Scraped:')
  console.log('---------------------')
  categoryStats.forEach(stat => {
    console.log(`  ${stat.category}: ${stat._count} products`)
  })
  
  console.log('\n🕐 Recently Scraped (last 10):')
  console.log('-----------------------------')
  recentProducts.forEach(p => {
    const time = p.lastScraped ? new Date(p.lastScraped).toLocaleTimeString() : 'N/A'
    console.log(`  ${time} - ${p.name} (${p.category}) - CHF ${p.priceChf}`)
  })
  
  // Categories to track
  console.log('\n📌 Scraping Progress by Essential Categories:')
  console.log('-------------------------------------------')
  const essentialCategories = [
    'fish', 'herbs', 'pantry', 'rice', 'vegetables', 
    'fruits', 'bakery', 'nuts', 'meat', 'dairy'
  ]
  
  for (const cat of essentialCategories) {
    const count = await prisma.migrosProduct.count({
      where: { 
        category: cat,
        source: 'scrapingbee'
      }
    })
    const status = count > 10 ? '✅' : count > 5 ? '🟨' : '🟥'
    console.log(`  ${status} ${cat}: ${count} products`)
  }
  
  // Ingredients that have been searched
  console.log('\n🔍 Key Ingredients Covered:')
  console.log('-------------------------')
  const keyIngredients = [
    'saumon', 'basilic', 'huile olive', 'moutarde', 'quinoa',
    'courgette', 'citron', 'gingembre', 'épinards', 'pomme'
  ]
  
  for (const ingredient of keyIngredients) {
    const found = await prisma.migrosProduct.findFirst({
      where: {
        name: { contains: ingredient, mode: 'insensitive' },
        source: 'scrapingbee'
      }
    })
    console.log(`  ${found ? '✅' : '❌'} ${ingredient}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())