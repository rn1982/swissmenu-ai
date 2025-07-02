import { testMigrosConnection } from '@/lib/migros'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🧪 Testing fixed Migros scraper...')
    const result = await testMigrosConnection()
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Scraper working!' : 'Scraper failed',
      productCount: result.productCount,
      sampleProduct: result.sampleProduct,
      error: result.error,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Scraper test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Scraper test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}