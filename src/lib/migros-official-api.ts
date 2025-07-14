// Migros Official API Integration
// Using the migros-api-wrapper for legitimate API access

import { MigrosAPI } from 'migros-api-wrapper'

// Define types locally since the module types are not accessible
interface IProductSearchBody {
  query?: string
  regionId?: string
  limit?: number
  offset?: number
  language?: string
  from?: number
  size?: number
  [key: string]: any // Allow additional properties
}

interface IProductDetailOptions {
  productId?: string
  uids?: string
  region?: string
  [key: string]: any
}

interface MigrosProduct {
  id: string
  name: string
  brand?: string
  priceChf: number
  url: string
  imageUrl?: string
  category?: string
  source: 'api' | 'fallback'
}

interface SearchOptions {
  limit?: number
  offset?: number
  sortBy?: 'price' | 'name' | 'relevance'
}

class MigrosOfficialAPI {
  private guestToken: string | null = null
  private tokenExpiry: number = 0

  async ensureToken(): Promise<void> {
    // Check if token exists and is not expired
    if (this.guestToken && Date.now() < this.tokenExpiry) {
      return
    }

    console.log('🔐 Getting new guest token...')
    try {
      const guestInfo = await MigrosAPI.account.oauth2.getGuestToken()
      this.guestToken = guestInfo.token
      // Token expires in 1 hour, refresh 5 minutes before
      this.tokenExpiry = Date.now() + (55 * 60 * 1000)
      console.log('✅ Guest token obtained')
    } catch (error) {
      console.error('❌ Failed to get guest token:', error)
      throw new Error('Failed to authenticate with Migros API')
    }
  }

  async searchProducts(query: string, options: SearchOptions = {}): Promise<MigrosProduct[]> {
    await this.ensureToken()

    console.log(`🔍 Searching for: ${query}`)

    try {
      const searchBody: IProductSearchBody = {
        query,
        language: 'FR', // French for Swiss context
        regionId: 'national',
        from: options.offset || 0,
        size: options.limit || 20
      }

      const headers = {
        leshopch: this.guestToken!,
        'accept-language': 'fr-CH,fr;q=0.9'
      }

      const response = await MigrosAPI.products.productSearch.searchProduct(
        searchBody as any,
        headers
      )

      if (!response.products || response.products.length === 0) {
        console.log('No products found')
        return []
      }

      return this.transformProducts(response.products)
    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  }

  async getProductDetails(productId: string): Promise<MigrosProduct | null> {
    await this.ensureToken()

    console.log(`📦 Getting product details: ${productId}`)

    try {
      const options: IProductDetailOptions = {
        uids: productId,
        region: 'national'
      }

      const headers = {
        leshopch: this.guestToken!
      }

      const response = await MigrosAPI.products.productDisplay.getProductDetails(
        options as any,
        headers
      )

      if (!response.product) {
        return null
      }

      return this.transformProduct(response.product)
    } catch (error) {
      console.error('Failed to get product details:', error)
      return null
    }
  }

  async getProductsByCategory(category: string, limit = 50): Promise<MigrosProduct[]> {
    await this.ensureToken()

    // Map our categories to Migros search terms
    const categoryMap: Record<string, string> = {
      pasta: 'pâtes',
      meat: 'viande',
      vegetables: 'légumes',
      dairy: 'produits laitiers',
      bakery: 'pain',
      beverages: 'boissons',
      frozen: 'surgelés',
      pantry: 'conserves',
      snacks: 'snacks'
    }

    const searchTerm = categoryMap[category] || category
    return this.searchProducts(searchTerm, { limit })
  }

  private transformProducts(products: any[]): MigrosProduct[] {
    return products.map(product => this.transformProduct(product)).filter(p => p !== null) as MigrosProduct[]
  }

  private transformProduct(product: any): MigrosProduct | null {
    try {
      // Extract product ID
      const productId = product.id || product.productId || product.uid

      if (!productId) {
        console.warn('Product without ID:', product)
        return null
      }

      // Build product URL
      // Try different URL patterns based on ID format
      let url: string
      if (productId.length === 5) {
        // Short ID needs /mo/ prefix
        url = `https://www.migros.ch/fr/product/mo/${productId}`
      } else {
        // Long ID doesn't need prefix
        url = `https://www.migros.ch/fr/product/${productId}`
      }

      return {
        id: productId,
        name: product.name || product.title || 'Unknown Product',
        brand: product.brand || product.manufacturer,
        priceChf: this.extractPrice(product),
        url,
        imageUrl: this.extractImageUrl(product),
        source: 'api'
      }
    } catch (error) {
      console.error('Failed to transform product:', error)
      return null
    }
  }

  private extractPrice(product: any): number {
    // Try different price fields
    if (product.price?.value) return product.price.value
    if (product.prices?.[0]?.price) return product.prices[0].price
    if (product.offer?.price?.value) return product.offer.price.value
    if (product.regularPrice?.value) return product.regularPrice.value
    
    // Try to parse from string
    if (product.priceString) {
      const match = product.priceString.match(/[\d.]+/)
      if (match) return parseFloat(match[0])
    }

    return 0
  }

  private extractImageUrl(product: any): string | undefined {
    if (product.image?.url) return product.image.url
    if (product.images?.[0]?.url) return product.images[0].url
    if (product.imageUrl) return product.imageUrl
    if (product.pictures?.[0]?.url) return product.pictures[0].url
    return undefined
  }

  async testAPI(): Promise<void> {
    console.log('🧪 Testing Migros Official API...')

    try {
      // Test authentication
      await this.ensureToken()
      console.log('✅ Authentication successful')

      // Test search
      const searchResults = await this.searchProducts('pasta barilla')
      console.log(`\n🔍 Search Results: ${searchResults.length} products`)
      
      if (searchResults.length > 0) {
        console.log('\nSample products:')
        searchResults.slice(0, 3).forEach(p => {
          console.log(`- ${p.name} (${p.brand}) - CHF ${p.priceChf}`)
          console.log(`  URL: ${p.url}`)
        })

        // Test product details
        const details = await this.getProductDetails(searchResults[0].id)
        console.log('\n📦 Product details test:', details ? '✅' : '❌')
      }

      // Test category search
      const categoryResults = await this.getProductsByCategory('pasta', 10)
      console.log(`\n📂 Category Results: ${categoryResults.length} products`)

    } catch (error) {
      console.error('❌ API test failed:', error)
    }
  }
}

export { MigrosOfficialAPI }
export type { MigrosProduct }

// Test if run directly
if (require.main === module) {
  const api = new MigrosOfficialAPI()
  api.testAPI().catch(console.error)
}