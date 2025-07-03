import { NextRequest, NextResponse } from 'next/server'
import { scrapeAllProductsWithPlaywright, closePlaywrightScraper } from '@/lib/migros-playwright'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 Starting enhanced product sync...')
  
  try {
    // Get all products using Playwright with API interception
    const products = await scrapeAllProductsWithPlaywright()
    
    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No products retrieved from enhanced scraper or fallback',
        duration: Date.now() - startTime
      }, { status: 500 })
    }

    // Statistics tracking
    const stats = {
      api: products.filter(p => p.source === 'api').length,
      scraped: products.filter(p => p.source === 'scraped').length,
      fallback: products.filter(p => p.source === 'fallback').length,
      total: products.length
    }

    console.log(`📊 Product sources: ${stats.api} API, ${stats.scraped} scraped, ${stats.fallback} fallback`)

    // Clear existing products and insert new ones
    await db.migrosProduct.deleteMany({})
    console.log('🗑️ Cleared existing products')

    // Insert products in batches
    const batchSize = 50
    let insertedCount = 0
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      
      const formattedBatch = batch.map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand || null,
        priceChf: product.priceChf || null,
        unit: product.category === 'pasta' ? '500g' : 
              product.category === 'meat' ? '500g' :
              product.category === 'vegetables' ? '1kg' :
              product.category === 'dairy' ? '1L' : '',
        category: product.category || 'autres',
        url: product.url || null,
        imageUrl: product.imageUrl || null,
        ariaLabel: product.ariaLabel || null,
        lastUpdated: new Date()
      }))

      await db.migrosProduct.createMany({
        data: formattedBatch,
        skipDuplicates: true
      })
      
      insertedCount += formattedBatch.length
      console.log(`📦 Inserted batch ${Math.ceil((i + batchSize) / batchSize)} (${insertedCount}/${products.length})`)
    }

    const duration = Date.now() - startTime
    console.log(`✅ Enhanced sync completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Enhanced product sync completed successfully',
      stats: {
        ...stats,
        inserted: insertedCount,
        duration: `${duration}ms`
      },
      recommendations: generateRecommendations(stats),
      nextSteps: [
        'Test product matching with new dataset',
        'Verify shopping list generation accuracy',
        'Monitor scraping success rates',
        'Set up automatic sync schedule'
      ]
    })

  } catch (error) {
    console.error('❌ Enhanced sync failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Enhanced product sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 })
    
  } finally {
    // Always clean up the scraper
    await closePlaywrightScraper()
  }
}

function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = []
  
  if (stats.api > 0) {
    recommendations.push('🎉 API interception successful! This is the most reliable method')
    recommendations.push('📊 Consider expanding API monitoring to capture more endpoints')
  } else if (stats.scraped > 0) {
    recommendations.push('✅ DOM scraping working! Consider optimizing selectors for better coverage')
    recommendations.push('🔍 Monitor which categories scrape best and adjust strategy')
  } else {
    recommendations.push('⚠️ Relying on fallback database - investigate Migros blocking mechanisms')
    recommendations.push('🛡️ Consider implementing proxy rotation or different scraping times')
    recommendations.push('🔧 The fallback database ensures the app always works')
  }
  
  if (stats.total < 50) {
    recommendations.push('📊 Product database is small - expand fallback database or improve scraping')
  }
  
  recommendations.push('🔄 Set up automatic daily/weekly sync to keep prices current')
  recommendations.push('📱 Add user feedback system to improve product matching accuracy')
  
  return recommendations
}

// Get sync status and statistics
export async function GET() {
  try {
    const productCount = await db.migrosProduct.count()
    const categories = await db.migrosProduct.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    })

    // Get sample products from each category
    const sampleProducts = await db.migrosProduct.findMany({
      take: 5,
      orderBy: { lastUpdated: 'desc' },
      select: {
        id: true,
        name: true,
        brand: true,
        priceChf: true,
        category: true,
        url: true,
        lastUpdated: true
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts: productCount,
        categoriesCount: categories.length,
        categories: categories.map(c => ({
          name: c.category,
          count: c._count.category
        }))
      },
      sampleProducts,
      lastSync: sampleProducts[0]?.lastUpdated || null
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}