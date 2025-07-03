import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET() {
  let browser = null
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting enhanced Migros scraper test...')
    
    // Enhanced Puppeteer configuration for better stealth
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
        '--disable-gpu',
        // Additional stealth args
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--flag-switches-begin',
        '--flag-switches-end'
      ]
    })

    const page = await browser.newPage()
    
    // Enhanced stealth measures
    console.log('🥷 Applying stealth measures...')
    
    // Set realistic viewport
    await page.setViewport({ 
      width: 1366, 
      height: 768,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false,
    })

    // Remove automation indicators
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      })

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'fr'],
      })

      // Override permissions
      const originalQuery = window.navigator.permissions.query
      return window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Cypress.denied }) :
          originalQuery(parameters)
      )
    })

    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not_A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    })

    // Set a realistic user agent
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    await page.setUserAgent(userAgent)

    // Block unnecessary resources but allow images for now (in case they check)
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      if (['font', 'media'].includes(resourceType)) {
        req.abort()
      } else {
        req.continue()
      }
    })

    // Add random delays to seem more human
    const randomDelay = () => Math.floor(Math.random() * 2000) + 1000 // 1-3 seconds

    console.log('🌐 Navigating to Migros homepage first...')
    
    // Visit homepage first to establish session
    await page.goto('https://www.migros.ch', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    console.log('✅ Homepage loaded, waiting for session...')
    await new Promise(resolve => setTimeout(resolve, randomDelay()))

    // Accept cookies if present
    try {
      const cookieButton = await page.$('[data-testid="cookie-accept"], .cookie-accept, #cookie-accept, .accept-cookies')
      if (cookieButton) {
        console.log('🍪 Accepting cookies...')
        await cookieButton.click()
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (e) {
      console.log('🍪 No cookie dialog found')
    }

    console.log('🍝 Navigating to pasta category...')
    
    // Now navigate to pasta page
    const pastaUrl = 'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires'
    await page.goto(pastaUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    console.log('✅ Pasta page loaded, analyzing content...')
    await new Promise(resolve => setTimeout(resolve, randomDelay()))

    // Get page info
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyLength: document.body.innerText.length,
      // Test various selectors
      selectors: {
        productCard: document.querySelectorAll('.product-card').length,
        productGrid: document.querySelectorAll('.product-grid').length,
        productItem: document.querySelectorAll('.product-item').length,
        dataProductId: document.querySelectorAll('[data-product-id]').length,
        productTile: document.querySelectorAll('.product-tile').length,
        cardProduct: document.querySelectorAll('.card-product').length,
        migrosProduct: document.querySelectorAll('.mg-product, .migros-product').length,
        // Check for obvious product containers
        withPrice: document.querySelectorAll('*').length > 0 ? 
          Array.from(document.querySelectorAll('*'))
            .filter(el => el.textContent?.includes('CHF') || el.textContent?.includes('.-'))
            .length : 0
      },
      // Sample of text content to see what we're getting
      sampleText: document.body.innerText.substring(0, 500),
      // Check if we're blocked
      isBlocked: document.body.innerText.toLowerCase().includes('access denied') ||
                 document.body.innerText.toLowerCase().includes('forbidden') ||
                 document.title.toLowerCase().includes('error')
    }))

    const totalTime = Date.now() - startTime

    console.log('📊 Scraper test results:')
    console.log(`  - Page title: ${pageInfo.title}`)
    console.log(`  - Body length: ${pageInfo.bodyLength}`)
    console.log(`  - Product selectors found:`, pageInfo.selectors)
    console.log(`  - Blocked: ${pageInfo.isBlocked}`)
    console.log(`  - Total time: ${totalTime}ms`)

    await browser.close()

    return NextResponse.json({
      success: !pageInfo.isBlocked && pageInfo.bodyLength > 1000,
      pageInfo,
      timing: {
        totalTime,
        performance: totalTime < 30000 ? 'good' : 'slow'
      },
      recommendations: pageInfo.isBlocked 
        ? ['Try different user agent', 'Add more delays', 'Use residential proxy']
        : pageInfo.selectors.productCard > 0 
          ? ['Selectors working - proceed with full scraping']
          : ['Check alternative selectors', 'Content may be dynamically loaded']
    })

  } catch (error) {
    console.error('❌ Enhanced scraper test failed:', error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Enhanced scraper test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timing: {
        totalTime: Date.now() - startTime
      }
    }, { status: 500 })
  }
}