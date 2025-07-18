import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import type { UserPreferences } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userPreferencesId } = body

    if (!userPreferencesId) {
      return NextResponse.json(
        { error: 'User preferences ID is required' },
        { status: 400 }
      )
    }

    // Get user preferences
    const preferences = await db.userPreferences.findUnique({
      where: { id: userPreferencesId }
    })

    if (!preferences) {
      return NextResponse.json(
        { error: 'User preferences not found' },
        { status: 404 }
      )
    }

    // Generate menu using Claude
    const menuData = await generateMenuWithClaude(preferences)
    
    // Calculate week start date (Monday of current week)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    weekStart.setHours(0, 0, 0, 0)

    // Save menu to database
    const weeklyMenu = await db.weeklyMenu.create({
      data: {
        weekStartDate: weekStart,
        menuData: menuData,
        totalBudgetChf: preferences.budgetChf
      }
    })

    return NextResponse.json({
      success: true,
      menu: {
        id: weeklyMenu.id,
        weekStartDate: weeklyMenu.weekStartDate,
        menuData: weeklyMenu.menuData,
        totalBudgetChf: weeklyMenu.totalBudgetChf
      }
    })

  } catch (error) {
    console.error('Menu generation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Menu generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateMenuWithClaude(preferences: UserPreferences) {
  // Get recent menus to avoid repetition
  const recentMenus = await db.weeklyMenu.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10 // Increased to 10 for better variety tracking
  })
  
  // Get available product categories for better recipe generation
  const availableCategories = await db.migrosProduct.groupBy({
    by: ['category'],
    _count: true,
    where: {
      source: 'scrapingbee' // Prioritize verified products
    },
    having: {
      category: {
        _count: {
          gt: 5 // Categories with at least 5 products
        }
      }
    }
  })
  
  // Get top 100 common ingredients from our database
  const commonIngredients = await db.migrosProduct.findMany({
    select: {
      name: true,
      category: true
    },
    where: {
      OR: [
        { category: { in: ['pasta', 'pasta-rice', 'rice'] } },
        { category: { in: ['meat', 'fish'] } },
        { category: { in: ['vegetables', 'fruits'] } },
        { category: { in: ['dairy', 'pantry'] } }
      ]
    },
    take: 100,
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  })
  
  const { dishes: recentDishes, dishTypes } = extractRecentDishes(recentMenus)
  const prompt = createMenuPrompt(preferences, recentDishes, availableCategories, dishTypes, commonIngredients)
  let lastError: Error | null = null
  
  // Retry logic for API overload or temporary failures
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Menu generation attempt ${attempt}/3`)
      console.log(`📝 Prompt length: ${prompt.length} characters`)
      console.log(`👥 People: ${preferences.peopleCount}, 🍽️ Meals/day: ${preferences.mealsPerDay}`)
      console.log(`💰 Budget: CHF ${preferences.budgetChf}, 🚫 Restrictions: ${preferences.dietaryRestrictions?.join(', ') || 'None'}`)
      
      // Enhance prompt for retries if previous attempt returned partial data
      let finalPrompt = prompt
      if (attempt > 1 && lastError?.message?.includes('incomplete')) {
        finalPrompt = prompt.replace(
          'COMMENCE DIRECTEMENT PAR: {',
          `⚠️ ATTENTION: Génère le MENU COMPLET, pas un exemple partiel!
TOUS les 7 jours (lundi à dimanche) avec TOUS les repas.
PAS de note explicative. UNIQUEMENT le JSON.

