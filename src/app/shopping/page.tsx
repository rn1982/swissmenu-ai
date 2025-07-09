'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  checked?: boolean
  matchScore?: number
  matchReason?: string
  confidence?: 'high' | 'medium' | 'low'
  source?: string
  searchUrl?: string
}

interface ShoppingList {
  id: string
  menuId: string
  createdAt: string
  peopleCount: number
  items: ShoppingItem[] // Changed from categories to flat list
  summary: {
    totalItems: number
    totalCost: number
    averageItemCost: number
    estimatedBudget: number
    actualCost: number
    savings: number
  }
  unmatched: string[]
}

export default function ShoppingPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Try to load existing shopping list from localStorage
    const savedList = localStorage.getItem('currentShoppingList')
    if (savedList) {
      try {
        const parsed = JSON.parse(savedList)
        
        // Convert old format (categories) to new format (items)
        if (parsed.categories && !parsed.items) {
          const allItems: ShoppingItem[] = []
          parsed.categories.forEach((category: any) => {
            allItems.push(...category.items)
          })
          parsed.items = allItems
        }
        
        setShoppingList(parsed)
      } catch (e) {
        console.error('Failed to parse saved shopping list:', e)
      }
    }
  }, [])

  const generateShoppingList = async () => {
    const savedMenu = localStorage.getItem('currentMenu')
    const savedPreferencesId = localStorage.getItem('userPreferencesId')
    
    if (!savedMenu) {
      setError('Aucun menu trouvé. Veuillez d&apos;abord générer un menu.')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const menuData = JSON.parse(savedMenu)
      const preferences = savedPreferencesId ? 
        await fetch(`/api/preferences`).then(r => r.json()) : 
        { peopleCount: 4 }

      const response = await fetch('/api/shopping/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menuData: menuData.menuData,
          peopleCount: preferences.peopleCount || 4
        })
      })

      const data = await response.json()

      if (data.success) {
        setShoppingList(data.shoppingList)
        localStorage.setItem('currentShoppingList', JSON.stringify(data.shoppingList))
      } else {
        setError(data.error || 'Erreur lors de la génération de la liste de courses')
      }
    } catch (error) {
      setError('Erreur de connexion lors de la génération de la liste')
      console.error('Shopping list generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleItem = (itemId: string) => {
    const newCheckedItems = new Set(checkedItems)
    if (newCheckedItems.has(itemId)) {
      newCheckedItems.delete(itemId)
    } else {
      newCheckedItems.add(itemId)
    }
    setCheckedItems(newCheckedItems)
  }

  const getProgress = () => {
    if (!shoppingList) return 0
    const totalItems = shoppingList.summary.totalItems
    const checkedCount = checkedItems.size
    return totalItems > 0 ? (checkedCount / totalItems) * 100 : 0
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Liste de Courses
          </h1>

          {!shoppingList && !isGenerating && (
            <div className="text-center">
              <p className="text-xl text-gray-600 mb-8">
                Générez votre liste de courses basée sur votre menu hebdomadaire
              </p>
              <button
                onClick={generateShoppingList}
                className="px-8 py-4 rounded-lg text-white font-semibold text-lg bg-green-600 hover:bg-green-700"
              >
                Générer ma liste de courses
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-xl text-gray-600">
                Génération de votre liste de courses...
              </p>
              <p className="text-gray-500 mt-2">
                Recherche des produits Migros correspondants
              </p>
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-2">Analyse des ingrédients...</div>
                <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                  <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
              <div className="mt-4">
                <Link href="/menu" className="text-red-600 underline">
                  Retour au menu
                </Link>
              </div>
            </div>
          )}

          {shoppingList && (
            <div>
              {/* Shopping List Header */}
              <div className="mb-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-green-900">
                        Résumé de vos courses
                      </h2>
                      <p className="text-green-700">
                        Généré le {formatDate(shoppingList.createdAt)}
                      </p>
                      <p className="text-green-700">
                        Pour {shoppingList.peopleCount} personne{shoppingList.peopleCount > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        CHF {shoppingList.summary.totalCost.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-700">
                        {shoppingList.summary.totalItems} articles
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-green-700 mb-1">
                      <span>Progression des courses</span>
                      <span>{checkedItems.size}/{shoppingList.summary.totalItems}</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgress()}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-green-700">
                      <span className="font-medium">Base de données:</span> {shoppingList.summary.totalItems} produits trouvés sur Migros.ch
                    </div>
                    {shoppingList.unmatched && shoppingList.unmatched.length > 0 && (
                      <div className="text-sm text-yellow-700">
                        <span className="font-medium">À vérifier:</span> {shoppingList.unmatched.length} ingrédients non trouvés
                      </div>
                    )}
                    <div className="flex justify-center gap-4 mt-4">
                      <button
                        onClick={generateShoppingList}
                        disabled={isGenerating}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Regénérer la liste
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shopping Items - Flat List */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Articles de la liste
                </h3>
                <div className="grid gap-3">
                  {(shoppingList.items || []).map((item, itemIndex) => (
                        <div 
                          key={itemIndex} 
                          className={`flex items-center p-4 border rounded-lg transition-all ${
                            checkedItems.has(item.id) 
                              ? 'bg-gray-50 border-gray-300 opacity-60' 
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checkedItems.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500 mr-4"
                          />
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`font-medium ${
                                  checkedItems.has(item.id) ? 'line-through text-gray-500' : 'text-gray-900'
                                }`}>
                                  {item.name}
                                </h4>
                                {item.brand && (
                                  <p className="text-sm text-gray-600">{item.brand}</p>
                                )}
                                <p className="text-sm text-gray-500">
                                  {item.quantity}x {item.unit}
                                </p>
                                {item.matchedIngredients.length > 0 && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Pour: {item.matchedIngredients.join(', ')}
                                  </p>
                                )}
                                {item.matchReason && (
                                  <p className="text-xs text-gray-500 mt-1" title={item.matchReason}>
                                    {item.matchScore && `(${Math.round(item.matchScore * 100)}% match)`}
                                  </p>
                                )}
                              </div>
                              
                              <div className="text-right ml-4">
                                <div className="font-semibold text-gray-900">
                                  CHF {item.totalPrice.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  CHF {item.priceChf.toFixed(2)} / unité
                                </div>
                                {item.confidence && (
                                  <div className="mt-1">
                                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                      item.confidence === 'high' 
                                        ? 'bg-green-100 text-green-800' 
                                        : item.confidence === 'medium'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {item.confidence === 'high' ? '✓ Exact' : 
                                       item.confidence === 'medium' ? '≈ Proche' : 
                                       '? Approximatif'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <a
                            href={item.searchUrl || `https://www.migros.ch/fr/search?query=${encodeURIComponent(item.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm transition-colors"
                          >
                            Voir chez Migros
                          </a>
                        </div>
                  ))}
                </div>
              </div>

              {/* Unmatched Ingredients */}
              {shoppingList.unmatched.length > 0 && (
                <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-4">
                    Ingrédients non trouvés
                  </h3>
                  <p className="text-yellow-800 mb-3">
                    Ces ingrédients n&apos;ont pas pu être associés à des produits Migros:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {shoppingList.unmatched.map((ingredient, index) => (
                      <span 
                        key={index}
                        className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                  <p className="text-yellow-700 text-sm mt-3">
                    Vous devrez les chercher manuellement chez Migros.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-8">
                <Link 
                  href="/menu"
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Retour au menu
                </Link>
                <Link 
                  href="/preferences"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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