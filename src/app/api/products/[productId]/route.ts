import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Get product by ID
    const product = await db.migrosProduct.findUnique({
      where: {
        id: productId
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Convert null values to undefined for consistent API response
    const productResponse = {
      id: product.id,
      name: product.name,
      brand: product.brand || undefined,
      priceChf: product.priceChf || undefined,
      unit: product.unit || undefined,
      category: product.category || undefined,
      url: product.url || undefined,
      imageUrl: product.imageUrl || undefined,
      ariaLabel: product.ariaLabel || undefined,
      lastUpdated: product.lastUpdated
    }

    return NextResponse.json({
      success: true,
      product: productResponse
    })

  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}