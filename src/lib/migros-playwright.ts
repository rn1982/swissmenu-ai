import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { SWISS_PRODUCT_DATABASE } from './swiss-product-database'

// Use the comprehensive Swiss product database as fallback
const ENHANCED_FALLBACK_PRODUCTS = SWISS_PRODUCT_DATABASE

// Remove legacy products since we're using the comprehensive database
/*
const LEGACY_FALLBACK_PRODUCTS = {
  pasta: [
    // Original products
    { id: 'barilla-spaghetti-5', name: 'Barilla Spaghetti N°5', brand: 'Barilla', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/11785' },
    { id: 'barilla-fusilli-98', name: 'Barilla Fusilli N°98', brand: 'Barilla', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/11792' },
    { id: 'barilla-penne-73', name: 'Barilla Penne Rigate N°73', brand: 'Barilla', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/11790' },
    { id: 'garofalo-spaghetti', name: 'Garofalo Spaghetti', brand: 'Garofalo', priceChf: 2.80, url: 'https://www.migros.ch/fr/product/104125000000' },
    { id: 'm-classic-cornettes', name: 'M-Classic Cornettes', brand: 'M-Classic', priceChf: 1.75, url: 'https://www.migros.ch/fr/product/104055200000' },
    { id: 'm-classic-spaghetti', name: 'M-Classic Spaghetti', brand: 'M-Classic', priceChf: 1.60, url: 'https://www.migros.ch/fr/product/104055100000' },
    { id: 'buitoni-lasagne', name: 'Buitoni Lasagne', brand: 'Buitoni', priceChf: 3.20, url: 'https://www.migros.ch/fr/product/104105000000' },
    { id: 'barilla-farfalle', name: 'Barilla Farfalle', brand: 'Barilla', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/11793' },
    // Additional pasta products
    { id: 'de-cecco-fusilli', name: 'De Cecco Fusilli', brand: 'De Cecco', priceChf: 2.90, url: 'https://www.migros.ch/fr/product/104135000000' },
    { id: 'migros-bio-penne', name: 'Migros Bio Penne', brand: 'Migros Bio', priceChf: 2.20, url: 'https://www.migros.ch/fr/product/104056000000' },
    { id: 'barilla-tortiglioni', name: 'Barilla Tortiglioni', brand: 'Barilla', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/11796' },
    { id: 'm-budget-spaghetti', name: 'M-Budget Spaghetti', brand: 'M-Budget', priceChf: 0.95, url: 'https://www.migros.ch/fr/product/104057000000' },
    { id: 'barilla-maccheroni', name: 'Barilla Maccheroni', brand: 'Barilla', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/11797' },
    { id: 'migros-excellence-tagliatelle', name: 'Excellence Tagliatelle', brand: 'Excellence', priceChf: 3.50, url: 'https://www.migros.ch/fr/product/104058000000' },
    { id: 'barilla-bavette', name: 'Barilla Bavette', brand: 'Barilla', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/11798' }
  ],
  meat: [
    // Original products
    { id: 'beef-mince-500g', name: 'Viande hachée de bœuf', brand: 'Migros', priceChf: 8.50, url: 'https://www.migros.ch/fr/product/200001000000' },
    { id: 'chicken-breast-500g', name: 'Blanc de poulet', brand: 'Migros', priceChf: 12.00, url: 'https://www.migros.ch/fr/product/200002000000' },
    { id: 'pork-chops-500g', name: 'Côtelettes de porc', brand: 'Migros', priceChf: 10.50, url: 'https://www.migros.ch/fr/product/200003000000' },
    { id: 'beef-steak-300g', name: 'Entrecôte de bœuf', brand: 'Migros', priceChf: 15.00, url: 'https://www.migros.ch/fr/product/200004000000' },
    { id: 'chicken-thighs-500g', name: 'Cuisses de poulet', brand: 'Migros', priceChf: 8.00, url: 'https://www.migros.ch/fr/product/200005000000' },
    // Additional meat products
    { id: 'veal-cutlets-400g', name: 'Escalopes de veau', brand: 'Migros', priceChf: 18.50, url: 'https://www.migros.ch/fr/product/200006000000' },
    { id: 'lamb-chops-500g', name: 'Côtelettes d\'agneau', brand: 'Migros', priceChf: 16.00, url: 'https://www.migros.ch/fr/product/200007000000' },
    { id: 'turkey-breast-500g', name: 'Blanc de dinde', brand: 'Migros', priceChf: 11.50, url: 'https://www.migros.ch/fr/product/200008000000' },
    { id: 'beef-roast-1kg', name: 'Rôti de bœuf', brand: 'Migros', priceChf: 22.00, url: 'https://www.migros.ch/fr/product/200009000000' },
    { id: 'pork-tenderloin-500g', name: 'Filet de porc', brand: 'Migros', priceChf: 14.50, url: 'https://www.migros.ch/fr/product/200010000000' },
    { id: 'chicken-wings-1kg', name: 'Ailes de poulet', brand: 'Migros', priceChf: 6.50, url: 'https://www.migros.ch/fr/product/200011000000' },
    { id: 'duck-breast-400g', name: 'Magret de canard', brand: 'Migros', priceChf: 19.00, url: 'https://www.migros.ch/fr/product/200012000000' }
  ],
  vegetables: [
    // Original products
    { id: 'carrots-1kg', name: 'Carottes', brand: 'Migros', priceChf: 2.80, url: 'https://www.migros.ch/fr/product/300001000000' },
    { id: 'onions-1kg', name: 'Oignons', brand: 'Migros', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/300002000000' },
    { id: 'potatoes-2kg', name: 'Pommes de terre', brand: 'Migros', priceChf: 3.20, url: 'https://www.migros.ch/fr/product/300003000000' },
    { id: 'tomatoes-500g', name: 'Tomates', brand: 'Migros', priceChf: 4.50, url: 'https://www.migros.ch/fr/product/300004000000' },
    { id: 'broccoli-500g', name: 'Brocolis', brand: 'Migros', priceChf: 3.80, url: 'https://www.migros.ch/fr/product/300005000000' },
    // Additional vegetables
    { id: 'spinach-500g', name: 'Épinards frais', brand: 'Migros', priceChf: 3.20, url: 'https://www.migros.ch/fr/product/300006000000' },
    { id: 'courgettes-500g', name: 'Courgettes', brand: 'Migros', priceChf: 3.50, url: 'https://www.migros.ch/fr/product/300007000000' },
    { id: 'bell-peppers-500g', name: 'Poivrons', brand: 'Migros', priceChf: 4.80, url: 'https://www.migros.ch/fr/product/300008000000' },
    { id: 'eggplant-500g', name: 'Aubergines', brand: 'Migros', priceChf: 3.90, url: 'https://www.migros.ch/fr/product/300009000000' },
    { id: 'mushrooms-250g', name: 'Champignons', brand: 'Migros', priceChf: 2.90, url: 'https://www.migros.ch/fr/product/300010000000' },
    { id: 'cauliflower-1pc', name: 'Chou-fleur', brand: 'Migros', priceChf: 3.50, url: 'https://www.migros.ch/fr/product/300011000000' },
    { id: 'leeks-500g', name: 'Poireaux', brand: 'Migros', priceChf: 3.20, url: 'https://www.migros.ch/fr/product/300012000000' },
    { id: 'green-beans-500g', name: 'Haricots verts', brand: 'Migros', priceChf: 4.20, url: 'https://www.migros.ch/fr/product/300013000000' },
    { id: 'lettuce-1pc', name: 'Salade verte', brand: 'Migros', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/300014000000' },
    { id: 'celery-500g', name: 'Céleri', brand: 'Migros', priceChf: 3.80, url: 'https://www.migros.ch/fr/product/300015000000' }
  ],
  dairy: [
    // Original products
    { id: 'milk-1l', name: 'Lait entier', brand: 'M-Classic', priceChf: 1.50, url: 'https://www.migros.ch/fr/product/400001000000' },
    { id: 'yogurt-500g', name: 'Yogourt nature', brand: 'M-Classic', priceChf: 2.20, url: 'https://www.migros.ch/fr/product/400002000000' },
    { id: 'cheese-gruyere-200g', name: 'Gruyère AOP', brand: 'Migros', priceChf: 6.50, url: 'https://www.migros.ch/fr/product/400003000000' },
    { id: 'butter-250g', name: 'Beurre', brand: 'M-Classic', priceChf: 3.20, url: 'https://www.migros.ch/fr/product/400004000000' },
    { id: 'eggs-12pcs', name: 'Œufs (12 pièces)', brand: 'M-Classic', priceChf: 4.80, url: 'https://www.migros.ch/fr/product/400005000000' },
    // Additional dairy products
    { id: 'cream-200ml', name: 'Crème entière', brand: 'M-Classic', priceChf: 2.40, url: 'https://www.migros.ch/fr/product/400006000000' },
    { id: 'mozzarella-150g', name: 'Mozzarella', brand: 'M-Classic', priceChf: 2.80, url: 'https://www.migros.ch/fr/product/400007000000' },
    { id: 'emmental-200g', name: 'Emmental', brand: 'Migros', priceChf: 5.50, url: 'https://www.migros.ch/fr/product/400008000000' },
    { id: 'ricotta-250g', name: 'Ricotta', brand: 'M-Classic', priceChf: 3.20, url: 'https://www.migros.ch/fr/product/400009000000' },
    { id: 'parmesan-100g', name: 'Parmesan', brand: 'M-Classic', priceChf: 4.50, url: 'https://www.migros.ch/fr/product/400010000000' },
    { id: 'sour-cream-200ml', name: 'Crème aigre', brand: 'M-Classic', priceChf: 2.20, url: 'https://www.migros.ch/fr/product/400011000000' },
    { id: 'cottage-cheese-200g', name: 'Séré maigre', brand: 'M-Classic', priceChf: 1.80, url: 'https://www.migros.ch/fr/product/400012000000' }
  ],
  bakery: [
    { id: 'baguette-250g', name: 'Baguette', brand: 'Migros', priceChf: 1.50, url: 'https://www.migros.ch/fr/product/500001000000' },
    { id: 'pain-complet-500g', name: 'Pain complet', brand: 'Migros', priceChf: 2.80, url: 'https://www.migros.ch/fr/product/500002000000' },
    { id: 'croissants-4pcs', name: 'Croissants (4 pièces)', brand: 'Migros', priceChf: 3.20, url: 'https://www.migros.ch/fr/product/500003000000' },
    { id: 'pain-blanc-500g', name: 'Pain blanc', brand: 'Migros', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/500004000000' },
    { id: 'pain-aux-noix-400g', name: 'Pain aux noix', brand: 'Migros', priceChf: 3.80, url: 'https://www.migros.ch/fr/product/500005000000' },
    { id: 'tresse-500g', name: 'Tresse au beurre', brand: 'Migros', priceChf: 3.50, url: 'https://www.migros.ch/fr/product/500006000000' },
    { id: 'pain-paysan-750g', name: 'Pain paysan', brand: 'Migros', priceChf: 4.20, url: 'https://www.migros.ch/fr/product/500007000000' }
  ],
  beverages: [
    { id: 'water-6x1.5l', name: 'Eau minérale (6x1.5L)', brand: 'Aproz', priceChf: 3.60, url: 'https://www.migros.ch/fr/product/600001000000' },
    { id: 'orange-juice-1l', name: 'Jus d\'orange', brand: 'M-Classic', priceChf: 2.80, url: 'https://www.migros.ch/fr/product/600002000000' },
    { id: 'coca-cola-6x0.5l', name: 'Coca-Cola (6x0.5L)', brand: 'Coca-Cola', priceChf: 5.40, url: 'https://www.migros.ch/fr/product/600003000000' },
    { id: 'apple-juice-1l', name: 'Jus de pomme', brand: 'M-Classic', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/600004000000' },
    { id: 'ice-tea-1.5l', name: 'Thé froid', brand: 'Migros', priceChf: 2.20, url: 'https://www.migros.ch/fr/product/600005000000' },
    { id: 'beer-6x0.5l', name: 'Bière lager (6x0.5L)', brand: 'Feldschlösschen', priceChf: 8.40, url: 'https://www.migros.ch/fr/product/600006000000' },
    { id: 'wine-rouge-75cl', name: 'Vin rouge', brand: 'M-Classic', priceChf: 6.50, url: 'https://www.migros.ch/fr/product/600007000000' }
  ],
  frozen: [
    { id: 'pizza-margherita', name: 'Pizza Margherita', brand: 'Anna\'s Best', priceChf: 4.50, url: 'https://www.migros.ch/fr/product/700001000000' },
    { id: 'fish-sticks-450g', name: 'Bâtonnets de poisson', brand: 'Pelican', priceChf: 5.80, url: 'https://www.migros.ch/fr/product/700002000000' },
    { id: 'ice-cream-vanilla-1l', name: 'Glace vanille', brand: 'M-Classic', priceChf: 3.90, url: 'https://www.migros.ch/fr/product/700003000000' },
    { id: 'mixed-vegetables-1kg', name: 'Légumes mélangés', brand: 'M-Classic', priceChf: 3.20, url: 'https://www.migros.ch/fr/product/700004000000' },
    { id: 'lasagne-bolognese-400g', name: 'Lasagne bolognaise', brand: 'Anna\'s Best', priceChf: 4.80, url: 'https://www.migros.ch/fr/product/700005000000' },
    { id: 'french-fries-1kg', name: 'Pommes frites', brand: 'M-Classic', priceChf: 2.80, url: 'https://www.migros.ch/fr/product/700006000000' },
    { id: 'spinach-frozen-600g', name: 'Épinards surgelés', brand: 'M-Classic', priceChf: 2.50, url: 'https://www.migros.ch/fr/product/700007000000' }
  ]
}
*/

