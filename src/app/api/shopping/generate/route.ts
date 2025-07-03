import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface Meal {
  nom: string
  ingredients: string[]
  cout_estime_chf: number
}

interface DayMenu {
  petit_dejeuner?: Meal
  dejeuner?: Meal
  diner?: Meal
}

interface MenuData {
  weekMenu: {
    lundi: DayMenu
    mardi: DayMenu
    mercredi: DayMenu
    jeudi: DayMenu
    vendredi: DayMenu
    samedi: DayMenu
    dimanche: DayMenu
  }
  resume: {
    cout_total_estime_chf: number
    nombre_repas: number
    cout_moyen_par_repas_chf: number
    ingredients_principaux: string[]
    conseils_achat: string
  }
}

interface ShoppingItem {
  id: string
  name: string
  brand?: string
  priceChf: number
  unit: string
  category: string
  url?: string
  imageUrl?: string
  quantity: number
  totalPrice: number
  matchedIngredients: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { menuData, peopleCount = 4 } = body as { 
      menuData: MenuData
      peopleCount?: number 
    }

    if (!menuData || !menuData.weekMenu) {
      return NextResponse.json(
        { error: 'Menu data is required' },
        { status: 400 }
      )
    }

    console.log('🛒 Generating shopping list from menu...')

    // Step 1: Extract all ingredients from the menu
    const allIngredients = extractIngredientsFromMenu(menuData)
    console.log(`📋 Extracted ${allIngredients.length} unique ingredients`)

    // Step 2: Match ingredients to products in our database
    const matchedProducts = await matchIngredientsToProducts(allIngredients, peopleCount)
    console.log(`🎯 Matched ${matchedProducts.length} products`)

    // Step 3: Group products by category for organized shopping
    const categorizedItems = categorizeShoppingItems(matchedProducts)

    // Step 4: Calculate totals
    const totalCost = matchedProducts.reduce((sum, item) => sum + item.totalPrice, 0)
    const totalItems = matchedProducts.length

    // Step 5: Create shopping list
    const shoppingList = {
      id: `shopping-${Date.now()}`,
      menuId: body.menuId || 'generated-menu',
      createdAt: new Date().toISOString(),
      peopleCount,
      categories: categorizedItems,
      summary: {
        totalItems,
        totalCost: Math.round(totalCost * 100) / 100,
        averageItemCost: Math.round((totalCost / Math.max(totalItems, 1)) * 100) / 100,
        estimatedBudget: menuData.resume.cout_total_estime_chf || totalCost,
        actualCost: totalCost,
        savings: Math.max(0, (menuData.resume.cout_total_estime_chf || totalCost) - totalCost)
      },
      unmatched: allIngredients.filter(ingredient => 
        !matchedProducts.some(product => 
          product.matchedIngredients.includes(ingredient)
        )
      )
    }

    console.log(`✅ Generated shopping list: ${totalItems} items, CHF ${totalCost.toFixed(2)}`)

    return NextResponse.json({
      success: true,
      shoppingList
    })

  } catch (error) {
    console.error('❌ Shopping list generation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Shopping list generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function extractIngredientsFromMenu(menuData: MenuData): string[] {
  const ingredients = new Set<string>()

  // Extract from each day's meals
  Object.values(menuData.weekMenu).forEach(dayMenu => {
    Object.values(dayMenu).forEach(meal => {
      if (meal && meal.ingredients) {
        meal.ingredients.forEach(ingredient => {
          // Clean and normalize ingredient names
          const cleaned = ingredient.toLowerCase().trim()
          if (cleaned.length > 2) {
            ingredients.add(cleaned)
          }
        })
      }
    })
  })

  // Also include main ingredients from resume
  if (menuData.resume.ingredients_principaux) {
    menuData.resume.ingredients_principaux.forEach(ingredient => {
      const cleaned = ingredient.toLowerCase().trim()
      if (cleaned.length > 2) {
        ingredients.add(cleaned)
      }
    })
  }

  return Array.from(ingredients)
}

async function matchIngredientsToProducts(ingredients: string[], peopleCount: number): Promise<ShoppingItem[]> {
  const matchedProducts: ShoppingItem[] = []

  for (const ingredient of ingredients) {
    try {
      // Search for products matching this ingredient
      const products = await db.migrosProduct.findMany({
        where: {
          OR: [
            {
              name: {
                contains: ingredient,
                mode: 'insensitive'
              }
            },
            {
              category: {
                contains: ingredient,
                mode: 'insensitive'
              }
            }
          ]
        },
        take: 3 // Get top 3 matches
      })

      if (products.length > 0) {
        // Take the best match (first result)
        const product = products[0]
        
        // Calculate quantity based on people count and typical usage
        const quantity = calculateQuantity(ingredient, peopleCount)
        
        const shoppingItem: ShoppingItem = {
          id: product.id,
          name: product.name,
          brand: product.brand || undefined,
          priceChf: product.priceChf || 0,
          unit: product.unit || '',
          category: product.category || 'autres',
          url: product.url || undefined,
          imageUrl: product.imageUrl || undefined,
          quantity,
          totalPrice: Math.round((product.priceChf || 0) * quantity * 100) / 100,
          matchedIngredients: [ingredient]
        }

        matchedProducts.push(shoppingItem)
        console.log(`✅ Matched "${ingredient}" → ${product.name} (${shoppingItem.quantity}x)`)
      } else {
        console.log(`❌ No match found for "${ingredient}"`)
      }
    } catch (error) {
      console.error(`Error matching ingredient "${ingredient}":`, error)
    }
  }

  return matchedProducts
}

function calculateQuantity(ingredient: string, peopleCount: number): number {
  // Smart quantity calculation based on ingredient type and people count
  const baseQuantity = Math.max(1, Math.ceil(peopleCount / 4)) // Scale from family of 4
  
  // Adjust based on ingredient type
  if (ingredient.includes('pâtes') || ingredient.includes('riz')) {
    return baseQuantity // 1 package per 4 people
  } else if (ingredient.includes('viande') || ingredient.includes('poisson')) {
    return baseQuantity // 1 package per 4 people
  } else if (ingredient.includes('légumes')) {
    return Math.max(1, Math.ceil(peopleCount / 3)) // More vegetables needed
  } else if (ingredient.includes('épices') || ingredient.includes('herbes')) {
    return 1 // One package of spices/herbs serves many
  } else if (ingredient.includes('huile') || ingredient.includes('vinaigre')) {
    return 1 // One bottle serves many meals
  } else if (ingredient.includes('fromage') || ingredient.includes('lait')) {
    return baseQuantity
  } else {
    return baseQuantity // Default
  }
}

function categorizeShoppingItems(items: ShoppingItem[]) {
  const categories = new Map<string, ShoppingItem[]>()

  items.forEach(item => {
    const category = getCategoryDisplay(item.category)
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)!.push(item)
  })

  // Sort categories by importance and items by price
  const sortedCategories = Array.from(categories.entries())
    .sort(([a], [b]) => getCategoryPriority(a) - getCategoryPriority(b))
    .map(([category, items]) => ({
      name: category,
      items: items.sort((a, b) => b.priceChf - a.priceChf), // Most expensive first
      totalCost: Math.round(items.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100,
      itemCount: items.length
    }))

  return sortedCategories
}

function getCategoryDisplay(category: string): string {
  const categoryMap: Record<string, string> = {
    'légumes': 'Fruits & Légumes',
    'viande': 'Viande & Poisson',
    'poisson': 'Viande & Poisson',
    'fruits-de-mer': 'Viande & Poisson',
    'charcuterie': 'Viande & Poisson',
    'pâtes': 'Pâtes & Céréales',
    'riz': 'Pâtes & Céréales',
    'céréales': 'Pâtes & Céréales',
    'fromage': 'Produits Laitiers',
    'lait': 'Produits Laitiers',
    'yogourt': 'Produits Laitiers',
    'beurre': 'Produits Laitiers',
    'crème': 'Produits Laitiers',
    'œufs': 'Produits Laitiers',
    'pain': 'Boulangerie',
    'épices': 'Épicerie',
    'herbes': 'Épicerie',
    'huile': 'Épicerie',
    'vinaigre': 'Épicerie',
    'conserves': 'Épicerie',
    'farine': 'Épicerie',
    'sucre': 'Épicerie'
  }

  return categoryMap[category] || 'Autres'
}

function getCategoryPriority(category: string): number {
  const priorities: Record<string, number> = {
    'Fruits & Légumes': 1,
    'Viande & Poisson': 2,
    'Produits Laitiers': 3,
    'Pâtes & Céréales': 4,
    'Boulangerie': 5,
    'Épicerie': 6,
    'Autres': 7
  }

  return priorities[category] || 8
}