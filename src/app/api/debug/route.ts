import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'

export async function GET(request: NextRequest) {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      anthropic_api_key: !!process.env.ANTHROPIC_API_KEY,
      anthropic_api_key_format: process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-') || false,
      database_url: !!process.env.DATABASE_URL,
      database_connection: false,
      user_preferences_count: 0,
      menu_count: 0,
      product_count: 0,
      anthropic_test: false
    },
    errors: [] as string[]
  }

  try {
    // Test database connection
    const userPrefsCount = await db.userPreferences.count()
    debug.checks.user_preferences_count = userPrefsCount
    debug.checks.database_connection = true
    
    const menuCount = await db.weeklyMenu.count()
    debug.checks.menu_count = menuCount
    
    const productCount = await db.migrosProduct.count()
    debug.checks.product_count = productCount
    
  } catch (error) {
    debug.errors.push(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    debug.checks.database_connection = false
  }

  try {
    // Test Anthropic API with a simple request
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 20,
      messages: [
        {
          role: 'user',
          content: 'Say "API test successful" in French.'
        }
      ]
    })
    
    const content = response.content[0]
    if (content.type === 'text') {
      debug.checks.anthropic_test = content.text.includes('API') || content.text.includes('test')
    }
  } catch (error) {
    debug.errors.push(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    debug.checks.anthropic_test = false
  }

  // Overall health check
  const isHealthy = debug.checks.database_connection && 
                   debug.checks.anthropic_api_key && 
                   debug.checks.anthropic_test

  return NextResponse.json({
    success: isHealthy,
    debug,
    recommendations: getRecommendations(debug)
  })
}

function getRecommendations(debug: any): string[] {
  const recommendations: string[] = []
  
  if (!debug.checks.anthropic_api_key) {
    recommendations.push('Add ANTHROPIC_API_KEY to .env.local')
  } else if (!debug.checks.anthropic_api_key_format) {
    recommendations.push('Check ANTHROPIC_API_KEY format - should start with sk-ant-')
  }
  
  if (!debug.checks.database_connection) {
    recommendations.push('Check database connection and DATABASE_URL')
  }
  
  if (!debug.checks.anthropic_test) {
    recommendations.push('Anthropic API test failed - check API key validity')
  }
  
  if (debug.checks.user_preferences_count === 0) {
    recommendations.push('No user preferences found - create test preferences')
  }
  
  if (debug.checks.product_count === 0) {
    recommendations.push('No products in database - run product seeding')
  }
  
  return recommendations
}