interface MigrosProduct {
  id: string
  name: string
  brand?: string
  priceChf?: number
  url?: string
  imageUrl?: string
  category?: string
  source: 'api' | 'scraped' | 'fallback'
}

interface ApiResponse {
  products?: Array<{
    id: string
    name: string
    brand?: string
    prices?: {
      price?: {
        value?: number
      }
    }
    slug?: string
    image?: {
      url?: string
    }
  }>
}

class PlaywrightMigrosScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private apiData: Map<string, any> = new Map()
  private proxyConfig: any = null

  constructor() {
    // Load proxy configuration from environment
    if (process.env.PROXY_URL) {
      this.proxyConfig = {
        server: process.env.PROXY_URL,
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD
      }
      console.log('🛡️ Proxy configured:', this.proxyConfig.server)
    }
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      const launchOptions: any = {
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--disable-web-security',
          '--disable-features=BlockInsecurePrivateNetworkRequests',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      }
      
      // Add proxy if configured
      if (this.proxyConfig) {
        launchOptions.proxy = this.proxyConfig
      }
      
      this.browser = await chromium.launch(launchOptions)
      
      const contextOptions: any = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'fr-CH',
        timezoneId: 'Europe/Zurich',
        permissions: ['geolocation'],
        geolocation: { latitude: 46.9480, longitude: 7.4474 }, // Bern, Switzerland
        extraHTTPHeaders: {
          'Accept-Language': 'fr-CH,fr;q=0.9,en;q=0.8',
          'sec-ch-ua': '"Not A(Brand";v="121", "Chromium";v="121"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"'
        }
      }
      
      this.context = await this.browser.newContext(contextOptions)
    }
  }

  private async setupApiInterception(page: Page): Promise<void> {
    // Intercept API responses
    page.on('response', async (response) => {
      const url = response.url()
      
      // Look for Migros API endpoints
      if (url.includes('/api/') || url.includes('graphql')) {
        try {
          const contentType = response.headers()['content-type'] || ''
          if (contentType.includes('application/json')) {
            const data = await response.json()
            console.log(`🔍 Intercepted API: ${url.substring(0, 100)}`)
            
            // Store API data for later use
            if (data.products || data.data?.products) {
              this.apiData.set(url, data)
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    })
  }

  async scrapeWithApiFirst(category: string): Promise<MigrosProduct[]> {
    console.log(`🚀 Starting API-first scraping for ${category}`)
    
    try {
      // First, try to get data from API interception
      const apiProducts = await this.scrapeViaApi(category)
      if (apiProducts.length > 0) {
        console.log(`✅ API scraping successful: ${apiProducts.length} products`)
        return apiProducts
      }
    } catch (error) {
      console.warn(`⚠️ API scraping failed: ${error.message}`)
    }

    // Fallback to enhanced database
    console.log(`🔄 Using enhanced fallback database for ${category}`)
    const fallbackProducts = ENHANCED_FALLBACK_PRODUCTS[category as keyof typeof ENHANCED_FALLBACK_PRODUCTS] || []
    
    return fallbackProducts.map(p => ({
      ...p,
      category,
      source: 'fallback' as const
    }))
  }

  private async scrapeViaApi(category: string): Promise<MigrosProduct[]> {
    if (!this.context) await this.initialize()
    
    const page = await this.context!.newPage()
    await this.setupApiInterception(page)
    
    try {
      const categoryUrls = {
        pasta: 'https://www.migros.ch/fr/category/pates-alimentaires',
        meat: 'https://www.migros.ch/fr/category/viande-fraiche',
        vegetables: 'https://www.migros.ch/fr/category/legumes-frais',
        dairy: 'https://www.migros.ch/fr/category/lait-yogourt',
        bakery: 'https://www.migros.ch/fr/category/pain-boulangerie',
        beverages: 'https://www.migros.ch/fr/category/boissons',
        frozen: 'https://www.migros.ch/fr/category/surgeles'
      }
      
      const url = categoryUrls[category as keyof typeof categoryUrls]
      if (!url) throw new Error(`Unknown category: ${category}`)
      
      console.log(`📍 Navigating to ${url}`)
      
      // Navigate with realistic behavior
      await page.goto('https://www.migros.ch/fr', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000 + Math.random() * 2000)
      
      // Accept cookies if present
      try {
        const cookieButton = await page.locator('button:has-text("Accepter")').first()
        if (await cookieButton.isVisible({ timeout: 5000 })) {
          await cookieButton.click()
          await page.waitForTimeout(1000)
        }
      } catch (e) {
        // No cookie banner
      }
      
      // Navigate to category
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)
      
      // Scroll to trigger lazy loading
      await this.humanLikeScroll(page)
      
      // Extract products from intercepted API data
      const products: MigrosProduct[] = []
      
      for (const [url, data] of this.apiData.entries()) {
        if (data.products) {
          for (const product of data.products) {
            products.push({
              id: product.id || `api-${Date.now()}-${Math.random()}`,
              name: product.name || 'Unknown',
              brand: product.brand || product.name?.split(' ')[0],
              priceChf: product.prices?.price?.value,
              url: product.slug ? `https://www.migros.ch/fr/product/${product.slug}` : undefined,
              imageUrl: product.image?.url,
              category,
              source: 'api'
            })
          }
        }
      }
      
      // Also try direct DOM scraping as backup
      if (products.length === 0) {
        console.log('📋 Attempting DOM scraping...')
        const domProducts = await page.evaluate(() => {
          const products: any[] = []
          
          // Try multiple possible selectors
          const selectors = [
            '[data-testid="product-card"]',
            '.product-card',
            '[class*="product"]',
            'article[role="article"]'
          ]
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector)
            if (elements.length > 0) {
              console.log(`Found ${elements.length} elements with selector: ${selector}`)
              
              elements.forEach((el, index) => {
                if (index >= 20) return // Limit for testing
                
                const name = el.querySelector('[class*="name"], h3, h4')?.textContent?.trim()
                const price = el.querySelector('[class*="price"]')?.textContent?.trim()
                const link = el.querySelector('a')?.getAttribute('href')
                
                if (name) {
                  products.push({
                    id: `dom-${Date.now()}-${index}`,
                    name,
                    priceChf: price ? parseFloat(price.replace(/[^\d.]/g, '')) : undefined,
                    url: link ? `https://www.migros.ch${link}` : undefined
                  })
                }
              })
              
              if (products.length > 0) break
            }
          }
          
          return products
        })
        
        products.push(...domProducts.map(p => ({ ...p, category, source: 'scraped' as const })))
      }
      
      return products
      
    } finally {
      await page.close()
    }
  }

  private async humanLikeScroll(page: Page): Promise<void> {
    const scrolls = 3 + Math.floor(Math.random() * 3)
    
    for (let i = 0; i < scrolls; i++) {
      const scrollDistance = 300 + Math.random() * 500
      await page.evaluate((distance) => {
        window.scrollBy({
          top: distance,
          behavior: 'smooth'
        })
      }, scrollDistance)
      
      await page.waitForTimeout(1000 + Math.random() * 2000)
    }
  }

  async getAllProducts(): Promise<MigrosProduct[]> {
    const categories = ['pasta', 'meat', 'vegetables', 'dairy', 'bakery', 'beverages', 'frozen', 'pantry', 'snacks']
    const allProducts: MigrosProduct[] = []
    
    for (const category of categories) {
      const products = await this.scrapeWithApiFirst(category)
      allProducts.push(...products)
      
      // Random delay between categories
      if (category !== categories[categories.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
      }
    }
    
    return allProducts
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close()
      this.context = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// Export functions
let scraperInstance: PlaywrightMigrosScraper | null = null

export async function getPlaywrightScraper(): Promise<PlaywrightMigrosScraper> {
  if (!scraperInstance) {
    scraperInstance = new PlaywrightMigrosScraper()
    await scraperInstance.initialize()
  }
  return scraperInstance
}

export async function scrapeProductsWithPlaywright(category: string): Promise<MigrosProduct[]> {
  const scraper = await getPlaywrightScraper()
  return scraper.scrapeWithApiFirst(category)
}

export async function scrapeAllProductsWithPlaywright(): Promise<MigrosProduct[]> {
  const scraper = await getPlaywrightScraper()
  return scraper.getAllProducts()
}

export async function testPlaywrightScraper(): Promise<{
  success: boolean
  productCount: number
  apiProducts: number
  scrapedProducts: number
  fallbackProducts: number
  categories: Record<string, { count: number; source: string }>
  sampleProducts: MigrosProduct[]
}> {
  try {
    const products = await scrapeAllProductsWithPlaywright()
    const categories: Record<string, { count: number; source: string }> = {}
    
    // Group by category
    for (const product of products) {
      const cat = product.category || 'unknown'
      if (!categories[cat]) {
        categories[cat] = { count: 0, source: product.source }
      }
      categories[cat].count++
    }
    
    return {
      success: true,
      productCount: products.length,
      apiProducts: products.filter(p => p.source === 'api').length,
      scrapedProducts: products.filter(p => p.source === 'scraped').length,
      fallbackProducts: products.filter(p => p.source === 'fallback').length,
      categories,
      sampleProducts: products.slice(0, 5)
    }
  } catch (error) {
    return {
      success: false,
      productCount: 0,
      apiProducts: 0,
      scrapedProducts: 0,
      fallbackProducts: 0,
      categories: {},
      sampleProducts: []
    }
  }
}

export async function closePlaywrightScraper(): Promise<void> {
  if (scraperInstance) {
    await scraperInstance.close()
    scraperInstance = null
  }
}

export type { MigrosProduct }