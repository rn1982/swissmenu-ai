'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Meal {
  nom: string
  description: string
  ingredients: string[]
  instructions?: string[]
  temps_preparation: number
  temps_cuisson?: number
  difficulte: string
  cout_estime_chf: number
  portions?: number
  conseils?: string
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
  ingredients_summary?: Array<{
    name: string
    quantity: string
    category: string
    recipes: string[]
  }>
}

interface WeeklyMenu {
  id: string
  weekStartDate: string
  menuData: MenuData
  totalBudgetChf: number
  createdAt?: string
}

export default function MenuPage() {
  const [menu, setMenu] = useState<WeeklyMenu | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userPreferencesId, setUserPreferencesId] = useState<string | null>(null)
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Get user preferences ID from localStorage (saved from preferences page)
    const savedPreferencesId = localStorage.getItem('userPreferencesId')
    if (savedPreferencesId) {
      setUserPreferencesId(savedPreferencesId)
      
      // Always generate a fresh menu when arriving on the page
      generateMenu(savedPreferencesId)
    }
  }, [])

  // Function to generate menu with optional parameter
  const generateMenu = async (preferencesId?: string) => {
    const prefId = preferencesId || userPreferencesId
    if (!prefId) {
      setError('Aucune préférence trouvée. Veuillez configurer vos préférences d\'abord.')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/menu/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userPreferencesId: prefId
        })
      })

      const data = await response.json()

      if (data.success) {
        setMenu(data.menu)
        // Save menu to localStorage for shopping list generation
        localStorage.setItem('currentMenu', JSON.stringify(data.menu))
        // Clear any old shopping list when new menu is generated
        localStorage.removeItem('currentShoppingList')
        localStorage.removeItem('shoppingListMenuId')
      } else {
        setError(data.error || 'Erreur lors de la génération du menu')
      }
    } catch (error) {
      setError('Erreur de connexion lors de la génération du menu')
      console.error('Menu generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }


  const getDayName = (day: string) => {
    const dayNames = {
      lundi: 'Lundi',
      mardi: 'Mardi', 
      mercredi: 'Mercredi',
      jeudi: 'Jeudi',
      vendredi: 'Vendredi',
      samedi: 'Samedi',
      dimanche: 'Dimanche'
    }
    return dayNames[day as keyof typeof dayNames] || day
  }

  const getMealName = (mealType: string) => {
    const mealNames = {
      petit_dejeuner: 'Petit-déjeuner',
      dejeuner: 'Déjeuner',
      diner: 'Dîner'
    }
    return mealNames[mealType as keyof typeof mealNames] || mealType
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const exportRecipesAsText = () => {
    if (!menu) return

    let text = `MENU DE LA SEMAINE - ${formatDate(menu.weekStartDate)}\n`
    text += '═'.repeat(50) + '\n\n'

    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    
    days.forEach(day => {
      const dayMenu = menu.menuData.weekMenu[day as keyof typeof menu.menuData.weekMenu]
      if (!dayMenu) return

      text += `${getDayName(day).toUpperCase()}\n`
      text += '─'.repeat(30) + '\n'

      Object.entries(dayMenu).forEach(([mealType, meal]) => {
        if (meal) {
          text += `\n${getMealName(mealType)}:\n`
          text += `• ${meal.nom}\n`
          text += `  ${meal.description}\n`
          text += `  Temps: ${meal.temps_preparation}min`
          if (meal.temps_cuisson) text += ` + ${meal.temps_cuisson}min cuisson`
          text += `\n  Prix: CHF ${meal.cout_estime_chf.toFixed(2)}\n`
          text += `  Difficulté: ${meal.difficulte}\n`
          
          text += `\n  Ingrédients:\n`
          meal.ingredients.forEach(ing => text += `  - ${ing}\n`)
          
          if (meal.instructions && meal.instructions.length > 0) {
            text += `\n  Instructions:\n`
            meal.instructions.forEach((inst, i) => text += `  ${i + 1}. ${inst}\n`)
          }
          text += '\n'
        }
      })
      text += '\n'
    })

    text += '═'.repeat(50) + '\n'
    text += `RÉSUMÉ:\n`
    text += `• Budget total: CHF ${menu.menuData.resume.cout_total_estime_chf.toFixed(2)}\n`
    text += `• Nombre de repas: ${menu.menuData.resume.nombre_repas}\n`
    text += `• Coût moyen par repas: CHF ${menu.menuData.resume.cout_moyen_par_repas_chf.toFixed(2)}\n`

    // Create and download file
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `menu-semaine-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const toggleRecipeSelection = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes)
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId)
    } else {
      newSelected.add(recipeId)
    }
    setSelectedRecipes(newSelected)
  }

  const selectAllRecipes = () => {
    const allRecipeIds = new Set<string>()
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    
    days.forEach(day => {
      const dayMenu = menu?.menuData.weekMenu[day as keyof typeof menu.menuData.weekMenu]
      if (dayMenu) {
        Object.entries(dayMenu).forEach(([mealType, meal]) => {
          if (meal) {
            const recipeId = `${day}-${mealType}`
            allRecipeIds.add(recipeId)
          }
        })
      }
    })
    
    setSelectedRecipes(allRecipeIds)
  }

  const deselectAllRecipes = () => {
    setSelectedRecipes(new Set())
  }

  const generateShoppingListForSelected = () => {
    if (!menu || selectedRecipes.size === 0) return

    // Create a filtered menu with only selected recipes
    const filteredMenu = { ...menu }
    const filteredWeekMenu: any = {}
    const selectedRecipeNames: string[] = []
    
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    days.forEach(day => {
      const dayMenu = menu.menuData.weekMenu[day as keyof typeof menu.menuData.weekMenu]
      if (dayMenu) {
        filteredWeekMenu[day] = {}
        Object.entries(dayMenu).forEach(([mealType, meal]) => {
          const recipeId = `${day}-${mealType}`
          if (meal && selectedRecipes.has(recipeId)) {
            filteredWeekMenu[day][mealType] = meal
            selectedRecipeNames.push(meal.nom)
          }
        })
      }
    })

    // Filter ingredients_summary to only include ingredients from selected recipes
    let filteredIngredientsSummary = []
    if (menu.menuData.ingredients_summary) {
      filteredIngredientsSummary = menu.menuData.ingredients_summary.filter((ingredient: any) => {
        // Check if this ingredient is used in any of the selected recipes
        return ingredient.recipes?.some((recipe: string) => 
          selectedRecipeNames.includes(recipe)
        )
      })
    }

    // Update the stored menu with filtered version
    const filteredMenuData = {
      ...menu,
      menuData: {
        ...menu.menuData,
        weekMenu: filteredWeekMenu,
        ingredients_summary: filteredIngredientsSummary
      }
    }

    localStorage.setItem('currentMenu', JSON.stringify(filteredMenuData))
    
    // Navigate to shopping list page
    window.location.href = '/shopping'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Votre Menu Hebdomadaire
          </h1>

          {!menu && !isGenerating && (
            <div className="text-center">
              <p className="text-xl text-gray-600 mb-8">
                Générez votre menu personnalisé basé sur vos préférences
              </p>
              <button
                onClick={() => generateMenu()}
                disabled={!userPreferencesId}
                className={`px-8 py-4 rounded-lg text-white font-semibold text-lg ${
                  userPreferencesId 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Générer mon menu
              </button>
              {!userPreferencesId && (
                <p className="text-red-600 mt-4">
                  Veuillez d&apos;abord{' '}
                  <Link href="/preferences" className="underline">
                    configurer vos préférences
                  </Link>
                </p>
              )}
            </div>
          )}

          {isGenerating && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-xl text-gray-600">
                Génération de votre menu personnalisé...
              </p>
              <p className="text-gray-500 mt-2">
                Cela peut prendre quelques instants
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {menu && (
            <div>
              {/* Menu Header */}
              <div className="mb-8 text-center">
                <p className="text-gray-600">
                  Semaine du {formatDate(menu.weekStartDate)}
                </p>
              </div>

              {/* Recipe Selection Controls */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-medium text-green-900">
                      Sélection des recettes
                    </h3>
                    <p className="text-sm text-green-700">
                      {selectedRecipes.size} sur {menu.menuData.resume.nombre_repas} recettes sélectionnées
                    </p>
                    {selectedRecipes.size === 0 && (
                      <p className="text-sm text-orange-600 font-medium mt-1">
                        ⚠️ Veuillez sélectionner au moins une recette
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllRecipes}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={deselectAllRecipes}
                      className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekly Menu Grid - Responsive layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 mb-8">
                {/* Ensure Monday-Sunday order */}
                {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((day) => {
                  const dayMenu = menu.menuData.weekMenu[day as keyof typeof menu.menuData.weekMenu]
                  if (!dayMenu) return null
                  
                  // Get current date and calculate which day is today
                  const today = new Date()
                  const weekStart = new Date(menu.weekStartDate)
                  const dayIndex = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].indexOf(day)
                  const currentDayDate = new Date(weekStart)
                  currentDayDate.setDate(weekStart.getDate() + dayIndex)
                  const isToday = today.toDateString() === currentDayDate.toDateString()
                  
                  return (
                    <div 
                      key={day} 
                      className={`border rounded-lg p-4 ${
                        isToday ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-gray-800">
                          {getDayName(day)}
                        </h2>
                        {isToday && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {Object.entries(dayMenu).map(([mealType, meal]) => {
                          const recipeId = `${day}-${mealType}`
                          const isSelected = selectedRecipes.has(recipeId)
                          
                          return (
                            <div key={mealType} className={`bg-white rounded-lg p-3 shadow-sm border-2 transition-all ${
                              isSelected ? 'border-green-500 bg-green-50' : 'border-transparent'
                            }`}>
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRecipeSelection(recipeId)}
                                  className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-semibold text-sm text-blue-800">
                                      {getMealName(mealType)}
                                    </h3>
                                    <span className="text-xs text-gray-500">
                                      {meal.temps_preparation} min
                                    </span>
                                  </div>
                            
                            <h4 className="font-medium text-gray-900 text-sm mb-1">
                              {meal.nom}
                            </h4>
                            
                            <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                              {meal.description}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">
                                {meal.difficulte}
                              </span>
                              <span className="font-semibold text-green-600">
                                {meal.cout_estime_chf.toFixed(2)} CHF
                              </span>
                            </div>
                            
                            {/* Collapsible ingredients - hidden by default for space */}
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                Voir les ingrédients ({meal.ingredients.length})
                              </summary>
                              <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                                {meal.ingredients.map((ingredient: string, index: number) => (
                                  <li key={index}>{ingredient}</li>
                                ))}
                              </ul>
                            </details>
                            
                            {/* Cooking instructions if available */}
                            {meal.instructions && meal.instructions.length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 font-medium">
                                  📖 Voir la recette
                                </summary>
                                <div className="mt-2 space-y-1 text-xs text-gray-700">
                                  {meal.temps_cuisson && (
                                    <p className="font-medium">⏱️ Temps de cuisson: {meal.temps_cuisson} min</p>
                                  )}
                                  {meal.portions && (
                                    <p className="font-medium">👥 Pour {meal.portions} personnes</p>
                                  )}
                                  <ol className="list-decimal list-inside space-y-1 mt-2">
                                    {meal.instructions.map((step: string, index: number) => (
                                      <li key={index} className="leading-relaxed">{step}</li>
                                    ))}
                                  </ol>
                                  {meal.conseils && (
                                    <p className="mt-2 italic text-gray-600">💡 {meal.conseils}</p>
                                  )}
                                </div>
                              </details>
                            )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Menu Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-bold text-blue-900 mb-4">
                  Résumé de la semaine
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2">
                      <span className="font-medium">Coût total estimé:</span>{' '}
                      <span className="text-2xl font-bold text-green-600">
                        {menu.menuData.resume.cout_total_estime_chf.toFixed(2)} CHF
                      </span>
                    </p>
                    <p className="mb-2">
                      <span className="font-medium">Nombre de repas:</span> {menu.menuData.resume.nombre_repas}
                    </p>
                    <p className="mb-4">
                      <span className="font-medium">Coût moyen par repas:</span> {menu.menuData.resume.cout_moyen_par_repas_chf.toFixed(2)} CHF
                    </p>
                    <div>
                      <span className="font-medium">Ingrédients principaux:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {menu.menuData.resume.ingredients_principaux.map((ingredient: string, index: number) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Conseils d&apos;achat:</span>
                    <p className="mt-1 text-gray-700">{menu.menuData.resume.conseils_achat}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center gap-4 mt-8">
                <div className="flex gap-4">
                  <button
                    onClick={generateShoppingListForSelected}
                    disabled={selectedRecipes.size === 0}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Créer liste de courses
                  </button>
                  <button
                    onClick={exportRecipesAsText}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                  >
                    📥 Télécharger les recettes
                  </button>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => generateMenu()}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Générer un nouveau menu
                  </button>
                  <Link 
                    href="/preferences"
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Modifier les préférences
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}