COMMENCE DIRECTEMENT PAR: {`
        )
      }
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8000, // Increased to ensure complete response
        temperature: 0.7, // Slightly reduced temperature
        system: 'You are a menu planning assistant. Always respond with valid JSON only. Never include explanatory text or partial examples.',
        messages: [
          {
            role: 'user',
            content: finalPrompt
          }
        ]
      })

      // Log response info
      console.log(`Response received, usage: ${JSON.stringify(response.usage || 'N/A')}`)
      
      const content = response.content[0]
      if (content.type === 'text') {
        console.log(`Response length: ${content.text.length} characters`)
        try {
          const menuData = JSON.parse(content.text)
          
          // Quick validation: check if weekMenu exists and has content
          if (!menuData.weekMenu || Object.keys(menuData.weekMenu).length === 0) {
            console.log('❌ No weekMenu found in response')
            lastError = new Error('Invalid menu structure - no weekMenu')
            continue
          }
          
          // Log raw response structure for debugging
          const dayCount = Object.keys(menuData.weekMenu).length
          const firstDay = Object.keys(menuData.weekMenu)[0]
          const firstDayMealCount = firstDay ? Object.keys(menuData.weekMenu[firstDay]).length : 0
          console.log(`📦 Raw response: ${dayCount} days, first day has ${firstDayMealCount} meals`)
          
          // Ensure correct day ordering
          const orderedMenuData = ensureCorrectDayOrder(menuData)
          
          // Validate that all days are present
          if (!validateAllDaysPresent(orderedMenuData)) {
            console.log('❌ Not all days generated, regenerating...')
            lastError = new Error('Incomplete menu - missing days')
            continue
          }
          
          // Validate correct number of meals per day
          if (!validateMealCount(orderedMenuData, preferences)) {
            console.log('❌ Incorrect meal count, regenerating...')
            // Log detailed meal count for debugging
            const mealTypes: string[] = []
            if (preferences.mealsPerDay >= 1) mealTypes.push('petit_dejeuner')
            if (preferences.mealsPerDay >= 2) mealTypes.push('dejeuner')
            if (preferences.mealsPerDay >= 3) mealTypes.push('diner')
            
            Object.entries(orderedMenuData.weekMenu || {}).forEach(([day, dayMenu]: [string, any]) => {
              const actualMeals = mealTypes.filter(mealType => dayMenu[mealType]).length
              console.log(`   ${day}: ${actualMeals}/${mealTypes.length} meals (missing: ${mealTypes.filter(mt => !dayMenu[mt]).join(', ')})`)
            })
            
            lastError = new Error('Incorrect number of meals per day')
            continue
          }
          
          // Log which days were generated
          const generatedDays = Object.keys(orderedMenuData.weekMenu || {})
          console.log(`📅 Generated days: ${generatedDays.join(', ')}`)
          
          // Skip variety validation for now - user priority is matching ingredients
          // Validate dietary restrictions only
          if (!validateDietaryRestrictions(orderedMenuData, preferences)) {
            console.log('Dietary restrictions violated, regenerating...')
            continue
          }
          
          console.log('✅ Menu generation successful')
          return orderedMenuData
        } catch (parseError) {
          console.error('Failed to parse Claude response. Parse error:', parseError)
          console.error('Response preview:', content.text.substring(0, 500) + '...')
          
          // Check if response contains a note about partial data
          if (content.text.includes('exemple partiel') || content.text.includes('JSON complet inclurait')) {
            console.error('AI returned partial response instead of complete menu')
            lastError = new Error('AI returned incomplete menu - retrying with clearer prompt')
            continue
          }
          
          throw new Error('Invalid menu format returned from AI')
        }
      } else {
        throw new Error('Unexpected response format from AI')
      }
    } catch (error: any) {
      lastError = error as Error
      console.error(`Attempt ${attempt} failed:`, error)
      
      // Check for specific Anthropic API errors
      const errorMessage = error?.message || ''
      const isServerError = error?.status >= 500 || errorMessage.includes('Internal server error')
      const isOverloaded = errorMessage.includes('overloaded') || error?.status === 529
      const isRateLimit = error?.status === 429
      
      // Wait before retrying for server errors, overload, or rate limits
      if ((isServerError || isOverloaded || isRateLimit) && attempt < 3) {
        const waitTime = Math.min(attempt * 3000, 10000) // 3s, 6s, 9s (max 10s)
        console.log(`API error detected (${error?.status || 'unknown'}), waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // For non-retryable errors on first attempt, throw immediately
      if (attempt === 1 && !isServerError && !isOverloaded && !isRateLimit) {
        throw error
      }
    }
  }
  
  // If all retries failed, create a basic menu with all days
  console.log('⚠️ All retries failed, creating basic menu with all 7 days')
  
  // Create a basic menu structure with all days
  const basicMenu = {
    weekMenu: {},
    resume: {
      cout_total_estime_chf: 0,
      nombre_repas: preferences.mealsPerDay * 7,
      cout_moyen_par_repas_chf: 0,
      ingredients_principaux: [],
      conseils_achat: "Menu basique généré avec ingrédients simples"
    }
  }
  
  // Fill all days with basic meals
  const filledMenu = fillMissingDays(basicMenu, preferences)
  console.log('✅ Created complete 7-day menu with basic meals')
  return filledMenu
}

