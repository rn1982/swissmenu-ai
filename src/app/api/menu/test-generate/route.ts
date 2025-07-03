import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

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

    // Generate a mock menu based on preferences (for testing without AI)
    const mockMenuData = generateMockMenu(preferences)
    
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
        menuData: mockMenuData,
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
      },
      note: "This is a test menu generated without AI. Add your Anthropic API key for real AI generation."
    })

  } catch (error) {
    console.error('Test menu generation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Test menu generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function generateMockMenu(preferences: any) {
  const budget = preferences.budgetChf || 80
  const people = preferences.peopleCount || 4
  const mealsPerDay = preferences.mealsPerDay || 3
  
  const meals = {
    lundi: {
      petit_dejeuner: {
        nom: "Müesli aux fruits",
        description: "Müesli traditionnel suisse avec fruits de saison",
        ingredients: ["müesli", "lait", "pommes", "bananes"],
        temps_preparation: 5,
        difficulte: "facile",
        cout_estime_chf: 4.50
      },
      dejeuner: {
        nom: "Salade de quinoa aux légumes",
        description: "Salade fraîche et nutritive avec quinoa et légumes croquants",
        ingredients: ["quinoa", "tomates", "concombre", "feta", "huile d'olive"],
        temps_preparation: 20,
        difficulte: "facile",
        cout_estime_chf: 8.20
      },
      diner: {
        nom: "Escalope de porc aux rösti",
        description: "Plat traditionnel suisse avec rösti croustillants",
        ingredients: ["escalope de porc", "pommes de terre", "oignon", "beurre"],
        temps_preparation: 30,
        difficulte: "moyen",
        cout_estime_chf: 12.50
      }
    },
    mardi: {
      petit_dejeuner: {
        nom: "Pain complet avec confiture",
        description: "Petit-déjeuner simple et nutritif",
        ingredients: ["pain complet", "beurre", "confiture", "café"],
        temps_preparation: 5,
        difficulte: "facile",
        cout_estime_chf: 3.80
      },
      dejeuner: {
        nom: "Soupe de légumes",
        description: "Soupe maison aux légumes de saison",
        ingredients: ["carottes", "poireaux", "pommes de terre", "bouillon"],
        temps_preparation: 25,
        difficulte: "facile",
        cout_estime_chf: 6.50
      },
      diner: {
        nom: "Spaghetti Bolognaise",
        description: "Pâtes italiennes avec sauce tomate et viande",
        ingredients: ["spaghetti", "viande hachée", "tomates", "oignon", "ail"],
        temps_preparation: 35,
        difficulte: "moyen",
        cout_estime_chf: 11.20
      }
    },
    mercredi: {
      petit_dejeuner: {
        nom: "Yogourt aux fruits",
        description: "Yogourt nature avec fruits frais",
        ingredients: ["yogourt", "miel", "fruits rouges"],
        temps_preparation: 3,
        difficulte: "facile",
        cout_estime_chf: 4.20
      },
      dejeuner: {
        nom: "Sandwich au jambon",
        description: "Sandwich frais pour un déjeuner rapide",
        ingredients: ["pain", "jambon", "fromage", "salade"],
        temps_preparation: 10,
        difficulte: "facile",
        cout_estime_chf: 7.80
      },
      diner: {
        nom: "Filet de poisson aux légumes",
        description: "Poisson grillé avec légumes vapeur",
        ingredients: ["filet de poisson", "brocolis", "carottes", "citron"],
        temps_preparation: 25,
        difficulte: "moyen",
        cout_estime_chf: 14.50
      }
    },
    jeudi: {
      petit_dejeuner: {
        nom: "Croissant et café",
        description: "Petit-déjeuner français classique",
        ingredients: ["croissant", "beurre", "confiture", "café"],
        temps_preparation: 5,
        difficulte: "facile",
        cout_estime_chf: 4.00
      },
      dejeuner: {
        nom: "Salade César",
        description: "Salade romaine avec parmesan et croûtons",
        ingredients: ["salade romaine", "parmesan", "croûtons", "sauce César"],
        temps_preparation: 15,
        difficulte: "facile",
        cout_estime_chf: 9.20
      },
      diner: {
        nom: "Fondue suisse",
        description: "Plat traditionnel suisse parfait pour partager",
        ingredients: ["fromage gruyère", "vacherin", "pain", "vin blanc"],
        temps_preparation: 20,
        difficulte: "moyen",
        cout_estime_chf: 16.80
      }
    },
    vendredi: {
      petit_dejeuner: {
        nom: "Œufs brouillés",
        description: "Œufs crémeux avec toast",
        ingredients: ["œufs", "beurre", "pain", "ciboulette"],
        temps_preparation: 10,
        difficulte: "facile",
        cout_estime_chf: 5.20
      },
      dejeuner: {
        nom: "Quiche lorraine",
        description: "Tarte salée aux lardons et fromage",
        ingredients: ["pâte brisée", "œufs", "crème", "lardons", "fromage"],
        temps_preparation: 45,
        difficulte: "moyen",
        cout_estime_chf: 10.50
      },
      diner: {
        nom: "Pizza margherita",
        description: "Pizza classique à la tomate et mozzarella",
        ingredients: ["pâte à pizza", "sauce tomate", "mozzarella", "basilic"],
        temps_preparation: 30,
        difficulte: "moyen",
        cout_estime_chf: 9.80
      }
    },
    samedi: {
      petit_dejeuner: {
        nom: "Pancakes aux fruits",
        description: "Pancakes moelleux avec sirop d'érable",
        ingredients: ["farine", "œufs", "lait", "fruits", "sirop d'érable"],
        temps_preparation: 20,
        difficulte: "moyen",
        cout_estime_chf: 6.50
      },
      dejeuner: {
        nom: "Burger maison",
        description: "Hamburger fait maison avec frites",
        ingredients: ["pain burger", "steak haché", "salade", "tomate", "pommes de terre"],
        temps_preparation: 35,
        difficulte: "moyen",
        cout_estime_chf: 13.20
      },
      diner: {
        nom: "Raclette traditionnelle",
        description: "Fromage fondu avec pommes de terre et charcuterie",
        ingredients: ["fromage à raclette", "pommes de terre", "cornichons", "charcuterie"],
        temps_preparation: 15,
        difficulte: "facile",
        cout_estime_chf: 18.50
      }
    },
    dimanche: {
      petit_dejeuner: {
        nom: "Brunch dominical",
        description: "Petit-déjeuner copieux du dimanche",
        ingredients: ["œufs", "bacon", "pain", "jus d'orange", "café"],
        temps_preparation: 25,
        difficulte: "moyen",
        cout_estime_chf: 8.80
      },
      dejeuner: {
        nom: "Rôti de bœuf",
        description: "Rôti traditionnel avec légumes",
        ingredients: ["rôti de bœuf", "carottes", "pommes de terre", "oignon"],
        temps_preparation: 90,
        difficulte: "difficile",
        cout_estime_chf: 22.50
      },
      diner: {
        nom: "Soupe et salade",
        description: "Repas léger pour terminer la semaine",
        ingredients: ["légumes variés", "bouillon", "salade verte", "vinaigrette"],
        temps_preparation: 20,
        difficulte: "facile",
        cout_estime_chf: 7.20
      }
    }
  }

  // Filter meals based on meals per day
  const filteredMeals: any = {}
  Object.keys(meals).forEach(day => {
    filteredMeals[day] = {}
    const dayMeals = (meals as any)[day]
    
    if (mealsPerDay >= 1) filteredMeals[day].petit_dejeuner = dayMeals.petit_dejeuner
    if (mealsPerDay >= 2) filteredMeals[day].dejeuner = dayMeals.dejeuner
    if (mealsPerDay >= 3) filteredMeals[day].diner = dayMeals.diner
  })

  // Calculate totals
  let totalCost = 0
  let totalMeals = 0
  const allIngredients = new Set<string>()

  Object.values(filteredMeals).forEach((day: any) => {
    Object.values(day).forEach((meal: any) => {
      totalCost += meal.cout_estime_chf
      totalMeals += 1
      meal.ingredients.forEach((ingredient: string) => allIngredients.add(ingredient))
    })
  })

  return {
    weekMenu: filteredMeals,
    resume: {
      cout_total_estime_chf: Math.round(totalCost * 100) / 100,
      nombre_repas: totalMeals,
      cout_moyen_par_repas_chf: Math.round((totalCost / totalMeals) * 100) / 100,
      ingredients_principaux: Array.from(allIngredients).slice(0, 10),
      conseils_achat: `Pour ${people} personnes, privilégiez les achats groupés chez Migros pour optimiser votre budget de ${budget} CHF.`
    }
  }
}