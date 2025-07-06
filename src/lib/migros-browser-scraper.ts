// Migros Browser-Based Scraper
// Uses full browser context to bypass protection

import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { SWISS_PRODUCT_DATABASE } from './swiss-product-database'

interface MigrosProduct {
  id: string
  name: string
  brand?: string
  priceChf?: number
  url?: string
  imageUrl?: string
  category: string
  source: 'scraped' | 'fallback'
}

class MigrosBrowserScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private interceptedData: Map<string, any> = new Map()

  async initialize() {
    console.log('🚀 Initializing Migros browser scraper...')
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    })

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'fr-CH',
      timezoneId: 'Europe/Zurich',
      extraHTTPHeaders: {
        'Accept-Language': 'fr-CH,fr;q=0.9,en;q=0.8'
      }
    })
  }

  async scrapeCategory(category: string): Promise<MigrosProduct[]> {
    if (!this.context) await this.initialize()
    
    const page = await this.context!.newPage()
    const products: MigrosProduct[] = []
    
    try {
      // Set up API interception
      await this.setupInterception(page)
      
      // Category URLs
      const categoryUrls: Record<string, string> = {
        pasta: 'https://www.migros.ch/fr/category/pates-alimentaires',
        meat: 'https://www.migros.ch/fr/category/viande-fraiche',
        vegetables: 'https://www.migros.ch/fr/category/legumes-frais',
        dairy: 'https://www.migros.ch/fr/category/lait-yogourt',
        bakery: 'https://www.migros.ch/fr/category/pain-boulangerie',
        beverages: 'https://www.migros.ch/fr/category/boissons',
        frozen: 'https://www.migros.ch/fr/category/surgeles',
        pantry: 'https://www.migros.ch/fr/category/conserves-bocaux',
        snacks: 'https://www.migros.ch/fr/category/snacks-confiserie'
      }
      
      const url = categoryUrls[category]
      if (!url) {
        console.warn(`Unknown category: ${category}`)
        return this.getFallbackProducts(category)
      }
      
      console.log(`📍 Navigating to ${url}`)
      
      // Navigate with realistic behavior
      await page.goto('https://www.migros.ch/fr', { waitUntil: 'domcontentloaded' })
      await this.humanDelay(2000, 3000)
      
      // Handle cookies
      await this.acceptCookies(page)
      
      // Navigate to category
      await page.goto(url, { waitUntil: 'networkidle' })
      await this.humanDelay(2000, 3000)
      
      // Scroll to load products
      await this.scrollPage(page)
      
      // Extract from intercepted data
      const apiProducts = this.extractFromInterceptedData()
      if (apiProducts.length > 0) {
        console.log(`✅ Extracted ${apiProducts.length} products from API`)
        products.push(...apiProducts.map(p => ({ ...p, category, source: 'scraped' as const })))
      }
      
      // Try DOM scraping as backup
      if (products.length === 0) {
        const domProducts = await this.scrapeDOM(page)
        if (domProducts.length > 0) {
          console.log(`✅ Scraped ${domProducts.length} products from DOM`)
          products.push(...domProducts.map(p => ({ ...p, category, source: 'scraped' as const })))
        }
      }
      
    } catch (error) {
      console.error(`❌ Error scraping ${category}:`, error)
    } finally {
      await page.close()
    }
    
    // Use fallback if no products found
    if (products.length === 0) {
      console.log(`🔄 Using fallback for ${category}`)
      return this.getFallbackProducts(category)
    }
    
    return products
  }

  private async setupInterception(page: Page) {
    page.on('response', async (response) => {
      const url = response.url()
      
      // Intercept product APIs
      if (url.includes('product-display') || url.includes('product-cards')) {
        try {
          const contentType = response.headers()['content-type'] || ''
          if (contentType.includes('json')) {
            const data = await response.json()
            this.interceptedData.set(url, data)
            console.log(`🎯 Intercepted: ${url.substring(0, 80)}...`)
          }
        } catch {}
      }
    })
  }

  private extractFromInterceptedData(): any[] {
    const products: any[] = []
    
    for (const [url, data] of this.interceptedData.entries()) {
      // Product cards endpoint
      if (url.includes('product-cards') && data.productCards) {
        for (const card of data.productCards) {
          products.push({
            id: card.id,
            name: card.name,
            brand: card.brand,
            priceChf: card.offer?.price?.displayPrice || card.price,
            url: `https://www.migros.ch/fr/product/${card.id}`,
            imageUrl: card.images?.[0]?.url
          })
        }
      }
      
      // Product detail endpoint
      if (url.includes('product-detail') && data.product) {
        products.push({
          id: data.product.id,
          name: data.product.name,
          brand: data.product.brand,
          priceChf: data.product.prices?.[0]?.price,
          url: `https://www.migros.ch/fr/product/${data.product.id}`,
          imageUrl: data.product.images?.[0]?.url
        })
      }
    }
    
    return products
  }

  private async scrapeDOM(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const products: any[] = []
      
      // Try multiple selectors
      const selectors = [
        'article[data-product-id]',
        '[data-testid="product-card"]',
        '.product-card',
        '[class*="ProductCard"]'
      ]
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          elements.forEach((el, index) => {
            if (index >= 30) return // Limit
            
            const link = el.querySelector('a')
            const name = el.querySelector('[class*="name"], h3, h4')?.textContent?.trim()
            const price = el.querySelector('[class*="price"]')?.textContent?.trim()
            const productId = el.getAttribute('data-product-id') || 
                            link?.href?.match(/\/product\/(.+?)(?:\/|$)/)?.[1]
            
            if (name && productId) {
              products.push({
                id: productId,
                name,
                priceChf: price ? parseFloat(price.replace(/[^\d.]/g, '')) : undefined,
                url: link?.href || `https://www.migros.ch/fr/product/${productId}`
              })
            }
          })
          break
        }
      }
      
      return products
    })
  }

  private async acceptCookies(page: Page) {
    try {
      const cookieButton = await page.locator('button:has-text("Accepter")').first()
      if (await cookieButton.isVisible({ timeout: 3000 })) {
        await cookieButton.click()
        await this.humanDelay(500, 1000)
      }
    } catch {}
  }

  private async scrollPage(page: Page) {
    // Scroll to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight))
      await this.humanDelay(1000, 1500)
    }
  }

  private async humanDelay(min: number, max: number) {
    const delay = Math.random() * (max - min) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  private getFallbackProducts(category: string): MigrosProduct[] {
    const fallbackProducts = SWISS_PRODUCT_DATABASE[category as keyof typeof SWISS_PRODUCT_DATABASE] || []
    return fallbackProducts.map(p => ({
      ...p,
      category,
      source: 'fallback' as const
    }))
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  async testScraping() {
    console.log('🧪 Testing Migros browser scraper...')
    
    await this.initialize()
    
    // Test pasta category
    const pastaProducts = await this.scrapeCategory('pasta')
    console.log(`\nPasta products: ${pastaProducts.length}`)
    console.log(`Source: ${pastaProducts[0]?.source}`)
    
    if (pastaProducts.length > 0) {
      console.log('\nSample products:')
      pastaProducts.slice(0, 3).forEach(p => {
        console.log(`- ${p.name} (${p.brand}) - CHF ${p.priceChf} - ${p.url}`)
      })
    }
    
    await this.close()
  }
}

export { MigrosBrowserScraper, MigrosProduct }

// Test if run directly
if (require.main === module) {
  const scraper = new MigrosBrowserScraper()
  scraper.testScraping().catch(console.error)
}