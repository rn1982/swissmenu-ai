import { NextRequest, NextResponse } from 'next/server'
import { getProductsNeedingPriceReview, getPriceValidationStats } from '@/lib/database-helpers'
import { db } from '@/lib/db'

/**
 * GET /api/admin/price-review
 * Get products that need price review
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const includeStats = searchParams.get('stats') === 'true'

    const products = await getProductsNeedingPriceReview()
    const limitedProducts = products.slice(0, limit)

    const response: any = {
      products: limitedProducts.map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        currentPrice: p.priceChf,
        priceConfidence: p.priceConfidence,
        priceVariants: p.priceVariants,
        url: p.url,
        needsReview: p.needsPriceReview
      })),
      total: products.length,
      showing: limitedProducts.length
    }

    if (includeStats) {
      response.stats = await getPriceValidationStats()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting products for review:', error)
    return NextResponse.json(
      { error: 'Failed to get products for review' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/price-review
 * Update a product's price after manual review
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, newPrice, confidence = 'high' } = body

    if (!productId || typeof newPrice !== 'number') {
      return NextResponse.json(
        { error: 'Product ID and new price are required' },
        { status: 400 }
      )
    }

    // Update the product
    const updated = await db.migrosProduct.update({
      where: { id: productId },
      data: {
        priceChf: newPrice,
        price: newPrice,
        priceConfidence: confidence,
        needsPriceReview: false,
        lastUpdated: new Date()
      }
    })

    // Also update the Product table
    await db.product.updateMany({
      where: { migrosId: productId },
      data: {
        price: newPrice,
        priceConfidence: confidence,
        needsPriceReview: false
      }
    })

    return NextResponse.json({
      success: true,
      product: {
        id: updated.id,
        name: updated.name,
        newPrice: updated.priceChf,
        confidence: updated.priceConfidence
      }
    })
  } catch (error) {
    console.error('Error updating product price:', error)
    return NextResponse.json(
      { error: 'Failed to update product price' },
      { status: 500 }
    )
  }
}