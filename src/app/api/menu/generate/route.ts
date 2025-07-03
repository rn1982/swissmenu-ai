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
  const prompt = createMenuPrompt(preferences)
  let lastError: Error | null = null
  
  // Retry logic for API overload or temporary failures
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Menu generation attempt ${attempt}/3`)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
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

function createMenuPrompt(preferences: UserPreferences): string {
  const dietaryRestrictions = preferences.dietaryRestrictions?.join(', ') || 'Aucune'
  const cuisinePreferences = preferences.cuisinePreferences?.join(', ') || 'Varié'
  
  return `Tu es un chef suisse spécialisé dans la planification de menus hebdomadaires. 
Génère un menu pour une semaine complète (7 jours) en français, adapté au contexte suisse.

CONTRAINTES:
- Nombre de personnes: ${preferences.peopleCount}
- Repas par jour: ${preferences.mealsPerDay}
- Budget hebdomadaire: ${preferences.budgetChf ? preferences.budgetChf + ' CHF' : 'Flexible'}
- Restrictions alimentaires: ${dietaryRestrictions}
- Préférences culinaires: ${cuisinePreferences}
- Niveau de cuisine: ${preferences.cookingSkillLevel}

DIRECTIVES IMPORTANTES:
1. Utilise des ingrédients facilement trouvables chez Migros Suisse
2. Respecte les saisons et produits locaux suisses
3. Inclus des spécialités suisses adaptées aux préférences
4. Respecte strictement le budget en CHF
5. Propose des recettes adaptées au niveau de cuisine indiqué
6. Les portions doivent correspondre au nombre de personnes

STRUCTURE REQUISE - Retourne UNIQUEMENT du JSON valide:
{
  "weekMenu": {
    "lundi": {
      "petit_dejeuner": {
        "nom": "Nom du plat",
        "description": "Description courte",
        "ingredients": ["ingrédient 1", "ingrédient 2"],
        "temps_preparation": 15,
        "difficulte": "facile|moyen|difficile",
        "cout_estime_chf": 8.50
      },
      "dejeuner": { /* même structure */ },
      "diner": { /* même structure */ }
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