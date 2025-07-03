import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET() {
  const startTime = Date.now()
  let browser = null
  
  try {
    console.log('🔍 Starting Migros connectivity test...')
    
    // Test 1: Basic fetch without Puppeteer
    console.log('📡 Testing basic HTTP connectivity...')
    const fetchStart = Date.now()
    
    try {
      const response = await fetch('https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      const fetchTime = Date.now() - fetchStart
      console.log(`✅ Basic fetch completed in ${fetchTime}ms, status: ${response.status}`)
      
      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: 'Basic fetch failed',
          timing: { fetchTime }
        })
      }
      
      const html = await response.text()
      console.log(`📄 Received ${html.length} characters of HTML`)
      
    } catch (fetchError) {
      console.error('❌ Basic fetch failed:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Basic connectivity failed',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
        timing: { fetchTime: Date.now() - fetchStart }
      })
    }

    // Test 2: Puppeteer initialization
    console.log('🤖 Testing Puppeteer initialization...')
    const puppeteerStart = Date.now()
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    })
    
    const puppeteerTime = Date.now() - puppeteerStart
    console.log(`✅ Puppeteer launched in ${puppeteerTime}ms`)

    // Test 3: Simple page navigation
    console.log('🧭 Testing page navigation...')
    const navStart = Date.now()
    
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // Set shorter timeout for testing
    page.setDefaultTimeout(30000) // 30 seconds instead of default 60
    
    await page.goto('https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
    
    const navTime = Date.now() - navStart
    console.log(`✅ Page navigation completed in ${navTime}ms`)

    // Test 4: Basic content check
    console.log('📋 Testing content extraction...')
    const contentStart = Date.now()
    
    const title = await page.title()
    const url = page.url()
    
    // Check for basic elements
    const bodyContent = await page.evaluate(() => document.body.innerText.length)
    
    // Test our specific selectors
    const productCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-card')
      return {
        count: cards.length,
        sampleText: cards[0]?.textContent?.substring(0, 100) || 'No cards found'
      }
    })
    
    const contentTime = Date.now() - contentStart
    console.log(`✅ Content extraction completed in ${contentTime}ms`)
    console.log(`📦 Found ${productCards.count} product cards`)

    await browser.close()
    
    const totalTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      results: {
        pageTitle: title,
        pageUrl: url,
        bodyContentLength: bodyContent,
        productCards: productCards,
        timing: {
          totalTime,
          fetchTime: Date.now() - fetchStart,
          puppeteerTime,
          navTime,
          contentTime
        }
      },
      message: 'All tests passed! Scraper components are working.'
    })

  } catch (error) {
    console.error('❌ Debug test failed:', error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timing: {
        totalTime: Date.now() - startTime
      }
    }, { status: 500 })
  }
}