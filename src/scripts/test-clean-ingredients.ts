import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'
import { analyzeIngredient, findBestProductMatch } from '../lib/enhanced-product-matching'

async function testCleanIngredients() {
  console.log('🧪 TESTING CLEAN INGREDIENT MATCHING\n')

  // Simulate clean ingredients from AI ingredients_summary
  const cleanIngredients = [
    { name: 'spaghetti', quantity: '500g', category: 'pasta' },
    { name: 'pennes', quantity: '300g', category: 'pasta' },
    { name: 'viande hachée', quantity: '600g', category: 'meat' },
    { name: 'jambon', quantity: '200g', category: 'meat' },
    { name: 'gruyère râpé', quantity: '150g', category: 'dairy' },
    { name: 'haricots rouges', quantity: '400g', category: 'vegetables' },
    { name: 'tomates pelées', quantity: '800g', category: 'pantry' },
    { name: 'oignons', quantity: '4', category: 'vegetables' },
    { name: 'pain', quantity: '1', category: 'bakery' }
  ]

  console.log('📋 Clean ingredients to match:')
  cleanIngredients.forEach(ing => {
    console.log(`  - ${ing.quantity} de ${ing.name} (${ing.category})`)
  })

  console.log('\n🔍 Matching results:\n')

  for (const ingredient of cleanIngredients) {
    // Format as expected by analyzer
    const ingredientStr = `${ingredient.quantity} de ${ingredient.name}`
    
    // Analyze
    const analysis = analyzeIngredient(ingredientStr)
    
    // Find matches
    const matches = await findBestProductMatch(analysis, { preferScrapingBee: true })
    
    console.log(`\n📦 "${ingredient.name}" (${ingredient.quantity})`)
    console.log(`   Analysis: main="${analysis.mainIngredient}", category="${analysis.category}"`)
    
    if (matches.length > 0) {
      const best = matches[0]
      console.log(`   ✅ Match: "${best.name}"`)
      console.log(`      Price: CHF ${best.priceChf}`)
      console.log(`      Score: ${Math.round(best.matchScore * 100)}% (${best.confidence})`)
      console.log(`      Source: ${best.source}`)
      if (best.url) {
        console.log(`      URL: ${best.url}`)
      } else if (best.searchUrl) {
        console.log(`      Search: ${best.searchUrl}`)
      }
    } else {
      console.log(`   ❌ NO MATCH FOUND`)
      console.log(`   🔍 Search URL: https://www.migros.ch/fr/search?query=${encodeURIComponent(ingredient.name)}`)
    }
  }

  // Check database stats
  console.log('\n📊 DATABASE STATS:')
  const stats = await db.migrosProduct.groupBy({
    by: ['category'],
    _count: true
  })
  
  stats.forEach(stat => {
    console.log(`   ${stat.category || 'uncategorized'}: ${stat._count} products`)
  })

  await db.$disconnect()
}

testCleanIngredients().catch(console.error)