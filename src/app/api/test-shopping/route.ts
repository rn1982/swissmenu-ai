import { NextResponse } from 'next/server'

export async function GET() {
  // Mock menu data for testing the shopping list generation
  const mockMenu = {
    weekMenu: {
      lundi: {
        petit_dejeuner: {
          nom: "Pain avec Beurre et Confiture",
          description: "Petit-déjeuner simple et délicieux",
          ingredients: ["pain complet", "beurre", "confiture"],
          temps_preparation: 5,
          difficulte: "facile",
          cout_estime_chf: 3.50
        },
        dejeuner: {
          nom: "Salade de Tomates et Mozzarella",
          description: "Salade fraîche avec des tomates cerises",
          ingredients: ["tomates cerises", "mozzarella", "basilic frais", "huile olive"],
          temps_preparation: 15,
          difficulte: "facile",
          cout_estime_chf: 8.50
        },
        diner: {
          nom: "Spaghetti à la Bolognaise",
          description: "Plat classique avec sauce maison",
          ingredients: ["spaghetti", "boeuf hache", "tomates concassees", "oignons", "ail", "huile olive"],
          temps_preparation: 45,
          difficulte: "moyen",
          cout_estime_chf: 12.50
        }
      },
      mardi: {
        dejeuner: {
          nom: "Omelette aux Herbes",
          description: "Omelette avec herbes fraîches",
          ingredients: ["oeufs", "lait", "herbes", "beurre"],
          temps_preparation: 10,
          difficulte: "facile",
          cout_estime_chf: 6.00
        },
        diner: {
          nom: "Filet de Saumon Grillé",
          description: "Saumon avec légumes de saison",
          ingredients: ["saumon filet", "courgettes", "carottes", "huile olive"],
          temps_preparation: 30,
          difficulte: "moyen",
          cout_estime_chf: 15.50
        }
      },
      mercredi: {
        diner: {
          nom: "Penne aux Légumes",
          description: "Pâtes colorées avec légumes frais",
          ingredients: ["penne", "aubergines", "poivrons", "tomates", "ail"],
          temps_preparation: 25,
          difficulte: "facile",
          cout_estime_chf: 9.00
        }
      }
    },
    resume: {
      cout_total_estime_chf: 145.80,
      nombre_repas: 18,
      cout_moyen_par_repas_chf: 8.10,
      ingredients_principaux: [
        "spaghetti", "penne", "tomates", "huile olive", "ail", 
        "oeufs", "beurre", "saumon", "boeuf hache", "mozzarella"
      ],
      conseils_achat: "Privilégiez les légumes de saison et les produits Terra Suisse pour la qualité."
    }
  }

  // Test the shopping list generation
  try {
    const response = await fetch('http://localhost:3000/api/shopping/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        menuData: mockMenu,
        peopleCount: 4
      })
    })

    const shoppingData = await response.json()

    return NextResponse.json({
      success: true,
      mockMenu,
      shoppingList: shoppingData.shoppingList,
      testResults: {
        menuGenerated: true,
        shoppingListGenerated: shoppingData.success,
        productsMatched: shoppingData.shoppingList?.summary.totalItems || 0,
        totalCost: shoppingData.shoppingList?.summary.totalCost || 0,
        categories: shoppingData.shoppingList?.categories.length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}