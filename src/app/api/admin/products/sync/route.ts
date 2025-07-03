import { db } from '@/lib/db'
import { getMigrosScraper, closeMigrosScraper, MIGROS_CONFIG, type MigrosProduct } from '@/lib/migros'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categories, force = false } = body

    // Validate categories parameter
    const availableCategories = Object.keys(MIGROS_CONFIG.categories)
    const categoriesToSync = categories || ['pasta'] // Default to pasta for testing

    if (!Array.isArray(categoriesToSync)) {
      return NextResponse.json(
        { error: 'Categories must be an array' },
        { status: 400 }
      )
    }

    // Validate category names
    const invalidCategories = categoriesToSync.filter(
      (cat: string) => !availableCategories.includes(cat)
    )
    if (invalidCategories.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid categories',
          invalid: invalidCategories,
          available: availableCategories
        },
        { status: 400 }
      )
    }

    const results = {
      categories: categoriesToSync,
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as string[],
      startTime: new Date().toISOString()
    }

    console.log(`Starting Migros product sync for categories: ${categoriesToSync.join(', ')}`)

    try {
      const scraper = await getMigrosScraper()

      for (const categoryKey of categoriesToSync) {
        const categoryPath = MIGROS_CONFIG.categories[categoryKey as keyof typeof MIGROS_CONFIG.categories]
        
        try {
          console.log(`Syncing category: ${categoryKey} (${categoryPath})`)
          
          // Use the corrected scraper for all categories
          const products = await scraper.scrapeCategory(categoryPath)
          
          console.log(`Found ${products.length} products in ${categoryKey}`)

          // Process each product
          for (const product of products) {
            try {
              await upsertProduct(product, force)
              results.processed++
              
              // Check if product was created or updated
              const existingProduct = await db.migrosProduct.findUnique({
                where: { id: product.id }
              })
              
              if (existingProduct) {
                results.updated++
              } else {
                results.created++
              }

            } catch (error) {
              const errorMsg = `Failed to process product ${product.id}: ${error}`
              console.error(errorMsg)
              results.errors.push(errorMsg)
            }
          }

        } catch (error) {
          const errorMsg = `Failed to scrape category ${categoryKey}: ${error}`
          console.error(errorMsg)
          results.errors.push(errorMsg)
        }
      }

    } finally {
      await closeMigrosScraper()
    }

    results.created = results.processed - results.updated

    console.log(`Sync completed. Processed: ${results.processed}, Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`)

    return NextResponse.json({
      success: true,
      results,
      endTime: new Date().toISOString()
    })

  } catch (error) {
    console.error('Product sync error:', error)
    
    // Ensure scraper is closed even on error
    try {
      await closeMigrosScraper()
    } catch (closeError) {
      console.error('Error closing scraper:', closeError)
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Product sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function upsertProduct(product: MigrosProduct, force = false): Promise<void> {
  try {
    // Check if product exists
    const existingProduct = await db.migrosProduct.findUnique({
      where: { id: product.id }
    })

    const productData = {
      id: product.id,
      name: product.name,
      brand: product.brand || null,
      priceChf: product.priceChf || null,
      unit: product.unit || null,
      category: product.category || null,
      url: product.url || null,
      imageUrl: product.imageUrl || null,
      ariaLabel: product.ariaLabel || null,
      lastUpdated: new Date()
    }

    if (existingProduct) {
      // Update existing product
      if (force || shouldUpdateProduct(existingProduct, product)) {
        await db.migrosProduct.update({
          where: { id: product.id },
          data: productData
        })
        console.log(`Updated product: ${product.name}`)
      } else {
        console.log(`Skipped product (no changes): ${product.name}`)
      }
    } else {
      // Create new product
      await db.migrosProduct.create({
        data: productData
      })
      console.log(`Created product: ${product.name}`)
    }

  } catch (error) {
    console.error(`Error upserting product ${product.id}:`, error)
    throw error
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shouldUpdateProduct(existing: any, scraped: MigrosProduct): boolean {
  // Update if price has changed
  if (existing.priceChf !== scraped.priceChf) {
    return true
  }

  // Update if name has changed
  if (existing.name !== scraped.name) {
    return true
  }

  // Update if URL has changed
  if (existing.url !== scraped.url) {
    return true
  }

  // Update if it's been more than 24 hours since last update
  const lastUpdate = new Date(existing.lastUpdated)
  const now = new Date()
  const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
  
  return hoursSinceUpdate > 24
}

export async function GET() {
  try {
    // Get sync status and recent products
    const productCount = await db.migrosProduct.count()
    const recentProducts = await db.migrosProduct.findMany({
      take: 10,
      orderBy: { lastUpdated: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        priceChf: true,
        lastUpdated: true
      }
    })

    const categoryStats = await db.migrosProduct.groupBy({
      by: ['category'],
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      totalProducts: productCount,
      availableCategories: Object.keys(MIGROS_CONFIG.categories),
      categoryStats: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.id
      })),
      recentProducts
    })

  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}