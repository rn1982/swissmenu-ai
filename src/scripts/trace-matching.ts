// Test script to trace ingredient-to-product matching issues
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'
import { analyzeIngredient, findBestProductMatch } from '../lib/enhanced-product-matching'

async function traceMatching() {
  console.log('🔍 TRACING INGREDIENT-TO-PRODUCT MATCHING\n')

  // Example ingredients from typical Swiss recipes
  const testIngredients = [
    // Specific problematic cases we need to test
    '400g de spaghetti',
    '250g de pennes',
    '1 boîte de haricots rouges',
    '100g de gruyère râpé',
    'pain pour croûtons',
    'croûtons',
    
    // Also test generic versions
    '200g de pâtes',
    '100g de fromage râpé',
    'haricots rouges',
    'gruyère',
    'pain'
  ]

  for (const ingredient of testIngredients) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📝 INGREDIENT: "${ingredient}"`)
    console.log('='.repeat(60))
    
    // Step 1: Analyze
    const analysis = analyzeIngredient(ingredient)
    console.log('\n1️⃣ ANALYSIS:')
    console.log(`   Original: "${analysis.original}"`)
    console.log(`   Cleaned: "${analysis.cleaned}"`)
    console.log(`   Main Ingredient: "${analysis.mainIngredient}"`)
    console.log(`   Category: "${analysis.category}"`)
    if (analysis.quantity) {
      console.log(`   Quantity: ${analysis.quantity} ${analysis.unit || '(no unit)'}`)
    }
    if (analysis.modifiers.length > 0) {
      console.log(`   Modifiers: ${analysis.modifiers.join(', ')}`)
    }
    
    // Step 2: Find matches
    const matches = await findBestProductMatch(analysis, { preferScrapingBee: true })
    
    console.log('\n2️⃣ PRODUCT MATCHES:')
    if (matches.length === 0) {
      console.log('   ❌ NO MATCHES FOUND')
      
      // Try to understand why no match
      console.log('\n   🔍 Debugging:')
      
      // Check if any products exist for this category
      const categoryProducts = await db.migrosProduct.findMany({
        where: { category: analysis.category },
        take: 3
      })
      
      if (categoryProducts.length > 0) {
        console.log(`   → Category "${analysis.category}" has ${categoryProducts.length} products:`)
        categoryProducts.forEach(p => {
          console.log(`     - ${p.name} (${p.brand || 'no brand'})`)
        })
      } else {
        console.log(`   → No products found in category "${analysis.category}"`)
      }
      
      // Check if searching for the main ingredient yields results
      const nameSearch = await db.migrosProduct.findMany({
        where: { 
          name: { 
            contains: analysis.mainIngredient, 
            mode: 'insensitive' 
          } 
        },
        take: 3
      })
      
      if (nameSearch.length > 0) {
        console.log(`   → Name search for "${analysis.mainIngredient}" found:`)
        nameSearch.forEach(p => {
          console.log(`     - ${p.name} (category: ${p.category})`)
        })
      } else {
        console.log(`   → No products contain "${analysis.mainIngredient}" in name`)
      }
      
    } else {
      // Show matches
      matches.forEach((match, idx) => {
        console.log(`\n   ${idx === 0 ? '✅' : '🔹'} Match ${idx + 1}:`)
        console.log(`      Product: "${match.name}"`)
        console.log(`      Brand: ${match.brand || 'no brand'}`)
        console.log(`      Price: CHF ${match.priceChf}`)
        console.log(`      Category: ${match.category}`)
        console.log(`      Score: ${Math.round(match.matchScore * 100)}% (${match.confidence})`)
        console.log(`      Reason: ${match.matchReason}`)
        console.log(`      Source: ${match.source}`)
        if (match.url) {
          console.log(`      URL: ${match.url}`)
        }
      })
    }
  }
  
  // Summary statistics
  console.log(`\n\n${'='.repeat(60)}`)
  console.log('📊 DATABASE STATISTICS:')
  console.log('='.repeat(60))
  
  const stats = await db.migrosProduct.groupBy({
    by: ['category'],
    _count: true
  })
  
  stats.forEach(stat => {
    console.log(`   ${stat.category || 'uncategorized'}: ${stat._count} products`)
  })
  
  const totalProducts = await db.migrosProduct.count()
  const scrapingBeeProducts = await db.migrosProduct.count({
    where: { source: 'scrapingbee' }
  })
  
  console.log(`\n   Total products: ${totalProducts}`)
  console.log(`   ScrapingBee products: ${scrapingBeeProducts}`)
  console.log(`   Fallback products: ${totalProducts - scrapingBeeProducts}`)
  
  await db.$disconnect()
}

traceMatching().catch(console.error)