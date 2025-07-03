import puppeteer, { Browser, Page } from 'puppeteer'
import * as cheerio from 'cheerio'
import pLimit from 'p-limit'

// Rate limiting: 1 request/second, max 2 concurrent as per TRD
const limit = pLimit(2)
const RATE_LIMIT_DELAY = 1000 // 1 second between requests

// Migros configuration based on structure analysis
export const MIGROS_CONFIG = {
  baseUrl: 'https://www.migros.ch',
  selectors: {
    // CONFIRMED working selectors from manual testing
    productCard: '.product-card',
    productName: '.name',
    productPrice: '.price',
    productLink: 'a',
    productImage: 'img',
    // Fallback selectors if needed
    productBrand: '.product-brand',
    promotionBadge: '.promotion-badge',
    productIdAttr: '[data-product-id]',
    skuAttr: '[data-sku]'
  },
  searchQueries: {
    pasta: 'pates',
    meat: 'viande',
    vegetables: 'legumes',
    dairy: 'lait',
    bread: 'pain',
    cheese: 'fromage'
  },
  categories: {
    pasta: '/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires',
    meat: '/fr/category/viande-poisson/viande-fraiche',
    vegetables: '/fr/category/fruits-legumes/legumes-frais',
    dairy: '/fr/category/lait-beurre-oeufs/lait-creme-yogourt'
  },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

export interface MigrosProduct {
  id: string
  name: string
  brand?: string
  priceChf?: number
  unit?: string
  category?: string
  url?: string
  imageUrl?: string
  ariaLabel?: string
  promotions?: string[]
}

class MigrosScraper {
  private browser: Browser | null = null
  private lastRequestTime = 0

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
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
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.')
    }

    const page = await this.browser.newPage()
    
    // Set user agent to avoid detection
    await page.setUserAgent(MIGROS_CONFIG.userAgent)
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      if (['image', 'stylesheet', 'font'].includes(resourceType)) {
        req.abort()
      } else {
        req.continue()
      }
    })

    return page
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractProductData($: cheerio.CheerioAPI, element: any): MigrosProduct | null {
    try {
      const $element = $(element)
      
      // Extract basic product information using CONFIRMED selectors
      const name = $element.find(MIGROS_CONFIG.selectors.productName).text().trim()
      if (!name) return null

      // Extract product ID from data attributes or URL
      let id = $element.attr('data-product-id') || $element.find('[data-product-id]').attr('data-product-id')
      if (!id) {
        const link = $element.find(MIGROS_CONFIG.selectors.productLink).attr('href')
        if (link) {
          // Extract ID from URL pattern
          const match = link.match(/\/product\/([^\/\?]+)/)
          id = match?.[1] || `unknown-${Date.now()}`
        } else {
          // Generate ID from name if no link found
          id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20) + '-' + Date.now()
        }
      }

      // Extract price information using CONFIRMED selector
      let priceChf: number | undefined
      const priceText = $element.find(MIGROS_CONFIG.selectors.productPrice).text().trim()
      if (priceText) {
        // Handle various price formats: "2.50", "Prix 2.50", "CHF 2.50"
        const priceMatch = priceText.match(/(\d+\.?\d*)/i)
        if (priceMatch) {
          priceChf = parseFloat(priceMatch[1])
        }
      }

      // Extract other attributes
      const brand = $element.find(MIGROS_CONFIG.selectors.productBrand).text().trim() || undefined
      const link = $element.find(MIGROS_CONFIG.selectors.productLink).attr('href')
      const url = link ? (link.startsWith('http') ? link : `${MIGROS_CONFIG.baseUrl}${link}`) : undefined
      const imageUrl = $element.find(MIGROS_CONFIG.selectors.productImage).attr('src')
      const ariaLabel = $element.attr('aria-label') || undefined

      // Extract promotion badges
      const promotions: string[] = []
      $element.find(MIGROS_CONFIG.selectors.promotionBadge).each((_, badge) => {
        const promotion = $(badge).text().trim()
        if (promotion) promotions.push(promotion)
      })

      return {
        id,
        name,
        brand,
        priceChf,
        url,
        imageUrl,
        ariaLabel,
        promotions: promotions.length > 0 ? promotions : undefined
      }
    } catch (error) {
      console.error('Error extracting product data:', error)
      return null
    }
  }

  async scrapeSearch(searchQuery: string): Promise<MigrosProduct[]> {
    return limit(async () => {
      await this.enforceRateLimit()
      
      const page = await this.createPage()
      const products: MigrosProduct[] = []

      try {
        const url = `${MIGROS_CONFIG.baseUrl}/fr/search?query=${encodeURIComponent(searchQuery)}`
        console.log(`Scraping search: ${url}`)

        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000
        })

        // Wait for search results to load
        await new Promise(resolve => setTimeout(resolve, 3000))

        const content = await page.content()
        const $ = cheerio.load(content)

        console.log('Page title:', $('title').text())
        console.log('Page content length:', content.length)

        // Debug: Check what selectors are available
        console.log('Available product-related elements:')
        console.log('- .product-grid:', $('.product-grid').length)
        console.log('- .product-item:', $('.product-item').length) 
        console.log('- .product-card:', $('.product-card').length)
        console.log('- [data-product-id]:', $('[data-product-id]').length)

        // Try multiple selector strategies for search results
        let productElements = $(MIGROS_CONFIG.selectors.productCard)
        
        if (productElements.length === 0) {
          console.log('Trying alternative selectors for search results...')
          productElements = $('.product-card')
          
          if (productElements.length === 0) {
            productElements = $('[data-product-id]')
          }
          
          if (productElements.length === 0) {
            // Try search-specific selectors
            productElements = $('.search-result-item, .search-product, .result-item')
          }
          
          if (productElements.length === 0) {
            // Try to find any element that might contain product info
            productElements = $('*').filter((_, el) => {
              const text = $(el).text().toLowerCase()
              return text.includes(searchQuery.toLowerCase()) && 
                     (text.includes('prix') || text.includes('chf'))
            })
          }
        }

        console.log(`Found ${productElements.length} product elements`)

        // Extract products from the page
        productElements.each((_, element) => {
          const product = this.extractProductData($, element)
          if (product) {
            product.category = searchQuery
            products.push(product)
          }
        })

        console.log(`Successfully extracted ${products.length} products`)
        return products

      } catch (error) {
        console.error(`Error scraping search ${searchQuery}:`, error)
        throw error
      } finally {
        await page.close()
      }
    })
  }

  async scrapeCategory(categoryPath: string): Promise<MigrosProduct[]> {
    return limit(async () => {
      await this.enforceRateLimit()
      
      const page = await this.createPage()
      const products: MigrosProduct[] = []

      try {
        const url = `${MIGROS_CONFIG.baseUrl}${categoryPath}`
        console.log(`Scraping category: ${url}`)

        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000
        })

        // Wait for dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Get page content and parse with Cheerio
        const content = await page.content()
        const $ = cheerio.load(content)

        console.log('Page title:', $('title').text())
        console.log('Page content length:', content.length)

        // Use CONFIRMED working selector
        const productElements = $(MIGROS_CONFIG.selectors.productCard)
        console.log(`Found ${productElements.length} .product-card elements`)

        // Extract products using confirmed approach
        productElements.each((_, element) => {
          const product = this.extractProductData($, element)
          if (product) {
            product.category = categoryPath.split('/').pop() || 'unknown'
            products.push(product)
          }
        })

        console.log(`Successfully extracted ${products.length} products`)
        return products

      } catch (error) {
        console.error(`Error scraping category ${categoryPath}:`, error)
        throw error
      } finally {
        await page.close()
      }
    })
  }

  async scrapeMultipleCategories(categoryPaths: string[]): Promise<MigrosProduct[]> {
    const allProducts: MigrosProduct[] = []

    for (const categoryPath of categoryPaths) {
      try {
        const products = await this.scrapeCategory(categoryPath)
        allProducts.push(...products)
        
        // Additional delay between categories
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Failed to scrape category ${categoryPath}:`, error)
        // Continue with other categories
      }
    }

    return allProducts
  }
}

// Singleton instance
let scraperInstance: MigrosScraper | null = null

export async function getMigrosScraper(): Promise<MigrosScraper> {
  if (!scraperInstance) {
    scraperInstance = new MigrosScraper()
    await scraperInstance.init()
  }
  return scraperInstance
}

export async function closeMigrosScraper(): Promise<void> {
  if (scraperInstance) {
    await scraperInstance.close()
    scraperInstance = null
  }
}

// Convenience functions for specific categories
export async function scrapePastaProducts(): Promise<MigrosProduct[]> {
  const scraper = await getMigrosScraper()
  return scraper.scrapeCategory(MIGROS_CONFIG.categories.pasta)
}

export async function scrapeAllFoodCategories(): Promise<MigrosProduct[]> {
  const scraper = await getMigrosScraper()
  return scraper.scrapeMultipleCategories(Object.values(MIGROS_CONFIG.categories))
}

export async function scrapeProductsByQuery(query: string): Promise<MigrosProduct[]> {
  const scraper = await getMigrosScraper()
  return scraper.scrapeSearch(query)
}

// Test function for validation
export async function testMigrosConnection(): Promise<{
  success: boolean
  productCount: number
  sampleProduct?: MigrosProduct
  error?: string
}> {
  try {
    console.log('🧪 Testing Migros connection with confirmed approach...')
    
    const products = await scrapePastaProducts()
    
    const result = {
      success: products.length > 0,
      productCount: products.length,
      sampleProduct: products[0] || undefined
    }
    
    if (result.success) {
      console.log(`✅ Success! Found ${products.length} products`)
      console.log(`📦 Sample product: ${products[0]?.name}`)
    } else {
      console.log('❌ No products found')
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return {
      success: false,
      productCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  } finally {
    await closeMigrosScraper()
  }
}