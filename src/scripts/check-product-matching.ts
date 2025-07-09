import { db } from '../lib/db'

async function checkProductMatching() {
  // Get sample products from each category
  const categories = ['pasta', 'meat', 'vegetables', 'dairy', 'pantry']
  console.log('📦 SAMPLE PRODUCTS IN DATABASE:\n')

  for (const category of categories) {
    const products = await db.migrosProduct.findMany({
      where: { category },
      take: 5,
      orderBy: { name: 'asc' }
    })
    
    console.log(`\n🏷️  ${category.toUpperCase()} (${products.length} samples):`)
    products.forEach(p => {
      console.log(`  - ${p.name} ${p.brand ? '(' + p.brand + ')' : ''} - CHF ${p.priceChf}`)
    })
  }

  // Get total counts
  const totals = await db.migrosProduct.groupBy({
    by: ['category'],
    _count: true
  })

  console.log('\n📊 TOTAL PRODUCTS BY CATEGORY:')
  totals.forEach(t => {
    console.log(`  ${t.category || 'uncategorized'}: ${t._count} products`)
  })

  // Test some common ingredient matching scenarios
  console.log('\n🔬 TESTING INGREDIENT MATCHING:\n')
  
  const testIngredients = [
    '200g de pâtes',
    '4 tomates fraîches',
    '500g de bœuf haché',
    '2 oignons',
    '3 gousses d\'ail',
    '200ml de crème fraîche',
    '100g de fromage râpé',
    '1 litre de lait',
    '6 œufs',
    'huile d\'olive'
  ]

  const { analyzeIngredient, findBestProductMatch } = await import('../lib/enhanced-product-matching')

  for (const ingredient of testIngredients) {
    const analysis = analyzeIngredient(ingredient)
    const matches = await findBestProductMatch(analysis, { preferScrapingBee: true })
    
    console.log(`\n📝 "${ingredient}"`)
    console.log(`   → Main: "${analysis.mainIngredient}" (${analysis.category})`)
    
    if (matches.length > 0) {
      const best = matches[0]
      console.log(`   ✅ Match: "${best.name}" - CHF ${best.priceChf}`)
      console.log(`      Score: ${Math.round(best.matchScore * 100)}% (${best.confidence})`)
      console.log(`      Reason: ${best.matchReason}`)
    } else {
      console.log(`   ❌ NO MATCH FOUND`)
    }
  }

  await db.$disconnect()
}

checkProductMatching().catch(console.error)