// Extract dishes from recent menus to avoid repetition
function extractRecentDishes(recentMenus: any[]): { dishes: string[], dishTypes: Record<string, number> } {
  const dishes: string[] = []
  const dishTypes: Record<string, number> = {
    pasta: 0,
    viande: 0,
    poisson: 0,
    vegetarien: 0,
    asiatique: 0,
    gratin: 0,
    soupe: 0,
    salade: 0,
    pizza: 0,
    risotto: 0
  }
  
  recentMenus.forEach(menu => {
    if (menu.menuData?.weekMenu) {
      Object.values(menu.menuData.weekMenu).forEach((day: any) => {
        if (day) {
          Object.values(day).forEach((meal: any) => {
            if (meal?.nom) {
              const dishName = meal.nom.toLowerCase()
              dishes.push(dishName)
              
              // Track dish types
              if (dishName.includes('pâtes') || dishName.includes('pasta') || dishName.includes('spaghetti')) {
                dishTypes.pasta++
              }
              if (dishName.includes('bœuf') || dishName.includes('poulet') || dishName.includes('porc') || dishName.includes('veau')) {
                dishTypes.viande++
              }
              if (dishName.includes('poisson') || dishName.includes('saumon') || dishName.includes('cabillaud')) {
                dishTypes.poisson++
              }
              if (dishName.includes('végétarien') || dishName.includes('légumes') || dishName.includes('tofu')) {
                dishTypes.vegetarien++
              }
              if (dishName.includes('asiatique') || dishName.includes('wok') || dishName.includes('curry') || dishName.includes('thaï')) {
                dishTypes.asiatique++
              }
              if (dishName.includes('gratin')) {
                dishTypes.gratin++
              }
              if (dishName.includes('soupe') || dishName.includes('potage')) {
                dishTypes.soupe++
              }
              if (dishName.includes('salade')) {
                dishTypes.salade++
              }
              if (dishName.includes('pizza')) {
                dishTypes.pizza++
              }
              if (dishName.includes('risotto')) {
                dishTypes.risotto++
              }
            }
          })
        }
      })
    }
  })
  
  return { dishes, dishTypes }
}

// Validate menu has sufficient variety
function validateMenuVariety(menuData: any): boolean {
  const allDishes: string[] = []
  const cuisineTypes: string[] = []
  const proteinTypes: string[] = []
  const cookingMethods: string[] = []
  
  Object.values(menuData.weekMenu).forEach((day: any) => {
    Object.values(day).forEach((meal: any) => {
      if (meal?.nom) {
        const dishName = meal.nom.toLowerCase()
        const description = (meal.description || '').toLowerCase()
        allDishes.push(dishName)
        
        // Track cuisine types
        if (dishName.includes('italien') || dishName.includes('pasta') || dishName.includes('pizza')) {
          cuisineTypes.push('italien')
        } else if (dishName.includes('asiatique') || dishName.includes('wok') || dishName.includes('curry')) {
          cuisineTypes.push('asiatique')
        } else if (dishName.includes('suisse') || dishName.includes('rösti') || dishName.includes('fondue')) {
          cuisineTypes.push('suisse')
        } else if (dishName.includes('français') || dishName.includes('gratin')) {
          cuisineTypes.push('français')
        }
        
        // Track protein types
        if (dishName.includes('poulet') || dishName.includes('volaille')) {
          proteinTypes.push('poulet')
        } else if (dishName.includes('bœuf') || dishName.includes('boeuf')) {
          proteinTypes.push('bœuf')
        } else if (dishName.includes('porc')) {
          proteinTypes.push('porc')
        } else if (dishName.includes('poisson') || dishName.includes('saumon')) {
          proteinTypes.push('poisson')
        } else if (dishName.includes('végétarien') || dishName.includes('tofu')) {
          proteinTypes.push('végétarien')
        }
        
        // Track cooking methods
        if (description.includes('grillé') || description.includes('grill')) {
          cookingMethods.push('grillé')
        } else if (description.includes('mijoté') || description.includes('mijot')) {
          cookingMethods.push('mijoté')
        } else if (description.includes('rôti') || description.includes('four')) {
          cookingMethods.push('rôti')
        } else if (description.includes('sauté') || description.includes('poêle')) {
          cookingMethods.push('sauté')
        } else if (description.includes('vapeur')) {
          cookingMethods.push('vapeur')
        }
      }
    })
  })
  
  // Check for duplicates
  const uniqueDishes = new Set(allDishes)
  const duplicateRatio = 1 - (uniqueDishes.size / allDishes.length)
  
  // Check variety scores
  const cuisineVariety = new Set(cuisineTypes).size
  const proteinVariety = new Set(proteinTypes).size
  const methodVariety = new Set(cookingMethods).size
  
  // Validation criteria
  const hasSufficientDishVariety = duplicateRatio <= 0.15 // Allow 15% for breakfasts
  const hasSufficientCuisineVariety = cuisineVariety >= 3
  const hasSufficientProteinVariety = proteinVariety >= 3
  const hasSufficientMethodVariety = methodVariety >= 3
  
  if (!hasSufficientDishVariety) {
    console.log(`Variety validation failed: Too many duplicate dishes (${(duplicateRatio * 100).toFixed(1)}%)`)
  }
  if (!hasSufficientCuisineVariety) {
    console.log(`Variety validation failed: Not enough cuisine types (${cuisineVariety} < 3)`)
  }
  if (!hasSufficientProteinVariety) {
    console.log(`Variety validation failed: Not enough protein types (${proteinVariety} < 3)`)
  }
  if (!hasSufficientMethodVariety) {
    console.log(`Variety validation failed: Not enough cooking methods (${methodVariety} < 3)`)
  }
  
  return hasSufficientDishVariety && hasSufficientCuisineVariety && 
         hasSufficientProteinVariety && hasSufficientMethodVariety
}

// Ensure correct day ordering (Monday to Sunday)
function ensureCorrectDayOrder(menuData: any): any {
  const correctDayOrder = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  
  if (!menuData.weekMenu) {
    return menuData
  }
  
  const orderedWeekMenu: any = {}
  
  // Create new object with days in correct order
  correctDayOrder.forEach(day => {
    if (menuData.weekMenu[day]) {
      orderedWeekMenu[day] = menuData.weekMenu[day]
    }
  })
  
  // Return menu with ordered days
  return {
    ...menuData,
    weekMenu: orderedWeekMenu
  }
}

// Validate that all 7 days are present
function validateAllDaysPresent(menuData: any): boolean {
  const requiredDays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  
  if (!menuData.weekMenu) {
    console.log('❌ No weekMenu found in response')
    return false
  }
  
  const missingDays = requiredDays.filter(day => !menuData.weekMenu[day])
  
  if (missingDays.length > 0) {
    console.log(`❌ Missing days: ${missingDays.join(', ')}`)
    return false
  }
  
  // Also check that each day has at least one meal
  for (const day of requiredDays) {
    const dayMenu = menuData.weekMenu[day]
    if (!dayMenu || Object.keys(dayMenu).length === 0) {
      console.log(`❌ Day ${day} has no meals`)
      return false
    }
  }
  
  return true
}

