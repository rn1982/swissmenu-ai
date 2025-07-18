'use client'

import { useState, useEffect } from 'react'

interface ProductForReview {
  id: string
  name: string
  brand?: string
  currentPrice?: number
  priceConfidence?: string
  priceVariants?: { size: string; price: number }[]
  url?: string
  needsReview: boolean
}

interface PriceStats {
  total: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  needsReview: number
  percentageHighConfidence: string
  percentageMediumConfidence: string
  percentageLowConfidence: string
}

export default function PriceReviewPage() {
  const [products, setProducts] = useState<ProductForReview[]>([])
  const [stats, setStats] = useState<PriceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/price-review?limit=50&stats=true')
      const data = await response.json()
      setProducts(data.products)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePrice = async (productId: string, newPrice: number) => {
    setUpdating(productId)
    try {
      const response = await fetch('/api/admin/price-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          newPrice,
          confidence: 'high'
        })
      })

      if (response.ok) {
        // Remove from list after successful update
        setProducts(products.filter(p => p.id !== productId))
      }
    } catch (error) {
      console.error('Failed to update price:', error)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return <div className="p-8">Loading products for review...</div>
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Price Review Dashboard</h1>

      {stats && (
        <div className="bg-gray-100 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Price Validation Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">High Confidence</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.highConfidence} ({stats.percentageHighConfidence}%)
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Medium Confidence</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.mediumConfidence} ({stats.percentageMediumConfidence}%)
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Low Confidence</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.lowConfidence} ({stats.percentageLowConfidence}%)
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Products Needing Review</p>
            <p className="text-2xl font-bold text-orange-600">{stats.needsReview}</p>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Products Needing Price Review</h2>
      
      {products.length === 0 ? (
        <p className="text-gray-600">No products need review!</p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  {product.brand && <p className="text-gray-600">{product.brand}</p>}
                  <p className="text-sm text-gray-500">ID: {product.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    Current: CHF {product.currentPrice || 'NO PRICE'}
                  </p>
                  <p className={`text-sm ${
                    product.priceConfidence === 'high' ? 'text-green-600' :
                    product.priceConfidence === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    Confidence: {product.priceConfidence || 'Unknown'}
                  </p>
                </div>
              </div>

              {product.priceVariants && product.priceVariants.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-semibold mb-2">Price Variants Found:</p>
                  <div className="flex flex-wrap gap-2">
                    {product.priceVariants.map((variant, idx) => (
                      <button
                        key={idx}
                        onClick={() => updatePrice(product.id, variant.price)}
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-sm"
                        disabled={updating === product.id}
                      >
                        {variant.size}: CHF {variant.price}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <input
                  type="number"
                  step="0.05"
                  placeholder="New price"
                  className="px-3 py-2 border rounded"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = parseFloat((e.target as HTMLInputElement).value)
                      if (value > 0) {
                        updatePrice(product.id, value)
                      }
                    }
                  }}
                />
                
                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View on Migros →
                  </a>
                )}

                {updating === product.id && (
                  <span className="text-sm text-gray-600">Updating...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}