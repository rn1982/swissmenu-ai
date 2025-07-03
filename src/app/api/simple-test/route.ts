import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET() {
  try {
    console.log('🔍 Starting simple Migros connectivity test...')
    
    // Test basic HTTP connectivity with fetch
    const testUrl = 'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires'
    
    console.log(`📡 Fetching: ${testUrl}`)
    
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    console.log(`📄 Response status: ${response.status}`)
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        url: testUrl
      })
    }
    
    const html = await response.text()
    console.log(`📄 Received ${html.length} characters of HTML`)
    
    // Parse with Cheerio
    const $ = cheerio.load(html)
    const title = $('title').text()
    
    // Test our selectors
    const productCards = $('.product-card')
    const productGrids = $('.product-grid')
    const productItems = $('.product-item')
    const dataProductIds = $('[data-product-id]')
    
    console.log(`🔍 Found elements:`)
    console.log(`  - .product-card: ${productCards.length}`)
    console.log(`  - .product-grid: ${productGrids.length}`)
    console.log(`  - .product-item: ${productItems.length}`)
    console.log(`  - [data-product-id]: ${dataProductIds.length}`)
    
    // Check for other potential selectors
    const alternativeSelectors = {
      'article': $('article').length,
      '.product': $('.product').length,
      '.item': $('.item').length,
      '.card': $('.card').length,
      '[data-testid*="product"]': $('[data-testid*="product"]').length,
      '.mg-product': $('.mg-product').length,
      '.migros-product': $('.migros-product').length
    }
    
    // Sample HTML snippet for debugging
    const bodySnippet = $('body').html()?.substring(0, 500) || ''
    
    return NextResponse.json({
      success: true,
      results: {
        pageTitle: title,
        htmlLength: html.length,
        selectors: {
          productCard: productCards.length,
          productGrid: productGrids.length,
          productItem: productItems.length,
          dataProductId: dataProductIds.length
        },
        alternativeSelectors,
        bodySnippet,
        message: productCards.length > 0 
          ? `Found ${productCards.length} product cards - selectors working!`
          : 'No product cards found - may need to check selectors'
      }
    })
    
  } catch (error) {
    console.error('❌ Simple test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Simple test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}