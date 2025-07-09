#!/usr/bin/env node

// Script to add missing essential products to the database

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// Essential products that are missing from the database
const ESSENTIAL_PRODUCTS = [
  {
    migrosId: 'manual-jambon-001',
    name: 'Jambon cuit',
    brand: 'M-Classic',
    priceChf: 4.50,
    unit: 'paquet 200g',
    category: 'meat',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-viandehachee-001',
    name: 'Viande hachée de bœuf',
    brand: 'M-Classic',
    priceChf: 9.80,
    unit: 'paquet 500g',
    category: 'meat',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-viandehachee-002',
    name: 'Viande hachée mixte',
    brand: 'M-Classic',
    priceChf: 8.50,
    unit: 'paquet 500g',
    category: 'meat',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-beurre-001',
    name: 'Beurre de cuisine',
    brand: 'M-Classic',
    priceChf: 3.95,
    unit: '200g',
    category: 'dairy',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-lait-001',
    name: 'Lait entier UHT',
    brand: 'M-Classic',
    priceChf: 1.65,
    unit: '1L',
    category: 'dairy',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-pommedetterre-001',
    name: 'Pommes de terre fermes',
    brand: 'Bio',
    priceChf: 3.95,
    unit: 'sac 2.5kg',
    category: 'vegetables',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-cotelettesporc-001',
    name: 'Côtelettes de porc',
    brand: 'IP-SUISSE',
    priceChf: 23.90,
    unit: 'env. 600g',
    category: 'meat',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-lieunoir-001',
    name: 'Filet de lieu noir',
    brand: 'M-Classic',
    priceChf: 19.80,
    unit: '400g',
    category: 'fish',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-pennes-001',
    name: 'Pennes',
    brand: 'M-Classic',
    priceChf: 2.20,
    unit: '500g',
    category: 'pasta',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-haricotsverts-001',
    name: 'Haricots verts',
    brand: 'M-Classic',
    priceChf: 4.95,
    unit: '500g',
    category: 'vegetables',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-haricotsrouges-001',
    name: 'Haricots rouges en boîte',
    brand: 'M-Classic',
    priceChf: 1.95,
    unit: '400g',
    category: 'pantry',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-bouillon-001',
    name: 'Bouillon de légumes',
    brand: 'M-Classic',
    priceChf: 2.50,
    unit: 'boîte 8 cubes',
    category: 'pantry',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-citron-001',
    name: 'Citrons',
    brand: '',
    priceChf: 0.70,
    unit: 'pièce',
    category: 'fruits',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-pain-001',
    name: 'Pain mi-blanc',
    brand: 'M-Classic',
    priceChf: 2.30,
    unit: '400g',
    category: 'bakery',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-cremefraiche-001',
    name: 'Crème fraîche',
    brand: 'M-Classic',
    priceChf: 2.50,
    unit: '200ml',
    category: 'dairy',
    source: 'fallback' as const
  },
  {
    migrosId: 'manual-gruyere-001',
    name: 'Gruyère râpé',
    brand: 'M-Classic',
    priceChf: 4.95,
    unit: '200g',
    category: 'dairy',
    source: 'fallback' as const
  }
]

async function addMissingProducts() {
  console.log('🔧 Adding missing essential products to database...')
  
  let added = 0
  let updated = 0
  
  for (const product of ESSENTIAL_PRODUCTS) {
    try {
      // Check if product exists
      const existing = await prisma.migrosProduct.findFirst({
        where: {
          OR: [
            { migrosId: product.migrosId },
            { 
              AND: [
                { name: product.name },
                { brand: product.brand }
              ]
            }
          ]
        }
      })
      
      if (existing) {
        // Update existing product
        await prisma.migrosProduct.update({
          where: { id: existing.id },
          data: {
            priceChf: product.priceChf,
            price: product.priceChf, // Legacy field
            unit: product.unit,
            category: product.category,
            source: product.source,
            lastScraped: new Date()
          }
        })
        updated++
        console.log(`✅ Updated: ${product.name}`)
      } else {
        // Create new product
        await prisma.migrosProduct.create({
          data: {
            id: product.migrosId, // Use migrosId as the primary id
            migrosId: product.migrosId,
            name: product.name,
            brand: product.brand || '',
            priceChf: product.priceChf,
            price: product.priceChf, // Legacy field
            unit: product.unit,
            category: product.category,
            source: product.source,
            lastScraped: new Date()
          }
        })
        added++
        console.log(`✅ Added: ${product.name}`)
      }
    } catch (error) {
      console.error(`❌ Error with ${product.name}:`, error)
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`Added: ${added} products`)
  console.log(`Updated: ${updated} products`)
  console.log(`Total: ${ESSENTIAL_PRODUCTS.length} products processed`)
}

// Run the script
addMissingProducts()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })