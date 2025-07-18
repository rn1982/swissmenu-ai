'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PreferencesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [preferencesId, setPreferencesId] = useState<string | null>(null)
  const [preferences, setPreferences] = useState({
    peopleCount: 2,
    mealsPerDay: 2,
    budgetChf: 150,
    dietaryRestrictions: [] as string[],
    cuisinePreferences: [] as string[],
    cookingSkillLevel: 'intermediate'
  })

  useEffect(() => {
    // Load existing preferences if available
    const loadPreferences = async () => {
      try {
        // Check if we have a preferences ID in localStorage
        const savedPreferencesId = localStorage.getItem('userPreferencesId')
        
        if (savedPreferencesId) {
          // Try to fetch existing preferences
          const response = await fetch('/api/preferences')
          if (response.ok) {
            const data = await response.json()
            setPreferences({
              peopleCount: data.peopleCount,
              mealsPerDay: data.mealsPerDay,
              budgetChf: data.budgetChf || 150,
              dietaryRestrictions: data.dietaryRestrictions || [],
              cuisinePreferences: data.cuisinePreferences || [],
              cookingSkillLevel: data.cookingSkillLevel
            })
            setPreferencesId(data.id)
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      } finally {
        setLoadingPreferences(false)
      }
    }

    loadPreferences()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...preferences,
          ...(preferencesId && { id: preferencesId })
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.preferences?.id) {
          // Save the preferences ID to localStorage for menu generation
          localStorage.setItem('userPreferencesId', data.preferences.id)
        }
        router.push('/menu')
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        alert(`Erreur lors de la sauvegarde des préférences: ${errorData.error || 'Erreur inconnue'}`)
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Erreur lors de la sauvegarde des préférences')
    } finally {
      setLoading(false)
    }
  }

  if (loadingPreferences) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos préférences...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {preferencesId ? 'Modifier vos préférences' : 'Vos préférences alimentaires'}
          </h1>
          <p className="text-gray-600 mb-8">
            Aidez-nous à créer des menus personnalisés selon vos goûts et besoins
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Nombre de personnes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de personnes dans le foyer
              </label>
              <select
                value={preferences.peopleCount}
                onChange={(e) => setPreferences({...preferences, peopleCount: Number(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[1,2,3,4,5,6,7,8].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'personne' : 'personnes'}</option>
                ))}
              </select>
            </div>

            {/* Repas par jour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repas planifiés par jour
              </label>
              <select
                value={preferences.mealsPerDay}
                onChange={(e) => setPreferences({...preferences, mealsPerDay: Number(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1 repas (dîner seulement)</option>
                <option value={2}>2 repas (déjeuner et dîner)</option>
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget hebdomadaire (CHF)
              </label>
              <input
                type="number"
                min="50"
                max="500"
                step="10"
                value={preferences.budgetChf}
                onChange={(e) => setPreferences({...preferences, budgetChf: Number(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="150"
              />
              <p className="text-sm text-gray-500 mt-1">Budget recommandé: CHF 100-200 par semaine</p>
            </div>

            {/* Niveau de cuisine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau de cuisine
              </label>
              <select
                value={preferences.cookingSkillLevel}
                onChange={(e) => setPreferences({...preferences, cookingSkillLevel: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Débutant (recettes simples, 15-30 min)</option>
                <option value="intermediate">Intermédiaire (recettes variées, 30-60 min)</option>
                <option value="advanced">Avancé (recettes complexes, 60+ min)</option>
              </select>
            </div>

            {/* Boutons */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sauvegarde...' : (preferencesId ? 'Mettre à jour et générer' : 'Générer mon menu')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}