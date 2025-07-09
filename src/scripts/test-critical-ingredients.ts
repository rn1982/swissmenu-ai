import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'
import { analyzeIngredient, findBestProductMatch } from '../lib/enhanced-product-matching'

async function testCriticalIngredients() {
  console.log('🔍 TESTING CRITICAL INGREDIENTS MATCHING\n')

  // Test the problematic ingredients
  const criticalIngredients = [
    '600g filet de lieu noir',
    'Beurre',
    '200g jambon',
    'Farine',
    'Pain pour croûtons',
    '200g gruyère râpé'
  ]

  for (const ingredient of criticalIngredients) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`📝 Ingredient: "${ingredient}"`)
    console.log('='.repeat(50))
    
    const analysis = analyzeIngredient(ingredient)
    console.log(`Analysis: main="${analysis.mainIngredient}", category="${analysis.category}"`)
    
    const matches = await findBestProductMatch(analysis, { preferScrapingBee: true })
    
    if (matches.length > 0) {
      const best = matches[0]
      console.log(`\n✅ Best match: "${best.name}"`)
      console.log(`   Brand: ${best.brand || 'N/A'}`)
      console.log(`   Price: CHF ${best.priceChf}`)
      console.log(`   Score: ${Math.round(best.matchScore * 100)}% (${best.confidence})`)
      console.log(`   Source: ${best.source}`)
      
      // Show top 3 matches to understand alternatives
      if (matches.length > 1) {
        console.log('\nOther matches:')
        matches.slice(1, 3).forEach((m, i) => {
          console.log(`   ${i + 2}. "${m.name}" - CHF ${m.priceChf} (${Math.round(m.matchScore * 100)}%)`)
        })
      }
    } else {
      console.log(`\n❌ NO MATCH FOUND`)
    }
  }
  
  await db.$disconnect()
}

testCriticalIngredients().catch(console.error)