// Fill missing days with simple fallback meals
function fillMissingDays(menuData: any, preferences: UserPreferences): any {
  const requiredDays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  const mealTypes: string[] = []
  if (preferences.mealsPerDay === 1) {
    mealTypes.push('diner')
  } else if (preferences.mealsPerDay === 2) {
    mealTypes.push('dejeuner', 'diner')
  }
  
  // Ensure weekMenu exists
  if (!menuData.weekMenu) {
    menuData.weekMenu = {}
  }
  
  // Simple fallback meals
  const fallbackMeals = {
    dejeuner: {
      nom: "Salade composée",
      description: "Salade fraîche avec légumes de saison",
      ingredients: ["200g salade verte", "2 tomates", "100g fromage", "50g pain", "vinaigrette"],
      instructions: ["Laver et couper les légumes", "Ajouter le fromage en cubes", "Assaisonner avec la vinaigrette"],
      temps_preparation: 15,
      temps_cuisson: 0,
      difficulte: "facile",
      cout_estime_chf: 8.00,
      portions: preferences.peopleCount
    },
    diner: {
      nom: "Pâtes sauce tomate",
      description: "Pâtes italiennes avec sauce tomate maison",
      ingredients: ["300g pâtes", "400g tomates pelées", "1 oignon", "2 gousses d'ail", "basilic"],
      instructions: ["Faire revenir oignon et ail", "Ajouter tomates, cuire 20 min", "Cuire les pâtes, servir avec la sauce"],
      temps_preparation: 10,
      temps_cuisson: 25,
      difficulte: "facile",
      cout_estime_chf: 10.00,
      portions: preferences.peopleCount
    }
  }
  
  // Fill in missing days AND missing meals
  requiredDays.forEach((day, index) => {
    if (!menuData.weekMenu[day]) {
      console.log(`🔧 Creating missing day: ${day}`)
      menuData.weekMenu[day] = {}
    }
    
    // Check if this day has all required meals
    const dayMenu = menuData.weekMenu[day]
    const existingMeals = Object.keys(dayMenu)
    const missingMeals = mealTypes.filter(mealType => !dayMenu[mealType])
    
    if (missingMeals.length > 0) {
      console.log(`🔧 Day ${day} is missing meals: ${missingMeals.join(', ')}`)
      
      // Add missing meals
      missingMeals.forEach(mealType => {
        const baseMeal = { ...fallbackMeals[mealType as keyof typeof fallbackMeals] }
        baseMeal.cout_estime_chf += (index % 3) // Slight price variation
        menuData.weekMenu[day][mealType] = baseMeal
        console.log(`   ✅ Added ${mealType} to ${day}`)
      })
    }
  })
  
  // Update resume
  if (!menuData.resume) {
    menuData.resume = {}
  }
  
  const totalMeals = requiredDays.length * preferences.mealsPerDay
  const totalCost = Object.values(menuData.weekMenu).reduce((sum: number, day: any) => {
    return sum + Object.values(day).reduce((daySum: number, meal: any) => {
      return daySum + (meal.cout_estime_chf || 0)
    }, 0)
  }, 0)
  
  menuData.resume = {
    ...menuData.resume,
    nombre_repas: totalMeals,
    cout_total_estime_chf: Math.round(totalCost * 100) / 100,
    cout_moyen_par_repas_chf: Math.round((totalCost / totalMeals) * 100) / 100
  }
  
  return menuData
}

// Validate correct number of meals per day
function validateMealCount(menuData: any, preferences: UserPreferences): boolean {
  const requiredDays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  const expectedMealsPerDay = preferences.mealsPerDay
  
  const mealTypes: string[] = []
  if (expectedMealsPerDay === 1) {
    mealTypes.push('diner')
  } else if (expectedMealsPerDay === 2) {
    mealTypes.push('dejeuner', 'diner')
  }
  
  let totalExpectedMeals = 0
  let totalActualMeals = 0
  
  for (const day of requiredDays) {
    const dayMenu = menuData.weekMenu[day]
    if (!dayMenu) continue
    
    // Count expected meals for this day
    totalExpectedMeals += mealTypes.length
    
    // Count actual meals for this day
    const actualMealsInDay = mealTypes.filter(mealType => dayMenu[mealType]).length
    totalActualMeals += actualMealsInDay
    
    if (actualMealsInDay !== mealTypes.length) {
      console.log(`❌ Day ${day} has ${actualMealsInDay} meals instead of ${mealTypes.length}`)
      const missingMeals = mealTypes.filter(mealType => !dayMenu[mealType])
      console.log(`   Missing meals: ${missingMeals.join(', ')}`)
    }
  }
  
  console.log(`📊 Total meals: ${totalActualMeals}/${totalExpectedMeals} (${expectedMealsPerDay} meals/day × 7 days)`)
  
  // Return true only if we have the exact expected number of meals
  return totalActualMeals === totalExpectedMeals
}

