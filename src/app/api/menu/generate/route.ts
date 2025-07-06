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
    take: 3
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
  
  const recentDishes = extractRecentDishes(recentMenus)
  const prompt = createMenuPrompt(preferences, recentDishes, availableCategories)
  let lastError: Error | null = null
  
  // Retry logic for API overload or temporary failures
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Menu generation attempt ${attempt}/3`)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.8, // Increase creativity for more variety
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.content[0]
      if (content.type === 'text') {
        try {
          const menuData = JSON.parse(content.text)
          
          // Validate variety and dietary restrictions
          if (!validateMenuVariety(menuData) || !validateDietaryRestrictions(menuData, preferences)) {
            console.log('Menu validation failed, regenerating...')
            continue
          }
          
          console.log('✅ Menu generation successful')
          return menuData
        } catch (parseError) {
          console.error('Failed to parse Claude response:', content.text)
          throw new Error('Invalid menu format returned from AI')
        }
      } else {
        throw new Error('Unexpected response format from AI')
      }
    } catch (error) {
      lastError = error as Error
      console.error(`Attempt ${attempt} failed:`, error)
      
      // If it's an overload error, wait before retrying
      if (error instanceof Error && error.message.includes('overloaded')) {
        if (attempt < 3) {
          const waitTime = attempt * 2000 // 2s, 4s, 6s
          console.log(`API overloaded, waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
      }
      
      // For other errors, don't retry
      if (attempt === 1 && !error.message.includes('overloaded')) {
        throw error
      }
    }
  }
  
  // If all retries failed, throw the last error
  throw lastError || new Error('Menu generation failed after all retries')
}

// Extract dishes from recent menus to avoid repetition
function extractRecentDishes(recentMenus: any[]): string[] {
  const dishes: string[] = []
  
  recentMenus.forEach(menu => {
    if (menu.menuData?.weekMenu) {
      Object.values(menu.menuData.weekMenu).forEach((day: any) => {
        if (day) {
          Object.values(day).forEach((meal: any) => {
            if (meal?.nom) {
              dishes.push(meal.nom.toLowerCase())
            }
          })
        }
      })
    }
  })
  
  return dishes
}

// Validate menu has sufficient variety
function validateMenuVariety(menuData: any): boolean {
  const allDishes: string[] = []
  
  Object.values(menuData.weekMenu).forEach((day: any) => {
    Object.values(day).forEach((meal: any) => {
      if (meal?.nom) {
        allDishes.push(meal.nom.toLowerCase())
      }
    })
  })
  
  // Check for duplicates
  const uniqueDishes = new Set(allDishes)
  const duplicateRatio = 1 - (uniqueDishes.size / allDishes.length)
  
  // Allow max 10% duplicates (for things like daily breakfast items)
  return duplicateRatio <= 0.1
}

