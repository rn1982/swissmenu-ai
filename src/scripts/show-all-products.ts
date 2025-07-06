import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function showAllProducts() {
  try {
    // Get all products grouped by category
    const products = await prisma.migrosProduct.findMany({
      orderBy: [
        { category: 'asc' },
        { source: 'desc' },
        { name: 'asc' }
      ]
    })
    
    console.log('\n📦 Complete Product Database\n')
    console.log('='.repeat(80))
    
    // Group by category
    const categories = {}
    products.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = []
      }
      categories[product.category].push(product)
    })
    
    // Display each category
    Object.entries(categories).forEach(([category, products]) => {
      console.log(`\n🏷️  ${category.toUpperCase()} (${products.length} products)`)
      console.log('-'.repeat(80))
      
      products.forEach(product => {
        const source = product.source === 'scrapingbee' ? '🐝' : '📦'
        const price = product.price ? `CHF ${product.price.toFixed(2)}` : 'N/A'
        const url = product.url ? '✓' : '✗'
        
        console.log(`${source} ${product.name.padEnd(50)} ${price.padStart(10)} URL:${url}`)
      })
    })
    
    // Summary
    const scrapingBeeCount = products.filter(p => p.source === 'scrapingbee').length
    const fallbackCount = products.filter(p => p.source === 'fallback').length
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY')
    console.log(`Total products: ${products.length}`)
    console.log(`🐝 ScrapingBee (real-time): ${scrapingBeeCount}`)
    console.log(`📦 Fallback (pre-loaded): ${fallbackCount}`)
    console.log('\n✅ The system is ready for testing with both real and fallback products!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

showAllProducts()