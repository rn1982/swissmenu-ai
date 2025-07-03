import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract search parameters
    const query = searchParams.get('query') || ''
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build search conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereConditions: Record<string, any> = {}

    // Text search across name and brand
    if (query.trim()) {
      whereConditions.OR = [
        {
          name: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          brand: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Category filter
    if (category) {
      whereConditions.category = {
        contains: category,
        mode: 'insensitive'
      }
    }

    // Brand filter
    if (brand) {
      whereConditions.brand = {
        contains: brand,
        mode: 'insensitive'
      }
    }

    // Price range filter
    if (minPrice || maxPrice) {
      whereConditions.priceChf = {}
      
      if (minPrice) {
        const min = parseFloat(minPrice)
        if (!isNaN(min)) {
          whereConditions.priceChf.gte = min
        }
      }
      
      if (maxPrice) {
        const max = parseFloat(maxPrice)
        if (!isNaN(max)) {
          whereConditions.priceChf.lte = max
        }
      }
    }

    // Execute search query
    const [products, totalCount] = await Promise.all([
      db.migrosProduct.findMany({
        where: whereConditions,
        orderBy: [
          { name: 'asc' },
          { priceChf: 'asc' }
        ],
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          brand: true,
          priceChf: true,
          unit: true,
          category: true,
          url: true,
          imageUrl: true,
          lastUpdated: true
        }
      }),
      db.migrosProduct.count({
        where: whereConditions
      })
    ])

    // Calculate pagination info
    const hasMore = (offset + limit) < totalCount
    const totalPages = Math.ceil(totalCount / limit)
    const currentPage = Math.floor(offset / limit) + 1

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          total: totalCount,
          limit,
          offset,
          currentPage,
          totalPages,
          hasMore
        },
        filters: {
          query,
          category,
          brand,
          minPrice: minPrice ? parseFloat(minPrice) : null,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null
        }
      }
    })

  } catch (error) {
    console.error('Product search error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      ingredients = [], 
      budget
    } = body

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Ingredients array is required' },
        { status: 400 }
      )
    }

    const matchedProducts = []

    // For each ingredient, find matching products
    for (const ingredient of ingredients) {
      const { name, quantity, unit } = ingredient

      if (!name) continue

      // Search for products matching this ingredient
      const searchTerms = name.toLowerCase().split(' ')
      const products = await db.migrosProduct.findMany({
        where: {
          OR: searchTerms.map((term: string) => ({
            name: {
              contains: term,
              mode: 'insensitive'
            }
          }))
        },
        orderBy: [
          { priceChf: 'asc' }, // Prefer cheaper options
          { name: 'asc' }
        ],
        take: 5 // Limit to top 5 matches per ingredient
      })

      if (products.length > 0) {
        matchedProducts.push({
          ingredient: {
            name,
            quantity,
            unit
          },
          matches: products.map(product => ({
            ...product,
            matchScore: calculateMatchScore(name, product.name)
          }))
        })
      }
    }

    // Apply budget filtering if specified
    if (budget && typeof budget === 'number') {
      const totalEstimatedCost = matchedProducts.reduce((sum, item) => {
        const bestMatch = item.matches[0]
        return sum + (bestMatch?.priceChf || 0)
      }, 0)

      // Add budget information to response
      return NextResponse.json({
        success: true,
        data: {
          matchedProducts,
          budgetAnalysis: {
            estimatedTotal: totalEstimatedCost,
            budget,
            withinBudget: totalEstimatedCost <= budget,
            savings: budget - totalEstimatedCost
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        matchedProducts
      }
    })

  } catch (error) {
    console.error('Product matching error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Product matching failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to calculate match score between ingredient and product name
function calculateMatchScore(ingredient: string, productName: string): number {
  const ingredientLower = ingredient.toLowerCase()
  const productLower = productName.toLowerCase()

  // Exact match
  if (ingredientLower === productLower) return 1.0

  // Contains ingredient name
  if (productLower.includes(ingredientLower)) return 0.8

  // Word overlap
  const ingredientWords = ingredientLower.split(' ')
  const productWords = productLower.split(' ')
  const overlap = ingredientWords.filter(word => 
    productWords.some(prodWord => prodWord.includes(word) || word.includes(prodWord))
  ).length

  const score = overlap / Math.max(ingredientWords.length, productWords.length)
  return Math.max(score, 0.1) // Minimum score of 0.1
}