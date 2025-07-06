import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function checkScrapingBeeProducts() {
  try {
    // Count products by source
    const scrapingBeeCount = await prisma.migrosProduct.count({
      where: { source: 'scrapingbee' }
    })
    
    const fallbackCount = await prisma.migrosProduct.count({
      where: { source: 'fallback' }
    })
    
    const totalCount = await prisma.migrosProduct.count()
    
    console.log('\n📊 Product Database Status:')
    console.log(`Total products: ${totalCount}`)
    console.log(`ScrapingBee products: ${scrapingBeeCount}`)
    console.log(`Fallback products: ${fallbackCount}`)
    
    // Show recent ScrapingBee products
    const recentProducts = await prisma.migrosProduct.findMany({
      where: { source: 'scrapingbee' },
      orderBy: { lastScraped: 'desc' },
      take: 10
    })
    
    if (recentProducts.length > 0) {
      console.log('\n🔍 Recent ScrapingBee Products:')
      recentProducts.forEach(product => {
        console.log(`- ${product.name} (${product.brand}) - CHF ${product.price}`)
      })
    }
    
    // Check categories
    const categories = await prisma.migrosProduct.groupBy({
      by: ['category'],
      where: { source: 'scrapingbee' },
      _count: true
    })
    
    if (categories.length > 0) {
      console.log('\n📦 Categories with ScrapingBee products:')
      categories.forEach(cat => {
        console.log(`- ${cat.category}: ${cat._count} products`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkScrapingBeeProducts()