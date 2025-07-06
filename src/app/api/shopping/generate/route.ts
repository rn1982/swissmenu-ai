import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { 
  analyzeIngredient, 
  findBestProductMatch, 
  calculateSmartQuantity, 
  generateOptimizedShoppingList,
  type EnhancedProductMatch 
} from '@/lib/enhanced-product-matching'

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
  matchScore?: number
  matchReason?: string
  confidence?: 'high' | 'medium' | 'low'
  source?: string
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

    // Step 2: Use enhanced matching algorithm
    const optimizedList = await generateOptimizedShoppingList(allIngredients, {
      peopleCount,
      budget: menuData.resume.cout_total_estime_chf,
      preferScrapingBee: true
    })
    
    console.log(`🎯 Matched ${optimizedList.items.length} products`)
    console.log(`💰 Total cost: CHF ${optimizedList.totalCost}`)
    console.log(`📈 Savings: CHF ${optimizedList.savings}`)

    // Step 3: Format categories for response
    const categorizedItems = Array.from(optimizedList.categories.entries()).map(([category, items]) => ({
      name: category,
      items: items.map(item => ({
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        priceChf: item.product.priceChf,
        unit: item.unit,
        category: item.product.category,
        url: item.product.url,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        matchedIngredients: [item.ingredient.original],
        matchScore: item.product.matchScore,
        matchReason: item.product.matchReason,
        confidence: item.product.confidence,
        source: item.product.source
      })),
      totalCost: Math.round(items.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100,
      itemCount: items.length
    }))

    // Step 4: Create enhanced shopping list
    const shoppingList = {
      id: `shopping-${Date.now()}`,
      menuId: body.menuId || 'generated-menu',
      createdAt: new Date().toISOString(),
      peopleCount,
      categories: categorizedItems,
      summary: {
        totalItems: optimizedList.items.length,
        totalCost: optimizedList.totalCost,
        averageItemCost: Math.round((optimizedList.totalCost / Math.max(optimizedList.items.length, 1)) * 100) / 100,
        estimatedBudget: menuData.resume.cout_total_estime_chf || optimizedList.totalCost,
        actualCost: optimizedList.totalCost,
        savings: optimizedList.savings,
        scrapingBeeProducts: optimizedList.items.filter(item => item.product.source === 'scrapingbee').length,
        fallbackProducts: optimizedList.items.filter(item => item.product.source === 'fallback').length
      },
      unmatched: optimizedList.unmatchedIngredients,
      matchQuality: {
        high: optimizedList.items.filter(item => item.product.confidence === 'high').length,
        medium: optimizedList.items.filter(item => item.product.confidence === 'medium').length,
        low: optimizedList.items.filter(item => item.product.confidence === 'low').length
      }
    }

    console.log(`✅ Generated shopping list: ${optimizedList.items.length} items, CHF ${optimizedList.totalCost.toFixed(2)}`)

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
  const ingredients: string[] = []
  const processedIngredients = new Set<string>()

  // Extract from each day's meals
  Object.values(menuData.weekMenu).forEach(dayMenu => {
    Object.values(dayMenu).forEach(meal => {
      if (meal && meal.ingredients) {
        meal.ingredients.forEach(ingredient => {
          // Keep the full ingredient string with quantities and details
          const normalized = ingredient.trim()
          if (normalized.length > 2 && !processedIngredients.has(normalized.toLowerCase())) {
            ingredients.push(normalized) // Keep original case and full text
            processedIngredients.add(normalized.toLowerCase())
            
            // Log for debugging
            console.log(`📝 Extracted ingredient: "${normalized}"`)
          }
        })
      }
    })
  })

  // Don't duplicate main ingredients from resume as they're already in meals
  // The resume ingredients are just summaries

  console.log(`📋 Total unique ingredients extracted: ${ingredients.length}`)
  return ingredients
}

async function matchIngredientsToProducts(ingredients: string[], peopleCount: number): Promise<ShoppingItem[]> {
  const productMap = new Map<string, ShoppingItem>()

  for (const ingredient of ingredients) {
    try {
      // Analyze the ingredient
      const analysis = analyzeIngredient(ingredient)
      console.log(`🔍 Analyzing: "${ingredient}" → ${analysis.mainIngredient} (${analysis.category})`)
      
      // Find best matching products using enhanced matching
      const matches = await findBestProductMatch(analysis, {
        preferScrapingBee: true,
        maxPriceChf: 50
      })
      
      if (matches.length > 0) {
        const bestMatch = matches[0]
        
        // Check if we already have this product
        if (productMap.has(bestMatch.id)) {
          // Add to matched ingredients
          const existing = productMap.get(bestMatch.id)!
          existing.matchedIngredients.push(ingredient)
        } else {
          // Calculate smart quantity
          const { quantity, unit } = calculateSmartQuantity(analysis, peopleCount)
          
          const shoppingItem: ShoppingItem = {
            id: bestMatch.id,
            name: bestMatch.name,
            brand: bestMatch.brand,
            priceChf: bestMatch.priceChf,
            unit: unit || bestMatch.unit || '',
            category: bestMatch.category || analysis.category,
            url: bestMatch.url,
            imageUrl: bestMatch.imageUrl,
            quantity,
            totalPrice: Math.round(bestMatch.priceChf * quantity * 100) / 100,
            matchedIngredients: [ingredient],
            matchScore: bestMatch.matchScore,
            matchReason: bestMatch.matchReason,
            confidence: bestMatch.confidence,
            source: bestMatch.source
          }
          
          productMap.set(bestMatch.id, shoppingItem)
        }
        
        console.log(`✅ Matched "${ingredient}" → ${bestMatch.name} (${bestMatch.confidence}, ${Math.round(bestMatch.matchScore * 100)}%)`)
      } else {
        console.log(`❌ No match found for "${ingredient}"`)
      }
    } catch (error) {
      console.error(`Error matching ingredient "${ingredient}":`, error)
    }
  }

  return Array.from(productMap.values())
}

// Remove the old calculateQuantity function since we're using the enhanced one from the library

function categorizeShoppingItems(items: ShoppingItem[]) {
  const categories = new Map<string, ShoppingItem[]>()

  items.forEach(item => {
    const category = getCategoryDisplay(item.category)
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)!.push(item)
  })

  // Sort categories by importance and items by confidence then price
  const sortedCategories = Array.from(categories.entries())
    .sort(([a], [b]) => getCategoryPriority(a) - getCategoryPriority(b))
    .map(([category, items]) => ({
      name: category,
      items: items.sort((a, b) => {
        // Sort by confidence first
        const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 }
        const aConf = confidenceOrder[a.confidence || 'low']
        const bConf = confidenceOrder[b.confidence || 'low']
        if (aConf !== bConf) return bConf - aConf
        // Then by price
        return b.priceChf - a.priceChf
      }), // Best matches first
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