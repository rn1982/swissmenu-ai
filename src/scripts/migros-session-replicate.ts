// Migros Session Replicator
// Uses captured session data to perfectly replicate browser behavior

import { chromium, Page, BrowserContext } from 'playwright'
import * as fs from 'fs/promises'
import * as path from 'path'

interface SessionConfig {
  cookies: any[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  userAgent: string
  viewport: { width: number; height: number }
}

interface RequestPattern {
  url: string
  method: string
  headers: Record<string, string>
  timing: number
}

class MigrosSessionReplicator {
  private sessionConfig!: SessionConfig
  private requestPatterns: RequestPattern[] = []
  private browser: any
  private context!: BrowserContext
  private page!: Page

  async loadSession(sessionFile: string) {
    console.log('📂 Loading session from:', sessionFile)
    const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf-8'))
    this.sessionConfig = sessionData
    
    // Load request patterns if available
    const requestsFile = sessionFile.replace('session-', 'requests-')
    try {
      const requests = JSON.parse(await fs.readFile(requestsFile, 'utf-8'))
      this.analyzeRequestPatterns(requests)
    } catch (e) {
      console.log('⚠️ No request patterns found')
    }
  }

  analyzeRequestPatterns(requests: any[]) {
    // Extract timing patterns
    let lastTimestamp = 0
    this.requestPatterns = requests.map(req => {
      const timing = lastTimestamp ? req.timestamp - lastTimestamp : 0
      lastTimestamp = req.timestamp
      
      return {
        url: req.url,
        method: req.method,
        headers: req.headers,
        timing
      }
    })
    
    console.log(`📊 Analyzed ${this.requestPatterns.length} request patterns`)
  }

  async setupBrowser() {
    console.log('🌐 Setting up browser with captured configuration...')
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security'
      ]
    })

    // Create context with exact same configuration
    this.context = await this.browser.newContext({
      viewport: this.sessionConfig.viewport,
      userAgent: this.sessionConfig.userAgent,
      locale: 'fr-CH',
      timezoneId: 'Europe/Zurich',
      // Add cookies from session
      storageState: {
        cookies: this.sessionConfig.cookies,
        origins: []
      }
    })

    this.page = await this.context.newPage()

    // Inject localStorage
    await this.page.goto('https://www.migros.ch/fr')
    await this.page.evaluate((localStorage) => {
      Object.entries(localStorage).forEach(([key, value]) => {
        window.localStorage.setItem(key, value)
      })
    }, this.sessionConfig.localStorage)

    console.log('✅ Browser configured with captured session')
  }

  async replicateSearch(searchTerm: string) {
    console.log(`🔍 Replicating search for: ${searchTerm}`)
    
    // Wait like a human would
    await this.humanDelay(1000, 2000)
    
    // Find and click search box
    const searchBox = await this.page.locator('input[type="search"], input[placeholder*="Rechercher"]').first()
    await searchBox.click()
    await this.humanDelay(300, 500)
    
    // Type like a human
    for (const char of searchTerm) {
      await searchBox.type(char)
      await this.humanDelay(50, 150)
    }
    
    await this.humanDelay(500, 1000)
    await searchBox.press('Enter')
    
    // Wait for results
    await this.page.waitForLoadState('networkidle')
    await this.humanDelay(1000, 2000)
    
    return await this.extractProducts()
  }

  async extractProducts() {
    console.log('📦 Extracting product data...')
    
    // Try multiple selectors based on Migros structure
    const products = await this.page.evaluate(() => {
      const results: any[] = []
      
      // Common product selectors
      const selectors = [
        '[data-testid="product-card"]',
        '.product-card',
        'article[data-product-id]',
        '[class*="ProductCard"]'
      ]
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          console.log(`Found ${elements.length} products with selector: ${selector}`)
          
          elements.forEach(el => {
            const link = el.querySelector('a')
            const name = el.querySelector('[class*="name"], h3, h4')?.textContent
            const price = el.querySelector('[class*="price"]')?.textContent
            
            if (link && name) {
              results.push({
                name: name.trim(),
                url: link.href,
                price: price?.trim(),
                productId: link.href.match(/\/product\/(.+?)(?:\/|$)/)?.[1]
              })
            }
          })
          break
        }
      }
      
      return results
    })
    
    console.log(`✅ Found ${products.length} products`)
    return products
  }

  async navigateToProduct(productUrl: string) {
    console.log(`📍 Navigating to product: ${productUrl}`)
    
    await this.humanDelay(1000, 2000)
    await this.page.goto(productUrl)
    await this.page.waitForLoadState('networkidle')
    
    // Extract detailed product info
    const productData = await this.page.evaluate(() => {
      const data: any = {
        url: window.location.href,
        title: document.title
      }
      
      // Try to find product data in page
      const scripts = document.querySelectorAll('script[type="application/ld+json"]')
      scripts.forEach(script => {
        try {
          const json = JSON.parse(script.textContent || '{}')
          if (json['@type'] === 'Product') {
            data.structured = json
          }
        } catch {}
      })
      
      return data
    })
    
    return productData
  }

  private async humanDelay(min: number, max: number) {
    const delay = Math.random() * (max - min) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
    }
  }
}

// Test the replicator
async function main() {
  const replicator = new MigrosSessionReplicator()
  
  // Find latest session file
  const sessionsDir = path.join(process.cwd(), 'captured-sessions')
  try {
    const files = await fs.readdir(sessionsDir)
    const sessionFiles = files.filter(f => f.startsWith('session-'))
    
    if (sessionFiles.length === 0) {
      console.log('❌ No captured sessions found. Run migros-session-capture.ts first!')
      return
    }
    
    const latestSession = sessionFiles.sort().pop()!
    await replicator.loadSession(path.join(sessionsDir, latestSession))
    await replicator.setupBrowser()
    
    // Test search
    const products = await replicator.replicateSearch('pasta')
    console.log('\n🍝 Found products:')
    products.slice(0, 5).forEach(p => {
      console.log(`- ${p.name}: ${p.url}`)
    })
    
    // Test navigating to a product
    if (products.length > 0) {
      const productData = await replicator.navigateToProduct(products[0].url)
      console.log('\n📄 Product page data:', productData)
    }
    
    await replicator.close()
    
  } catch (error) {
    console.error('Error:', error)
  }
}

main().catch(console.error)