// Validate dietary restrictions are respected
function validateDietaryRestrictions(menuData: any, preferences: UserPreferences): boolean {
  const restrictions = preferences.dietaryRestrictions || []
  if (restrictions.length === 0) return true
  
  const restrictionKeywords: Record<string, string[]> = {
    'vegetarien': ['viande', 'poulet', 'boeuf', 'porc', 'veau', 'agneau', 'canard', 'poisson', 'fruits de mer'],
    'vegan': ['viande', 'poulet', 'boeuf', 'porc', 'fromage', 'lait', 'œuf', 'beurre', 'crème', 'yaourt', 'miel'],
    'sans_gluten': ['blé', 'pâtes', 'pain', 'farine', 'croissant', 'brioche', 'pizza', 'couscous'],
    'sans_lactose': ['lait', 'fromage', 'yaourt', 'crème', 'beurre', 'mozzarella', 'gruyère'],
    'halal': ['porc', 'jambon', 'lard', 'saucisson', 'alcool', 'vin'],
    'kasher': ['porc', 'fruits de mer', 'crevettes', 'homard']
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

function createMenuPrompt(preferences: UserPreferences, recentDishes: string[] = [], availableCategories: any[] = []): string {
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
  
  // Create available ingredients section
  const availableIngredientsSection = availableCategories.length > 0
    ? `\nCATÉGORIES D'INGRÉDIENTS DISPONIBLES CHEZ MIGROS:\n${availableCategories.map(c => `- ${getCategoryNameFrench(c.category)}: ${c._count} produits`).join('\n')}\n\nPRIORISE ces catégories d'ingrédients car nous avons vérifié leur disponibilité.\n`
    : ''
  
  return `Tu es un chef suisse créatif spécialisé dans la planification de menus hebdomadaires variés. 
Génère un menu pour une semaine complète (7 jours) en français, adapté au contexte suisse.

SAISON ACTUELLE: ${season}

CONTRAINTES:
- Nombre de personnes: ${preferences.peopleCount}
- Repas par jour: ${preferences.mealsPerDay}
- Budget hebdomadaire: ${preferences.budgetChf ? preferences.budgetChf + ' CHF' : 'Flexible'}
- Restrictions alimentaires: ${dietaryRestrictions}
- Préférences culinaires: ${cuisinePreferences}
- Niveau de cuisine: ${preferences.cookingSkillLevel}
${recentDishesSection}${availableIngredientsSection}
DIRECTIVES IMPORTANTES POUR LA VARIÉTÉ:
1. AUCUN plat ne doit être répété durant la semaine (sauf petit-déjeuner simple)
2. Varie les types de protéines chaque jour (poulet, bœuf, porc, poisson, végétarien, etc.)
3. Alterne entre cuisines différentes (suisse, italienne, asiatique, française, etc.)
4. Utilise des méthodes de cuisson variées (grillé, mijoté, rôti, sauté, vapeur, etc.)
5. Privilégie les produits de saison ${season === 'hiver' ? '(choux, courges, pommes)' : season === 'été' ? '(tomates, courgettes, baies)' : ''}
6. Inclus 2-3 spécialités suisses par semaine MAX (pas plus!)

RÈGLES STRICTES:
1. Utilise des ingrédients facilement trouvables chez Migros Suisse
2. Respecte ABSOLUMENT les restrictions alimentaires
3. Respecte strictement le budget en CHF
4. Les portions doivent correspondre au nombre de personnes
5. Pour le dîner, privilégie des plats plus élaborés que le déjeuner
6. IMPORTANT: Fournis des instructions de cuisson DETAILLÉES pour CHAQUE plat (sauf petit-déjeuner simple)
7. PRIVILÉGIE les ingrédients des catégories disponibles mentionnées ci-dessus

INGRÉDIENTS DE BASE TOUJOURS DISPONIBLES (ne pas lister dans les ingrédients):
- Sel, poivre, huile d'olive basique
- Ail, oignons (sauf si quantité importante)
- Herbes séchées de base (thym, origan)
- Farine, sucre, beurre standard
Ces ingrédients de base sont considérés comme des "essentiels de cuisine" que tout foyer possède.

EXEMPLES DE VARIÉTÉ ATTENDUE:
- Lundi: Cuisine italienne (pasta)
- Mardi: Spécialité suisse (rösti)
- Mercredi: Cuisine asiatique (wok)
- Jeudi: Cuisine française (gratin)
- Vendredi: Poisson/fruits de mer
- Samedi: Cuisine internationale
- Dimanche: Plat familial élaboré

STRUCTURE REQUISE - Retourne UNIQUEMENT du JSON valide:
{
  "weekMenu": {
    "lundi": {
      "petit_dejeuner": {
        "nom": "Nom du plat",
        "description": "Description courte",
        "ingredients": ["ingrédient 1", "ingrédient 2"],
        "instructions": ["Étape 1: ...", "Étape 2: ...", "Étape 3: ..."],
        "temps_preparation": 15,
        "temps_cuisson": 20,
        "difficulte": "facile|moyen|difficile",
        "cout_estime_chf": 8.50,
        "portions": ${preferences.peopleCount},
        "conseils": "Conseils de préparation ou variantes possibles"
      },
      "dejeuner": { /* même structure avec instructions détaillées */ },
      "diner": { /* même structure avec instructions détaillées */ }
    },
    "mardi": { /* même structure pour tous les jours */ },
    "mercredi": { /* ... */ },
    "jeudi": { /* ... */ },
    "vendredi": { /* ... */ },
    "samedi": { /* ... */ },
    "dimanche": { /* ... */ }
  },
  "resume": {
    "cout_total_estime_chf": 85.20,
    "nombre_repas": 21,
    "cout_moyen_par_repas_chf": 4.06,
    "ingredients_principaux": ["liste des ingrédients les plus utilisés"],
    "conseils_achat": "Conseils pour optimiser les achats chez Migros"
  }
}

INSTRUCTIONS DE CUISSON:
- Sois TRÈS précis avec les quantités (ex: "200g de pâtes", "2 cuillères à soupe d'huile")
- Indique les températures de cuisson (ex: "180°C", "feu moyen")
- Donne des repères visuels (ex: "jusqu'à ce que les oignons soient dorés")
- Adapte les instructions au niveau ${preferences.cookingSkillLevel}
- Pour ${preferences.peopleCount} personnes exactement

IMPORTANT: Ne retourne QUE le JSON, aucun texte avant ou après.`
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