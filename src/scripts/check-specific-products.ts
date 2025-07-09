import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'

async function checkSpecificProducts() {
  const searches = [
    { name: 'spaghetti', category: 'pasta' },
    { name: 'pennes', category: 'pasta' },  
    { name: 'haricots rouges', category: 'vegetables' },
    { name: 'gruyère', category: 'dairy' },
    { name: 'râpé', category: 'dairy' }
  ]

  for (const search of searches) {
    console.log(`\n🔍 Searching for '${search.name}' in ${search.category}:`)
    const products = await db.migrosProduct.findMany({
      where: {
        OR: [
          { name: { contains: search.name, mode: 'insensitive' } },
          { ariaLabel: { contains: search.name, mode: 'insensitive' } }
        ]
      },
      take: 5
    })
    
    if (products.length === 0) {
      console.log('  ❌ No products found')
    } else {
      products.forEach(p => {
        console.log(`  - ${p.name} (CHF ${p.priceChf}) [${p.category}]`)
      })
    }
  }
  
  await db.$disconnect()
}

checkSpecificProducts().catch(console.error)