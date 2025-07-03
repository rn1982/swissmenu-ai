import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'

export async function GET() {
  let browser = null
  const startTime = Date.now()
  
  try {
    console.log('🔥 Starting enhanced Migros scraper with advanced anti-detection...')
    
    // Enhanced browser setup with maximum stealth
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Faster loading
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    })

    const page = await browser.newPage()
    
    console.log('🥷 Applying advanced stealth measures...')
    
    // Remove automation indicators
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', { 
        get: () => undefined 
      })
      
      // Set realistic languages for Switzerland
      Object.defineProperty(navigator, 'languages', { 
        get: () => ['fr-CH', 'fr', 'de-CH', 'en'] 
      })
      
      // Mock plugins array
      Object.defineProperty(navigator, 'plugins', { 
        get: () => [1, 2, 3, 4, 5] 
      })
      
      // Override permissions
      const originalQuery = window.navigator.permissions?.query
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: 'denied' }) :
            originalQuery(parameters)
        )
      }

      // Remove automation properties
      delete (window as any).chrome?.runtime
      delete (window as any).__nightmare
      delete (window as any)._phantom
      delete (window as any).callPhantom
    })

    // Set Swiss-realistic viewport
    await page.setViewport({ 
      width: 1366, 
      height: 768,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false,
    })

    // Set Swiss-focused headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'fr-CH,fr;q=0.9,de-CH;q=0.8,en;q=0.7',
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

    // Human-like browsing: Start with homepage
    console.log('🏠 Establishing session via homepage...')
    await page.goto('https://www.migros.ch/fr', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    // Random human-like delay
    const randomDelay = () => Math.floor(Math.random() * 2000) + 1000
    await new Promise(resolve => setTimeout(resolve, randomDelay()))

    // Handle cookie consent like a human
    console.log('🍪 Handling cookie consent...')
    try {
      // Look for cookie consent buttons with multiple selectors
      const cookieSelectors = [
        'button[data-testid="cookie-consent-accept"]',
        'button[data-testid="cookie-accept"]',
        '.cookie-accept',
        '#cookie-accept',
        'button:contains("Accepter")',
        'button:contains("Tout accepter")',
        '[class*="cookie"] button',
        '[id*="cookie"] button'
      ]
      
      for (const selector of cookieSelectors) {
        try {
          const cookieButton = await page.$(selector)
          if (cookieButton) {
            console.log(`🍪 Found cookie button with selector: ${selector}`)
            await cookieButton.click()
            await new Promise(resolve => setTimeout(resolve, 1000))
            break
          }
        } catch (e) {
          // Try next selector
        }
      }
    } catch (e) {
      console.log('🍪 No cookie dialog found or already accepted')
    }

    // Navigate to pasta category gradually
    console.log('🍝 Navigating to pasta category...')
    const pastaUrl = 'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires'
    await page.goto(pastaUrl, { 
      waitUntil: 'networkidle2',
      timeout: 45000 
    })
    
    // Wait for content to load with human-like behavior
    console.log('⏳ Waiting for products to load...')
    await new Promise(resolve => setTimeout(resolve, randomDelay()))

    // Scroll like a human to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo({ 
        top: document.body.scrollHeight / 3, 
        behavior: 'smooth' 
      })
    })
    await new Promise(resolve => setTimeout(resolve, 2000))

    await page.evaluate(() => {
      window.scrollTo({ 
        top: document.body.scrollHeight / 2, 
        behavior: 'smooth' 
      })
    })
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Advanced product extraction
    console.log('📦 Extracting products with enhanced logic...')
    
    const products = await page.evaluate(() => {
      const results = []
      
      // Try multiple selector strategies
      const selectors = [
        '.product-card',
        '[data-testid*="product"]',
        'article',
        '.card',
        '.product',
        '[class*="product"]'
      ]
      
      let productElements: NodeListOf<Element> | null = null
      
      for (const selector of selectors) {
        productElements = document.querySelectorAll(selector)
        if (productElements.length > 0) {
          console.log(`Found ${productElements.length} elements with selector: ${selector}`)
          break
        }
      }
      
      if (!productElements || productElements.length === 0) {
        return []
      }

      productElements.forEach((element, index) => {
        if (index >= 20) return // Limit for testing
        
        const getText = (selectors: string[]) => {
          for (const sel of selectors) {
            const el = element.querySelector(sel)
            if (el && el.textContent?.trim()) {
              return el.textContent.trim()
            }
          }
          return ''
        }
        
        const getAttr = (selectors: string[], attr: string) => {
          for (const sel of selectors) {
            const el = element.querySelector(sel)
            if (el && el.getAttribute(attr)) {
              return el.getAttribute(attr)
            }
          }
          return ''
        }

        // Extract name with multiple strategies
        const name = getText([
          'h1', 'h2', 'h3', 'h4',
          '.name', '.title', '.product-name', '.product-title',
          '[data-testid*="name"]', '[data-testid*="title"]',
          'strong', 'b',
          '.headline', '.caption'
        ])

        // Extract price with multiple strategies
        const priceText = getText([
          '.price', '.prix', '[data-testid*="price"]',
          '.cost', '.amount', '.value',
          '*:contains("CHF")', '*:contains(".-")',
          '.currency'
        ])
        
        let priceNum = null
        if (priceText) {
          const priceMatch = priceText.match(/(CHF\s*)?(\d+)[.,](\d{2}|\-)/)
          if (priceMatch) {
            const wholePart = priceMatch[2]
            const decimalPart = priceMatch[3] === '-' ? '00' : priceMatch[3]
            priceNum = parseFloat(`${wholePart}.${decimalPart}`)
          }
        }

        // Extract link
        const link = getAttr(['a'], 'href') || 
                    element.closest('a')?.href ||
                    element.querySelector('a')?.href || ''

        // Extract image
        const image = getAttr(['img'], 'src') || ''

        // Extract brand
        const brand = getText([
          '.brand', '.marque', '[data-testid*="brand"]',
          '.manufacturer', '.producer'
        ])

        // Only include if we have meaningful data
        if (name && name.length > 2) {
          results.push({
            index,
            name,
            brand: brand || undefined,
            priceText,
            priceChf: priceNum,
            url: link.startsWith('http') ? link : link ? `https://www.migros.ch${link}` : undefined,
            imageUrl: image.startsWith('http') ? image : image ? `https://www.migros.ch${image}` : undefined,
            category: 'pâtes',
            fullText: element.textContent?.trim().substring(0, 200) || '',
            hasValidData: !!(name && (priceNum || priceText))
          })
        }
      })

      return results
    })

    await browser.close()

    const totalTime = Date.now() - startTime
    const validProducts = products.filter(p => p.hasValidData)

    console.log(`📊 Enhanced scraper results:`)
    console.log(`  - Total elements: ${products.length}`)
    console.log(`  - Valid products: ${validProducts.length}`)
    console.log(`  - Success rate: ${(validProducts.length / Math.max(products.length, 1) * 100).toFixed(1)}%`)
    console.log(`  - Total time: ${totalTime}ms`)

    return NextResponse.json({
      success: validProducts.length > 0,
      summary: {
        totalElements: products.length,
        validProducts: validProducts.length,
        successRate: (validProducts.length / Math.max(products.length, 1) * 100).toFixed(1) + '%',
        totalTime,
        performance: totalTime < 30000 ? 'excellent' : totalTime < 60000 ? 'good' : 'slow'
      },
      products: validProducts,
      allResults: products.slice(0, 5), // Show first 5 for debugging
      nextSteps: validProducts.length > 0 
        ? `Excellent! Found ${validProducts.length} valid products. Ready to implement production scraper.`
        : 'Need to investigate selectors further or enhance anti-detection measures.'
    })

  } catch (error) {
    console.error('❌ Enhanced Migros scraper failed:', error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Enhanced scraper failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timing: {
        totalTime: Date.now() - startTime
      },
      fallbackRecommendation: 'Switch to fallback product database for reliable operation'
    }, { status: 500 })
  }
}