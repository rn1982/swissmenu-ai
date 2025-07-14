// Migros Direct API Access
// Uses discovered API endpoints with proper session management

import axios, { AxiosInstance } from 'axios'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'

interface MigrosSession {
  id: string
  cookies: any[]
  headers: Record<string, string>
  lastUsed: number
  requestCount: number
}

interface ProductSearchResponse {
  products: Array<{
    id: string
    name: string
    brand?: string
    price?: number
    url?: string
    imageUrl?: string
  }>
  totalCount: number
}

class MigrosDirectAPI {
  private sessions: MigrosSession[] = []
  private currentSessionIndex = 0
  private baseURL = 'https://www.migros.ch'
  private apiClient!: AxiosInstance

  constructor() {
    this.setupApiClient()
  }

  private setupApiClient() {
    const jar = new CookieJar()
    this.apiClient = wrapper(axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      jar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr-CH,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'sec-ch-ua': '"Not A(Brand";v="121", "Chromium";v="121"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      }
    }))

    // Add request interceptor for timing
    this.apiClient.interceptors.request.use(async (config) => {
      // Add random delay to mimic human behavior
      await this.randomDelay(500, 1500)
      
      // Rotate session if needed
      const session = this.getCurrentSession()
      if (session) {
        Object.assign(config.headers, session.headers)
      }
      
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`)
      return config
    })

    // Add response interceptor for session management
    this.apiClient.interceptors.response.use(
      response => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`)
        return response
      },
      error => {
        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`)
        
        // Handle 403/429 by rotating session
        if (error.response?.status === 403 || error.response?.status === 429) {
          this.rotateSession()
        }
        
        return Promise.reject(error)
      }
    )
  }

  async initializeSession(): Promise<void> {
    console.log('🔐 Initializing Migros session...')
    
    try {
      // Step 1: Get homepage to establish session
      const homeResponse = await this.apiClient.get('/fr')
      
      // Step 2: Get guest token (based on captured patterns)
      const guestResponse = await this.apiClient.post(
        '/authentication/public/v1/api/guest?authorizationNotRequired=true',
        {}
      )
      
      // Extract session data
      const session: MigrosSession = {
        id: `session-${Date.now()}`,
        cookies: [], // Will be managed by cookie jar
        headers: {
          'x-guest-token': guestResponse.data.token || '',
          'x-csrf-token': this.extractCSRFToken(homeResponse.data) || ''
        },
        lastUsed: Date.now(),
        requestCount: 0
      }
      
      this.sessions.push(session)
      console.log('✅ Session initialized:', session.id)
      
    } catch (error) {
      console.error('❌ Failed to initialize session:', error)
    }
  }

  private extractCSRFToken(html: string): string {
    // Try to extract CSRF token from HTML
    const match = html.match(/csrf[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/i)
    return match ? match[1] : ''
  }

  async searchProducts(query: string, limit = 20): Promise<ProductSearchResponse> {
    console.log(`🔍 Searching for: ${query}`)
    
    // Ensure we have a session
    if (this.sessions.length === 0) {
      await this.initializeSession()
    }
    
    try {
      // Try different API endpoints based on captured patterns
      const endpoints = [
        `/api/search/products?q=${encodeURIComponent(query)}&limit=${limit}`,
        `/api/v1/search?query=${encodeURIComponent(query)}&type=product`,
        `/fr/search?q=${encodeURIComponent(query)}&format=json`
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.apiClient.get(endpoint)
          
          if (response.data?.products || response.data?.items) {
            return this.normalizeSearchResponse(response.data)
          }
        } catch (e) {
          // Try next endpoint
        }
      }
      
      // Fallback: scrape search page
      return await this.scrapeSearchPage(query)
      
    } catch (error) {
      console.error('Search failed:', error)
      return { products: [], totalCount: 0 }
    }
  }

  private async scrapeSearchPage(query: string): Promise<ProductSearchResponse> {
    const searchUrl = `/fr/search?q=${encodeURIComponent(query)}`
    const response = await this.apiClient.get(searchUrl)
    
    // Parse HTML response
    const products: any[] = []
    
    // Basic regex to find product data
    const productMatches = response.data.matchAll(
      /data-product-id="([^"]+)"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[\s\S]*?<h\d[^>]*>([^<]+)<[\s\S]*?price[^>]*>([^<]+)</gi
    )
    
    for (const match of productMatches) {
      products.push({
        id: match[1],
        url: this.baseURL + match[2],
        name: match[3].trim(),
        price: parseFloat(match[4].replace(/[^\d.]/g, ''))
      })
    }
    
    return { products, totalCount: products.length }
  }

  async getProductDetails(productId: string): Promise<any> {
    console.log(`📦 Getting product details: ${productId}`)
    
    try {
      // Try API endpoints
      const endpoints = [
        `/api/products/${productId}`,
        `/api/v1/product/${productId}`,
        `/fr/product/${productId}?format=json`
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.apiClient.get(endpoint)
          if (response.data) {
            return response.data
          }
        } catch (e) {
          // Try next
        }
      }
      
      // Fallback: scrape product page
      return await this.scrapeProductPage(productId)
      
    } catch (error) {
      console.error('Failed to get product details:', error)
      return null
    }
  }

  private async scrapeProductPage(productId: string): Promise<any> {
    const productUrl = `/fr/product/${productId}`
    const response = await this.apiClient.get(productUrl)
    
    // Extract structured data
    const structuredDataMatch = response.data.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
    )
    
    if (structuredDataMatch) {
      try {
        return JSON.parse(structuredDataMatch[1])
      } catch {}
    }
    
    return null
  }

  private normalizeSearchResponse(data: any): ProductSearchResponse {
    const products = (data.products || data.items || []).map((item: any) => ({
      id: item.id || item.productId,
      name: item.name || item.title,
      brand: item.brand || item.manufacturer,
      price: item.price?.value || item.price,
      url: item.url || `/fr/product/${item.id}`,
      imageUrl: item.image?.url || item.imageUrl
    }))
    
    return {
      products,
      totalCount: data.totalCount || products.length
    }
  }

  private getCurrentSession(): MigrosSession | null {
    if (this.sessions.length === 0) return null
    
    const session = this.sessions[this.currentSessionIndex]
    session.lastUsed = Date.now()
    session.requestCount++
    
    // Rotate after 50 requests
    if (session.requestCount > 50) {
      this.rotateSession()
    }
    
    return session
  }

  private rotateSession() {
    this.currentSessionIndex = (this.currentSessionIndex + 1) % this.sessions.length
    console.log(`🔄 Rotated to session ${this.currentSessionIndex}`)
  }

  private async randomDelay(min: number, max: number) {
    const delay = Math.random() * (max - min) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

// Export for use in other modules
export { MigrosDirectAPI }
export type { ProductSearchResponse }