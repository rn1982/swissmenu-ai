// Proxy-based scraper using residential proxy services
// Supports ScrapingBee, Bright Data, and SmartProxy

import axios from 'axios'
import * as cheerio from 'cheerio'
import { promises as fs } from 'fs'
import * as path from 'path'
import { validateUrl, isMigrosProductUrl } from './url-validator'

interface ProxyConfig {
  service: 'scrapingbee' | 'brightdata' | 'smartproxy'
  apiKey?: string
  username?: string
  password?: string
  endpoint?: string
}

interface ScrapedProduct {
  id: string
  name: string
  brand?: string
  priceChf: number
  url: string
  imageUrl?: string
  category?: string
  source: 'proxy-scraper'
}

class ProxyScraper {
  private config: ProxyConfig

  constructor(config: ProxyConfig) {
    this.config = config
  }

  async scrapeWithScrapingBee(url: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('ScrapingBee API key required')
    }

    const scrapingBeeUrl = 'https://app.scrapingbee.com/api/v1/'
    
    try {
      console.log(`🐝 Scraping with ScrapingBee: ${url}`)
      
      const response = await axios.get(scrapingBeeUrl, {
        params: {
          api_key: this.config.apiKey,
          url: url,
          render_js: 'true', // Enable JavaScript rendering
          premium_proxy: 'true', // Use residential proxies
          country_code: 'ch', // Swiss proxies
          wait: '3000', // Wait for page to load
          block_ads: 'true',
          custom_google: 'false',
          stealth_proxy: 'true' // Advanced anti-detection
        },
        timeout: 60000
      })

      console.log(`✅ ScrapingBee response received (${response.data.length} chars)`)
      return response.data
    } catch (error: any) {
      console.error('❌ ScrapingBee error:', error.response?.data || error.message)
      throw error
    }
  }

  async scrapeWithBrightData(url: string): Promise<string> {
    if (!this.config.username || !this.config.password) {
      throw new Error('Bright Data credentials required')
    }

    // Bright Data datacenter proxy endpoint
    const proxyUrl = `http://${this.config.username}:${this.config.password}@zproxy.lum-superproxy.io:22225`

    try {
      console.log(`🌟 Scraping with Bright Data: ${url}`)
      
      const response = await axios.get(url, {
        proxy: {
          protocol: 'http',
          host: 'zproxy.lum-superproxy.io',
          port: 22225,
          auth: {
            username: this.config.username,
            password: this.config.password
          }
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-CH,fr;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        timeout: 60000
      })

      console.log(`✅ Bright Data response received`)
      return response.data
    } catch (error: any) {
      console.error('❌ Bright Data error:', error.message)
      throw error
    }
  }

  async scrapeWithSmartProxy(url: string): Promise<string> {
    if (!this.config.username || !this.config.password) {
      throw new Error('SmartProxy credentials required')
    }

    // SmartProxy residential endpoint
    const proxyUrl = `http://${this.config.username}:${this.config.password}@gate.smartproxy.com:10000`

    try {
      console.log(`🔷 Scraping with SmartProxy: ${url}`)
      
      const response = await axios.get(url, {
        proxy: {
          protocol: 'http',
          host: 'gate.smartproxy.com',
          port: 10000,
          auth: {
            username: this.config.username,
            password: this.config.password
          }
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-CH,fr;q=0.9'
        },
        timeout: 60000
      })

      console.log(`✅ SmartProxy response received`)
      return response.data
    } catch (error: any) {
      console.error('❌ SmartProxy error:', error.message)
      throw error
    }
  }

  async scrapeUrl(url: string): Promise<string> {
    switch (this.config.service) {
      case 'scrapingbee':
        return this.scrapeWithScrapingBee(url)
      case 'brightdata':
        return this.scrapeWithBrightData(url)
      case 'smartproxy':
        return this.scrapeWithSmartProxy(url)
      default:
        throw new Error(`Unknown proxy service: ${this.config.service}`)
    }
  }

  parseProductFromHtml(html: string, url: string): ScrapedProduct | null {
    try {
      const $ = cheerio.load(html)
      
      // Try different selectors based on Migros page structure
      const name = $('[data-testid="product-name"]').text().trim() ||
                  $('h1.product-title').text().trim() ||
                  $('.product-name').text().trim() ||
                  $('h1').first().text().trim()

      if (!name) {
        console.warn('No product name found')
        return null
      }

      // Extract price
      const priceText = $('[data-testid="product-price"]').text() ||
                       $('.price-value').text() ||
                       $('.product-price').text() ||
                       $('.price').first().text()

      const priceMatch = priceText.match(/(\d+[.,]\d{2})/)
      const priceChf = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0

      // Extract brand
      const brand = $('[data-testid="product-brand"]').text().trim() ||
                   $('.brand-name').text().trim() ||
                   $('.product-brand').text().trim()

      // Extract image
      const imageUrl = $('[data-testid="product-image"] img').attr('src') ||
                      $('.product-image img').attr('src') ||
                      $('img.product-photo').attr('src')

      // Extract ID from URL
      const idMatch = url.match(/\/product\/(?:mo\/)?(\d+)/)
      const id = idMatch ? idMatch[1] : `scraped-${Date.now()}`

      return {
        id,
        name,
        brand: brand || undefined,
        priceChf,
        url,
        imageUrl: imageUrl || undefined,
        source: 'proxy-scraper'
      }
    } catch (error) {
      console.error('Error parsing product:', error)
      return null
    }
  }

  async scrapeProduct(productUrl: string): Promise<ScrapedProduct | null> {
    try {
      console.log(`\n🔍 Scraping product: ${productUrl}`)
      
      // Validate URL format first
      if (!isMigrosProductUrl(productUrl)) {
        console.log('❌ Invalid Migros product URL format')
        return null
      }
      
      // Validate URL is accessible
      console.log('🔗 Validating URL accessibility...')
      const validation = await validateUrl(productUrl)
      
      if (!validation.isValid) {
        console.log(`❌ URL validation failed: ${validation.statusCode || validation.error}`)
        return null
      }
      
      if (validation.redirectUrl && validation.redirectUrl !== productUrl) {
        console.log(`↪️ URL redirected to: ${validation.redirectUrl}`)
        productUrl = validation.redirectUrl
      }
      
      const html = await this.scrapeUrl(productUrl)
      const product = this.parseProductFromHtml(html, productUrl)
      
      if (product) {
        console.log(`✅ Scraped: ${product.name} - CHF ${product.priceChf}`)
        
        // Save HTML for debugging
        const debugDir = path.join(process.cwd(), 'debug-scraping')
        await fs.mkdir(debugDir, { recursive: true })
        await fs.writeFile(
          path.join(debugDir, `${product.id}.html`),
          html
        )
      } else {
        console.log('❌ Failed to parse product data')
      }
      
      return product
    } catch (error) {
      console.error(`Failed to scrape ${productUrl}:`, error)
      return null
    }
  }

  async scrapeCategory(category: string, limit = 20): Promise<ScrapedProduct[]> {
    const categoryUrls: Record<string, string> = {
      pasta: 'https://www.migros.ch/fr/category/519',
      meat: 'https://www.migros.ch/fr/category/542',
      vegetables: 'https://www.migros.ch/fr/category/501',
      dairy: 'https://www.migros.ch/fr/category/530',
      bakery: 'https://www.migros.ch/fr/category/511',
      beverages: 'https://www.migros.ch/fr/category/547',
      frozen: 'https://www.migros.ch/fr/category/536',
      pantry: 'https://www.migros.ch/fr/category/523',
      snacks: 'https://www.migros.ch/fr/category/528'
    }

    const categoryUrl = categoryUrls[category]
    if (!categoryUrl) {
      console.error(`Unknown category: ${category}`)
      return []
    }

    try {
      console.log(`\n📂 Scraping category: ${category}`)
      const html = await this.scrapeUrl(categoryUrl)
      
      // Save category page for analysis
      const debugDir = path.join(process.cwd(), 'debug-scraping')
      await fs.mkdir(debugDir, { recursive: true })
      await fs.writeFile(
        path.join(debugDir, `category-${category}.html`),
        html
      )

      // Extract product URLs from category page
      const $ = cheerio.load(html)
      const productUrls: string[] = []

      // Try different selectors for product links
      // Migros uses data attributes and dynamic loading
      $('a[href*="/product/"]').each((_, elem) => {
        const href = $(elem).attr('href')
        if (href && !href.includes('/category/')) {
          const fullUrl = href.startsWith('http') 
            ? href 
            : `https://www.migros.ch${href}`
          
          if (!productUrls.includes(fullUrl)) {
            productUrls.push(fullUrl)
          }
        }
      })

      // Also try product cards
      $('[data-testid*="product"], .product-card, .product-item').each((_, elem) => {
        const link = $(elem).find('a').attr('href')
        if (link && link.includes('/product/')) {
          const fullUrl = link.startsWith('http') 
            ? link 
            : `https://www.migros.ch${link}`
          
          if (!productUrls.includes(fullUrl)) {
            productUrls.push(fullUrl)
          }
        }
      })

      console.log(`Found ${productUrls.length} product URLs`)

      // Scrape individual products
      const products: ScrapedProduct[] = []
      for (const url of productUrls.slice(0, limit)) {
        const product = await this.scrapeProduct(url)
        if (product) {
          products.push(product)
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      return products
    } catch (error) {
      console.error(`Failed to scrape category ${category}:`, error)
      return []
    }
  }

  async testProxyService(): Promise<void> {
    console.log(`\n🧪 Testing ${this.config.service} proxy service...\n`)

    try {
      // Test with a simple Migros page
      const testUrl = 'https://www.migros.ch/fr'
      console.log(`Testing homepage: ${testUrl}`)
      
      const html = await this.scrapeUrl(testUrl)
      console.log(`✅ Homepage scraped successfully (${html.length} chars)`)
      
      // Test with a known product
      const productUrl = 'https://www.migros.ch/fr/product/mo/11790'
      console.log(`\nTesting product page: ${productUrl}`)
      
      const product = await this.scrapeProduct(productUrl)
      if (product) {
        console.log(`\n✅ Product scraped successfully:`)
        console.log(`- Name: ${product.name}`)
        console.log(`- Brand: ${product.brand}`)
        console.log(`- Price: CHF ${product.priceChf}`)
        console.log(`- URL: ${product.url}`)
      } else {
        console.log('❌ Failed to scrape product')
      }

      // Test category scraping
      console.log(`\nTesting category scraping...`)
      const products = await this.scrapeCategory('pasta', 5)
      console.log(`\n📊 Category results: ${products.length} products scraped`)
      
      products.forEach(p => {
        console.log(`- ${p.name} (${p.brand}) - CHF ${p.priceChf}`)
      })

    } catch (error) {
      console.error(`\n❌ ${this.config.service} test failed:`, error)
    }
  }
}

export { ProxyScraper, ProxyConfig, ScrapedProduct }

// Test script
if (require.main === module) {
  async function testProxyServices() {
    // Test ScrapingBee (requires API key)
    if (process.env.SCRAPINGBEE_API_KEY) {
      const scrapingBee = new ProxyScraper({
        service: 'scrapingbee',
        apiKey: process.env.SCRAPINGBEE_API_KEY
      })
      await scrapingBee.testProxyService()
    } else {
      console.log('⚠️  SCRAPINGBEE_API_KEY not set, skipping ScrapingBee test')
    }

    // Test Bright Data (requires credentials)
    if (process.env.BRIGHTDATA_USERNAME && process.env.BRIGHTDATA_PASSWORD) {
      const brightData = new ProxyScraper({
        service: 'brightdata',
        username: process.env.BRIGHTDATA_USERNAME,
        password: process.env.BRIGHTDATA_PASSWORD
      })
      await brightData.testProxyService()
    } else {
      console.log('⚠️  BRIGHTDATA credentials not set, skipping Bright Data test')
    }

    // Test SmartProxy (requires credentials)
    if (process.env.SMARTPROXY_USERNAME && process.env.SMARTPROXY_PASSWORD) {
      const smartProxy = new ProxyScraper({
        service: 'smartproxy',
        username: process.env.SMARTPROXY_USERNAME,
        password: process.env.SMARTPROXY_PASSWORD
      })
      await smartProxy.testProxyService()
    } else {
      console.log('⚠️  SMARTPROXY credentials not set, skipping SmartProxy test')
    }
  }

  testProxyServices().catch(console.error)
}