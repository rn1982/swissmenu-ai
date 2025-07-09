#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'

async function analyzeCategoriesAndGaps() {
  // Get category distribution
  const categories = await db.migrosProduct.groupBy({
    by: ['category'],
    _count: true,
    orderBy: {
      _count: {
        category: 'desc'
      }
    }
  })
  
  console.log('📊 Current Category Distribution:')
  console.log('================================')
  categories.forEach(cat => {
    console.log(`${(cat.category || 'uncategorized').padEnd(15)} ${cat._count} products`)
  })
  
  // Analyze product names to identify common ingredients
  const products = await db.migrosProduct.findMany({
    select: { name: true, category: true }
  })
  
  // Common Swiss cooking ingredients we should have
  const essentialIngredients = {
    pantry: ['huile', 'vinaigre', 'sucre', 'levure', 'bicarbonate', 'cornichons', 'moutarde', 'mayonnaise', 'ketchup', 'bouillon', 'sauce soja', 'sauce tomate', 'pesto'],
    dairy: ['crème fraîche', 'mascarpone', 'ricotta', 'mozzarella', 'parmesan', 'raclette', 'fondue', 'crème à café'],
    meat: ['lardons', 'jambon', 'salami', 'saucisse', 'cervelas', 'viande séchée', 'poulet entier', 'escalope', 'rôti'],
    fish: ['saumon', 'thon', 'crevettes', 'cabillaud', 'truite', 'filet de perche'],
    vegetables: ['ail', 'gingembre', 'céleri', 'poireau', 'courgette', 'aubergine', 'poivron', 'champignon', 'épinards'],
    bakery: ['pain complet', 'pain blanc', 'baguette', 'croissant', 'tresse', 'pain de seigle'],
    condiments: ['herbes de provence', 'thym', 'romarin', 'basilic', 'persil', 'ciboulette', 'laurier', 'curry', 'paprika', 'cumin'],
    grains: ['quinoa', 'boulgour', 'couscous', 'polenta', 'avoine', 'orge', 'lentilles', 'haricots', 'pois chiches'],
    sauces: ['sauce hollandaise', 'sauce béarnaise', 'fond de veau', 'sauce worcestershire', 'tabasco'],
    swiss: ['rösti', 'spätzli', 'knöpfli', 'bircher muesli', 'aromat', 'sbrinz', 'appenzeller', 'tilsiter']
  }
  
  console.log('\n🔍 Missing Essential Ingredients by Category:')
  console.log('============================================')
  
  for (const [category, items] of Object.entries(essentialIngredients)) {
    const categoryProducts = products.filter(p => p.category === category || 
      (category === 'condiments' && p.category === 'herbs') ||
      (category === 'grains' && (p.category === 'rice' || p.category === 'pasta-rice')) ||
      (category === 'sauces' && p.category === 'pantry') ||
      (category === 'swiss' && (p.category === 'dairy' || p.category === 'pantry'))
    )
    
    const missing = items.filter(ingredient => 
      !categoryProducts.some(p => p.name.toLowerCase().includes(ingredient.toLowerCase()))
    )
    
    if (missing.length > 0) {
      console.log(`\n${category.toUpperCase()}:`)
      missing.forEach(item => console.log(`  - ${item}`))
    }
  }
  
  console.log('\n📈 Priority Categories for Expansion:')
  console.log('====================================')
  const priorityCategories = categories
    .filter(cat => cat._count < 30)
    .map(cat => ({ name: cat.category || 'uncategorized', count: cat._count }))
  
  priorityCategories.forEach(cat => {
    console.log(`  ${cat.name}: Only ${cat.count} products (target: 30+)`)
  })
}

analyzeCategoriesAndGaps().catch(console.error)