// Validate dietary restrictions are respected
function validateDietaryRestrictions(menuData: any, preferences: UserPreferences): boolean {
  const restrictions = preferences.dietaryRestrictions || []
  if (restrictions.length === 0) return true
  
  const restrictionKeywords: Record<string, string[]> = {
    'vegetarien': [
      'viande', 'poulet', 'boeuf', 'bœuf', 'porc', 'veau', 'agneau', 'canard', 'poisson', 
      'fruits de mer', 'crevettes', 'saumon', 'thon', 'cabillaud', 'volaille', 'lapin',
      'merguez', 'saucisse', 'steak', 'escalope', 'rôti', 'côtelette', 'jambon', 'lard',
      'bacon', 'filet', 'cuisse', 'magret', 'foie', 'rognons', 'tripes', 'boudin'
    ],
    'vegan': [
      'viande', 'poulet', 'boeuf', 'bœuf', 'porc', 'fromage', 'lait', 'œuf', 'œufs', 
      'beurre', 'crème', 'yaourt', 'yogourt', 'miel', 'gruyère', 'emmental', 'parmesan',
      'mozzarella', 'mascarpone', 'ricotta', 'chèvre', 'roquefort', 'camembert', 'brie',
      'reblochon', 'raclette', 'fondue', 'quiche', 'omelette', 'mayonnaise', 'crème fraîche',
      'poisson', 'fruits de mer', 'crevettes', 'saumon', 'thon', 'gélatine'
    ],
    'sans_gluten': [
      'blé', 'pâtes', 'pain', 'farine', 'croissant', 'brioche', 'pizza', 'couscous',
      'semoule', 'biscuit', 'gâteau', 'tarte', 'quiche', 'crêpe', 'galette', 'panure',
      'chapelure', 'sauce soja', 'seitan', 'boulgour', 'épeautre', 'orge', 'seigle',
      'avoine', 'malt', 'levure de bière', 'bière'
    ],
    'sans_lactose': [
      'lait', 'fromage', 'yaourt', 'yogourt', 'crème', 'beurre', 'mozzarella', 'gruyère',
      'emmental', 'parmesan', 'mascarpone', 'ricotta', 'chèvre', 'roquefort', 'camembert',
      'brie', 'reblochon', 'raclette', 'fondue', 'crème fraîche', 'chantilly', 'glace',
      'chocolat au lait', 'béchamel', 'gratin', 'quiche lorraine'
    ],
    'halal': [
      'porc', 'jambon', 'lard', 'saucisson', 'alcool', 'vin', 'bière', 'liqueur',
      'bacon', 'pancetta', 'chorizo', 'salami', 'mortadelle', 'coppa', 'speck',
      'gélatine de porc', 'saindoux', 'rillettes', 'pâté de porc', 'boudin noir',
      'andouille', 'andouillette', 'chipolata', 'merguez de porc', 'côte de porc',
      'filet mignon de porc', 'échine', 'travers de porc', 'jarret de porc'
    ],
    'kasher': [
      'porc', 'fruits de mer', 'crevettes', 'homard', 'crabe', 'huîtres', 'moules',
      'coquilles saint-jacques', 'langoustines', 'calamars', 'poulpe', 'escargots',
      'lapin', 'cheval', 'mélange viande-lait', 'cheeseburger', 'pizza pepperoni',
      'carbonara', 'cordon bleu', 'escalope milanaise', 'lasagne bolognaise'
    ]
  }
  
  // Check each meal for restriction violations
  for (const restriction of restrictions) {
    const keywords = restrictionKeywords[restriction] || []
    
    for (const day of Object.values(menuData.weekMenu)) {
      for (const meal of Object.values(day as any)) {
        const mealText = JSON.stringify(meal).toLowerCase()
        
        for (const keyword of keywords) {
          if (mealText.includes(keyword)) {
            console.log(`Restriction violation: ${restriction} - found ${keyword}`)
            return false
          }
        }
      }
    }
  }
  
  return true
}

function getCategoryNameFrench(category: string): string {
  const categoryNames: Record<string, string> = {
    'pasta': 'Pâtes',
    'pasta-rice': 'Pâtes et Riz',
    'rice': 'Riz et Céréales',
    'meat': 'Viande',
    'fish': 'Poisson',
    'vegetables': 'Légumes',
    'fruits': 'Fruits',
    'dairy': 'Produits laitiers',
    'pantry': 'Épicerie',
    'herbs': 'Herbes et Épices',
    'bakery': 'Boulangerie',
    'nuts': 'Noix et Graines'
  }
  return categoryNames[category] || category
}

