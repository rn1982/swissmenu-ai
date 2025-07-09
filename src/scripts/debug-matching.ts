import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'
import { analyzeIngredient, findBestProductMatch } from '../lib/enhanced-product-matching'

async function debugMatching() {
  const testCases = [
    '500g de spaghetti',
    '300g de pennes', 
    '150g de gruyère râpé',
    '400g de haricots rouges'
  ]

  for (const test of testCases) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🔍 Testing: "${test}"`)
    console.log('='.repeat(60))
    
    const analysis = analyzeIngredient(test)
    console.log('\n📝 Analysis:')
    console.log(`  Original: "${analysis.original}"`)
    console.log(`  Cleaned: "${analysis.cleaned}"`)
    console.log(`  Main Ingredient: "${analysis.mainIngredient}"`)
    console.log(`  Category: "${analysis.category}"`)
    
    // Try to find what the algorithm is searching for
    const searchTerms = [analysis.mainIngredient, analysis.cleaned]
    console.log(`\n🔎 Search terms: ${searchTerms.join(', ')}`)
    
    // Manual search to see what's available
    console.log('\n📦 Direct database search:')
    for (const term of searchTerms) {
      const products = await db.migrosProduct.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { ariaLabel: { contains: term, mode: 'insensitive' } }
          ]
        },
        take: 3
      })
      
      if (products.length > 0) {
        console.log(`  Term "${term}" found ${products.length} products:`)
        products.forEach(p => {
          console.log(`    - ${p.name} (${p.category})`)
        })
      }
    }
    
    // Now see what the algorithm returns
    const matches = await findBestProductMatch(analysis, { preferScrapingBee: true })
    console.log(`\n🎯 Algorithm returned ${matches.length} matches`)
    if (matches.length > 0) {
      console.log(`  Best match: "${matches[0].name}" (score: ${Math.round(matches[0].matchScore * 100)}%)`)
    }
  }
  
  await db.$disconnect()
}

debugMatching().catch(console.error)