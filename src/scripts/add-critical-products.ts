import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'

async function addCriticalProducts() {
  console.log('🚨 Adding critical missing products...\n')

  const criticalProducts = [
    // POISSON FRAIS
    {
      migrosId: 'lieu-noir-filet',
      name: 'Filet de lieu noir frais',
      brand: 'M-Classic',
      priceChf: 18.50,
      unit: 'kg',
      category: 'fish',
      ariaLabel: 'Filet de lieu noir frais',
      source: 'fallback' as const
    },
    {
      migrosId: 'colin-filet',
      name: 'Filet de colin',
      brand: 'M-Classic',
      priceChf: 16.90,
      unit: 'kg',
      category: 'fish',
      ariaLabel: 'Filet de colin frais',
      source: 'fallback' as const
    },
    
    // BEURRE
    {
      migrosId: 'beurre-doux',
      name: 'Beurre doux',
      brand: 'M-Classic',
      priceChf: 2.95,
      unit: '200g',
      category: 'dairy',
      ariaLabel: 'Beurre doux M-Classic',
      source: 'fallback' as const
    },
    {
      migrosId: 'beurre-table',
      name: 'Beurre de table',
      brand: 'M-Budget',
      priceChf: 2.20,
      unit: '200g',
      category: 'dairy',
      ariaLabel: 'Beurre de table',
      source: 'fallback' as const
    },
    
    // JAMBON
    {
      migrosId: 'jambon-blanc',
      name: 'Jambon blanc',
      brand: 'M-Classic',
      priceChf: 3.20,
      unit: '150g',
      category: 'meat',
      ariaLabel: 'Jambon blanc tranché',
      source: 'fallback' as const
    },
    {
      migrosId: 'jambon-cuit-tranche',
      name: 'Jambon cuit tranché',
      brand: 'M-Budget',
      priceChf: 2.50,
      unit: '150g',
      category: 'meat',
      ariaLabel: 'Jambon cuit tranché',
      source: 'fallback' as const
    },
    
    // FARINE
    {
      migrosId: 'farine-blanche',
      name: 'Farine blanche',
      brand: 'M-Classic',
      priceChf: 1.95,
      unit: '1kg',
      category: 'pantry',
      ariaLabel: 'Farine blanche type 55',
      source: 'fallback' as const
    },
    {
      migrosId: 'farine-tout-usage',
      name: 'Farine tout usage',
      brand: 'M-Budget',
      priceChf: 1.20,
      unit: '1kg',
      category: 'pantry',
      ariaLabel: 'Farine tout usage',
      source: 'fallback' as const
    },
    
    // PAIN
    {
      migrosId: 'pain-blanc',
      name: 'Pain blanc',
      brand: 'M-Classic',
      priceChf: 1.95,
      unit: '400g',
      category: 'bakery',
      ariaLabel: 'Pain blanc tranché',
      source: 'fallback' as const
    },
    {
      migrosId: 'baguette-tradition',
      name: 'Baguette tradition',
      brand: '',
      priceChf: 1.50,
      unit: '250g',
      category: 'bakery',
      ariaLabel: 'Baguette tradition française',
      source: 'fallback' as const
    },
    
    // GRUYÈRE RÂPÉ (correct one)
    {
      migrosId: 'gruyere-rape-classic',
      name: 'Gruyère AOP râpé',
      brand: 'M-Classic',
      priceChf: 5.90,
      unit: '200g',
      category: 'dairy',
      ariaLabel: 'Gruyère AOP râpé',
      source: 'fallback' as const
    }
  ]

  // Add products
  for (const product of criticalProducts) {
    try {
      // Check if product already exists
      const existing = await db.migrosProduct.findFirst({
        where: {
          OR: [
            { migrosId: product.migrosId },
            { name: product.name }
          ]
        }
      })
      
      if (existing) {
        console.log(`✓ Already exists: ${product.name}`)
      } else {
        await db.migrosProduct.create({
          data: {
            id: product.migrosId,
            ...product,
            lastUpdated: new Date()
          }
        })
        console.log(`✅ Added: ${product.name} - CHF ${product.priceChf}`)
      }
    } catch (error) {
      console.error(`❌ Failed to add ${product.name}:`, error)
    }
  }
  
  console.log('\n📊 Current database stats:')
  const stats = await db.migrosProduct.groupBy({
    by: ['category'],
    _count: true
  })
  
  stats.forEach(stat => {
    console.log(`   ${stat.category}: ${stat._count} products`)
  })
  
  await db.$disconnect()
}

addCriticalProducts().catch(console.error)