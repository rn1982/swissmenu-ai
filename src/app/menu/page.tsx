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

  useEffect(() => {
    // Get user preferences ID from localStorage (saved from preferences page)
    const savedPreferencesId = localStorage.getItem('userPreferencesId')
    if (savedPreferencesId) {
      setUserPreferencesId(savedPreferencesId)
      // Try to load existing menu
      loadExistingMenu(savedPreferencesId)
    }
  }, [])

  const loadExistingMenu = async (preferencesId: string) => {
    try {
      const response = await fetch(`/api/menu/generate?userPreferencesId=${preferencesId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMenu(data.menu)
          // Save menu to localStorage for shopping list generation
          localStorage.setItem('currentMenu', JSON.stringify(data.menu))
        }
      }
    } catch (error) {
      console.error('Failed to load existing menu:', error)
    }
  }

  const generateMenu = async () => {
    if (!userPreferencesId) {
      setError('Aucune préférence trouvée. Veuillez configurer vos préférences d&apos;abord.')
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
          userPreferencesId
        })
      })

      const data = await response.json()

      if (data.success) {
        setMenu(data.menu)
        // Save menu to localStorage for shopping list generation
        localStorage.setItem('currentMenu', JSON.stringify(data.menu))
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
                onClick={generateMenu}
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
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={generateMenu}
                    disabled={isGenerating}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Regénérer le menu
                  </button>
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
                        {Object.entries(dayMenu).map(([mealType, meal]) => (
                          <div key={mealType} className="bg-white rounded-lg p-3 shadow-sm">
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
                        ))}
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
              <div className="flex justify-center gap-4 mt-8">
                <Link 
                  href="/shopping"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Générer la liste de courses
                </Link>
                <Link 
                  href="/preferences"
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Modifier les préférences
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}