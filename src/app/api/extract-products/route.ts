import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'

export async function GET() {
  let browser = null
  const startTime = Date.now()
  
  try {
    console.log('🍝 Starting product extraction from Migros pasta page...')
    
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
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--disable-features=site-per-process',
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

    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
    })

    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    await page.setUserAgent(userAgent)

    // Visit homepage first
    console.log('🌐 Establishing session via homepage...')
    await page.goto('https://www.migros.ch', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Navigate to pasta page
    console.log('🍝 Loading pasta category page...')
    const pastaUrl = 'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires'
    await page.goto(pastaUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Scroll down to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('📄 Extracting HTML content...')
    const html = await page.content()
    const $ = cheerio.load(html)

    console.log('🔍 Analyzing page structure...')
    
    // Log available selectors for debugging
    const debug = {
      productCards: $('.product-card').length,
      articles: $('article').length,
      dataTestIds: $('[data-testid]').map((_, el) => $(el).attr('data-testid')).get(),
      classesWithProduct: $('[class*="product"]').map((_, el) => el.className).get().slice(0, 10),
      elementsWithCHF: $('*:contains("CHF")').length,
      elementsWithPrice: $('*:contains(".-")').length
    }
    
    console.log('Debug info:', debug)

    // Try different selectors to find products
    let productElements = $('.product-card')
    
    if (productElements.length === 0) {
      console.log('Trying alternative selectors...')
      productElements = $('article, [data-testid*="product"], .product, .card')
    }

    console.log(`Found ${productElements.length} potential product elements`)

    const products = []
    
    productElements.each((index, element) => {
      if (index >= 20) return // Limit for testing
      
      const $el = $(element)
      
      // Extract all text content and attributes for analysis
      const elementInfo = {
        index,
        tag: element.tagName,
        className: $el.attr('class') || '',
        dataTestId: $el.attr('data-testid') || '',
        textContent: $el.text().trim().substring(0, 200),
        innerHTML: $el.html()?.substring(0, 300) || '',
        // Look for potential name
        potentialName: $el.find('h1, h2, h3, h4, .name, .title, [data-testid*="name"], [data-testid*="title"]').text().trim(),
        // Look for potential price
        potentialPrice: $el.find('*:contains("CHF"), *:contains(".-"), .price, [data-testid*="price"]').text().trim(),
        // Look for links
        links: $el.find('a').map((_, link) => $(link).attr('href')).get(),
        // Extract any data attributes
        dataAttribs: Object.keys(element.attribs || {})
          .filter(attr => attr.startsWith('data-'))
          .reduce((obj, key) => {
            obj[key] = element.attribs[key]
            return obj
          }, {} as Record<string, string>)
      }
      
      products.push(elementInfo)
    })

    await browser.close()

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      summary: {
        elementsFound: productElements.length,
        productsAnalyzed: products.length,
        totalTime,
        debug
      },
      products: products.slice(0, 10), // Return first 10 for analysis
      recommendations: products.length > 0 
        ? 'Products found - analyze structure to build extraction logic'
        : 'No products found - check selectors or page structure'
    })

  } catch (error) {
    console.error('❌ Product extraction failed:', error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Product extraction failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timing: {
        totalTime: Date.now() - startTime
      }
    }, { status: 500 })
  }
}