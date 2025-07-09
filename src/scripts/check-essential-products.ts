#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function checkEssentialProducts() {
  try {
    console.log('🔍 Checking for essential products in database...\n')
    
    // Check for viande hachée
    const viandehachee = await prisma.migrosProduct.findMany({
      where: {
        OR: [
          { name: { contains: 'viande hachée', mode: 'insensitive' } },
          { name: { contains: 'haché', mode: 'insensitive' } }
        ]
      }
    })
    
    console.log(`Found ${viandehachee.length} products for "viande hachée":`)
    viandehachee.forEach(p => {
      console.log(`- ${p.name} (${p.brand}) - CHF ${p.priceChf}`)
    })
    
    // Check for haricots rouges
    console.log('\n')
    const haricots = await prisma.migrosProduct.findMany({
      where: {
        OR: [
          { name: { contains: 'haricots rouges', mode: 'insensitive' } },
          { name: { contains: 'haricot rouge', mode: 'insensitive' } }
        ]
      }
    })
    
    console.log(`Found ${haricots.length} products for "haricots rouges":`)
    haricots.forEach(p => {
      console.log(`- ${p.name} (${p.brand}) - CHF ${p.priceChf}`)
    })
    
    // Check total products
    const total = await prisma.migrosProduct.count()
    console.log(`\n📊 Total products in database: ${total}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkEssentialProducts()