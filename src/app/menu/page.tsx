'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Meal {
  nom: string
  description: string
  ingredients: string[]
  temps_preparation: number
  difficulte: string
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

              {/* Weekly Menu Grid */}
              <div className="grid gap-6 mb-8">
                {Object.entries(menu.menuData.weekMenu).map(([day, dayMenu]) => (
                  <div key={day} className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      {getDayName(day)}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      {Object.entries(dayMenu).map(([mealType, meal]) => (
                        <div key={mealType} className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-lg text-blue-800 mb-2">
                            {getMealName(mealType)}
                          </h3>
                          <h4 className="font-medium text-gray-900 mb-2">
                            {meal.nom}
                          </h4>
                          <p className="text-gray-600 text-sm mb-3">
                            {meal.description}
                          </p>
                          <div className="space-y-2 text-sm">
                            <p>
                              <span className="font-medium">Temps:</span> {meal.temps_preparation} min
                            </p>
                            <p>
                              <span className="font-medium">Difficulté:</span> {meal.difficulte}
                            </p>
                            <p>
                              <span className="font-medium">Coût:</span> {meal.cout_estime_chf.toFixed(2)} CHF
                            </p>
                            <div>
                              <span className="font-medium">Ingrédients:</span>
                              <ul className="list-disc list-inside mt-1 text-gray-600">
                                {meal.ingredients.map((ingredient: string, index: number) => (
                                  <li key={index}>{ingredient}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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