import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Basic API test starting...')
    
    // Just test basic functionality
    const result = {
      success: true,
      message: 'API endpoint is working',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform
    }
    
    console.log('✅ Basic test completed successfully')
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Basic test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Basic test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}