function createMenuPrompt(
  preferences: UserPreferences, 
  recentDishes: string[] = [], 
  availableCategories: any[] = [],
  dishTypes: Record<string, number> = {},
  commonIngredients: Array<{ name: string; category: string | null }> = []
): string {
  const dietaryRestrictions = preferences.dietaryRestrictions?.join(', ') || 'Aucune'
  const cuisinePreferences = preferences.cuisinePreferences?.join(', ') || 'Varié'
  
  // Get current season for seasonal suggestions
  const month = new Date().getMonth()
  const season = month >= 2 && month <= 4 ? 'printemps' : 
                month >= 5 && month <= 7 ? 'été' : 
                month >= 8 && month <= 10 ? 'automne' : 'hiver'
  
  const recentDishesSection = recentDishes.length > 0 
    ? `\nPLATS À ÉVITER (récemment servis):\n${recentDishes.join(', ')}\n` 
    : ''
  
  // Create dish type warnings
  const overusedTypes = Object.entries(dishTypes)
    .filter(([_, count]) => count > 5)
    .map(([type, count]) => `${type} (déjà ${count} fois)`)
  
  const dishTypeWarning = overusedTypes.length > 0
    ? `\nTYPES DE PLATS TROP FRÉQUENTS À LIMITER:\n${overusedTypes.join(', ')}\n`
    : ''
  
  // Create available ingredients section
  const availableIngredientsSection = availableCategories.length > 0
    ? `\nCATÉGORIES D'INGRÉDIENTS DISPONIBLES CHEZ MIGROS:\n${availableCategories.map(c => `- ${getCategoryNameFrench(c.category)}: ${c._count} produits`).join('\n')}\n\nPRIORISE ces catégories d'ingrédients car nous avons vérifié leur disponibilité.\n`
    : ''
  
  // Create common ingredients list
  const ingredientsByCategory = commonIngredients.reduce((acc, ing) => {
    const cat = ing.category || 'autres'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ing.name)
    return acc
  }, {} as Record<string, string[]>)
  
  const commonIngredientsSection = Object.keys(ingredientsByCategory).length > 0
    ? `\nINGRÉDIENTS DISPONIBLES DANS NOTRE BASE DE DONNÉES:\n${
        Object.entries(ingredientsByCategory)
          .map(([cat, items]) => `${getCategoryNameFrench(cat)}: ${items.slice(0, 10).join(', ')}${items.length > 10 ? '...' : ''}`)
          .join('\n')
      }\n\nUTILISE PRIORITAIREMENT ces ingrédients pour garantir la correspondance avec notre base de produits.\n`
    : ''
  
  // Generate meal types based on mealsPerDay (simplified: 1 = dinner only, 2 = lunch + dinner)
  const mealTypes: string[] = []
  if (preferences.mealsPerDay === 1) {
    mealTypes.push('diner')
  } else if (preferences.mealsPerDay === 2) {
    mealTypes.push('dejeuner', 'diner')
  }
  
  const requiredMealsStr = mealTypes.join(', ')
  
  return `Génère un menu hebdomadaire complet (7 jours) en français pour ${preferences.peopleCount} personnes.

⚠️ TRÈS IMPORTANT: Tu DOIS générer ${preferences.mealsPerDay} repas par jour (${requiredMealsStr}) pour CHAQUE jour de la semaine.

CONTRAINTES:
- Budget: ${preferences.budgetChf ? preferences.budgetChf + ' CHF' : 'Flexible'}
- Repas/jour: ${preferences.mealsPerDay} (${requiredMealsStr})
- Restrictions: ${dietaryRestrictions}
- Niveau: ${preferences.cookingSkillLevel}
${recentDishesSection}${availableIngredientsSection}
RÈGLES STRICTES:
1. TOUS les 7 jours OBLIGATOIRES (lundi à dimanche)
2. CHAQUE jour doit avoir EXACTEMENT ${preferences.mealsPerDay} repas: ${requiredMealsStr}
3. Total OBLIGATOIRE: ${preferences.mealsPerDay * 7} repas pour la semaine
4. Ingrédients disponibles chez Migros uniquement
5. Respecter STRICTEMENT les restrictions alimentaires
6. VARIÉTÉ OBLIGATOIRE:
   - Aucun plat ne doit se répéter dans la semaine
   - Alterner les protéines (poulet, bœuf, porc, poisson, végétarien)
   - Varier les cuisines (suisse, italienne, asiatique, française, méditerranéenne)
   - Varier les méthodes de cuisson (grillé, mijoté, rôti, sauté, vapeur)
   - Maximum 2 plats de pâtes par semaine
7. Instructions de cuisson détaillées pour chaque plat

⚠️ NE PAS OUBLIER: Chaque jour DOIT avoir ${requiredMealsStr}. Si tu oublies un repas, la réponse sera rejetée

STRUCTURE JSON REQUISE:
{
  "weekMenu": {
    "lundi": {
      ${preferences.mealsPerDay === 2 ? '"dejeuner": { "nom": "...", "description": "...", "ingredients": [...], "instructions": [...], "temps_preparation": 20, "cout_estime_chf": 8.00, "difficulte": "moyen", "portions": ' + preferences.peopleCount + ' },\n      ' : ''}"diner": { "nom": "...", "description": "...", "ingredients": [...], "instructions": [...], "temps_preparation": 30, "cout_estime_chf": 12.00, "difficulte": "moyen", "portions": ' + preferences.peopleCount + ' }
    },
    "mardi": { ${requiredMealsStr} /* TOUS les repas requis */ },
    "mercredi": { ${requiredMealsStr} /* TOUS les repas requis */ },
    "jeudi": { ${requiredMealsStr} /* TOUS les repas requis */ },
    "vendredi": { ${requiredMealsStr} /* TOUS les repas requis */ },
    "samedi": { ${requiredMealsStr} /* TOUS les repas requis */ },
    "dimanche": { ${requiredMealsStr} /* TOUS les repas requis */ }
  },
  "resume": {
    "cout_total_estime_chf": 0,
    "nombre_repas": ${preferences.mealsPerDay * 7},
    "cout_moyen_par_repas_chf": 0,
    "ingredients_principaux": [],
    "conseils_achat": ""
  },
  "ingredients_summary": [
    {
      "name": "pâtes",
      "quantity": "500g",
      "category": "pasta",
      "recipes": ["Pâtes sauce tomate"]
    },
    {
      "name": "tomates pelées",
      "quantity": "800g",
      "category": "pantry",
      "recipes": ["Pâtes sauce tomate", "Chili con carne"]
    },
    {
      "name": "viande hachée",
      "quantity": "500g",
      "category": "meat",
      "recipes": ["Chili con carne"]
    }
  ]
}

RÈGLES CRITIQUES POUR LA RÉPONSE:
1. ⚠️ GÉNÈRE LE MENU COMPLET pour TOUS les 7 jours (lundi à dimanche)
2. ⚠️ NE PAS donner d'exemple partiel ou de note explicative
3. ⚠️ RÉPONSE = UNIQUEMENT le JSON complet, AUCUN texte avant ou après
4. ⚠️ CHAQUE jour DOIT avoir ${requiredMealsStr}
5. ⚠️ Le champ "ingredients_summary" DOIT contenir TOUS les ingrédients principaux

COMMENCE DIRECTEMENT PAR: {
  "weekMenu": {`
}

// Get existing menu for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userPreferencesId = searchParams.get('userPreferencesId')
    
    if (!userPreferencesId) {
      return NextResponse.json(
        { error: 'User preferences ID is required' },
        { status: 400 }
      )
    }

    // Get the most recent menu for this user
    const recentMenu = await db.weeklyMenu.findFirst({
      orderBy: { createdAt: 'desc' },
      // Note: In a real app, you'd want to associate menus with users
      // For now, we'll return the most recent menu
    })

    if (!recentMenu) {
      return NextResponse.json(
        { error: 'No menu found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      menu: {
        id: recentMenu.id,
        weekStartDate: recentMenu.weekStartDate,
        menuData: recentMenu.menuData,
        totalBudgetChf: recentMenu.totalBudgetChf,
        createdAt: recentMenu.createdAt
      }
    })

  } catch (error) {
    console.error('Menu fetch error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch menu',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}