import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET() {
  let browser = null
  const startTime = Date.now()
  
  try {
    console.log('🧠 Starting smart scraper that waits for dynamic content...')
    
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
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor'
      ]
    })

    const page = await browser.newPage()
    
    // Apply stealth measures
    await page.setViewport({ width: 1366, height: 768 })
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
    })

    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    await page.setUserAgent(userAgent)

    // Visit homepage first
    console.log('🌐 Establishing session...')
    await page.goto('https://www.migros.ch', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })
    
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Navigate to pasta page and wait for network to be idle
    console.log('🍝 Loading pasta page and waiting for content...')
    const pastaUrl = 'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires'
    await page.goto(pastaUrl, { 
      waitUntil: 'networkidle0', // Wait until no network requests for 500ms
      timeout: 45000 
    })
    
    console.log('⏳ Waiting for products to load...')
    
    // Wait for product cards to have content
    try {
      await page.waitForFunction(() => {
        const cards = document.querySelectorAll('.product-card')
        // Check if at least one card has meaningful content
        for (let card of cards) {
          if (card.textContent && card.textContent.trim().length > 10) {
            return true
          }
        }
        return false
      }, { timeout: 30000 })
      console.log('✅ Products loaded!')
    } catch (waitError) {
      console.log('⚠️ Products may not have loaded fully, proceeding anyway...')
    }

    // Scroll to ensure all content is loaded
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Extract product data using browser context for better performance
    console.log('📦 Extracting product data...')
    const products = await page.evaluate(() => {
      const productCards = document.querySelectorAll('.product-card')
      const results = []

      productCards.forEach((card, index) => {
        if (index >= 10) return // Limit for testing

        // Get all text content
        const fullText = card.textContent?.trim() || ''
        
        // Try to find name - look for prominent text elements
        const nameElements = card.querySelectorAll('h1, h2, h3, h4, [class*="name"], [class*="title"], strong, b')
        let name = ''
        for (let el of nameElements) {
          const text = el.textContent?.trim()
          if (text && text.length > 3) {
            name = text
            break
          }
        }

        // Try to find price - look for CHF or price patterns
        const priceElements = card.querySelectorAll('*')
        let price = ''
        let priceNum = null
        for (let el of priceElements) {
          const text = el.textContent?.trim() || ''
          // Look for CHF or price patterns like "2.50" or "12.-"
          const priceMatch = text.match(/(CHF\s*)?(\d+)[.,](\d{2}|\-)/i)
          if (priceMatch) {
            price = text
            const wholePart = priceMatch[2]
            const decimalPart = priceMatch[3] === '-' ? '00' : priceMatch[3]
            priceNum = parseFloat(`${wholePart}.${decimalPart}`)
            break
          }
        }

        // Try to find link
        const linkEl = card.querySelector('a')
        const link = linkEl?.href || ''

        // Try to find image
        const imgEl = card.querySelector('img')
        const image = imgEl?.src || ''

        // Extract any data attributes
        const dataAttribs = {}
        for (let attr of card.attributes) {
          if (attr.name.startsWith('data-')) {
            dataAttribs[attr.name] = attr.value
          }
        }

        results.push({
          index,
          name: name || 'Unknown',
          price: price,
          priceNum: priceNum,
          link: link,
          image: image,
          fullText: fullText.substring(0, 200),
          textLength: fullText.length,
          dataAttribs,
          hasContent: fullText.length > 10
        })
      })

      return results
    })

    await browser.close()

    const totalTime = Date.now() - startTime
    const successfulProducts = products.filter(p => p.hasContent && p.name !== 'Unknown')

    console.log(`📊 Results: Found ${successfulProducts.length}/${products.length} products with content`)

    return NextResponse.json({
      success: successfulProducts.length > 0,
      summary: {
        totalProducts: products.length,
        successfulProducts: successfulProducts.length,
        totalTime,
        averageTextLength: products.reduce((sum, p) => sum + p.textLength, 0) / products.length
      },
      products: products,
      nextSteps: successfulProducts.length > 0 
        ? 'Great! Found products with data. Ready to build production scraper.'
        : 'Need to investigate dynamic loading further or try different selectors.'
    })

  } catch (error) {
    console.error('❌ Smart scraper failed:', error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Smart scraper failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timing: {
        totalTime: Date.now() - startTime
      }
    }, { status: 500 })
  }
}