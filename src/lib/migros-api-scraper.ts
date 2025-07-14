// Migros API Scraper - Using discovered endpoints
import axios from 'axios'

interface MigrosProduct {
  id: string
  name: string
  brand?: string
  priceChf: number
  url: string
  imageUrl?: string
  category?: string
}

interface ProductDetailResponse {
  gtmData: {
    name: string
    brand: string
    category: string
    price: number
    id: string
  }
  product: {
    id: string
    name: string
    brand?: string
    prices?: Array<{
      price: number
      displayPrice: string
    }>
    images?: Array<{
      url: string
    }>
    slug?: string
  }
}

interface CategorySearchResponse {
  products: Array<{
    id: string
    name: string
    brand?: string
    slug?: string
    prices?: any
  }>
  totalCount: number
}

class MigrosAPIScraper {
  private axiosInstance = axios.create({
    baseURL: 'https://www.migros.ch',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'fr-CH,fr;q=0.9',
      'Content-Type': 'application/json',
      'Origin': 'https://www.migros.ch',
      'Referer': 'https://www.migros.ch/fr'
    }
  })

  constructor() {
    // Add response interceptor for debugging
    this.axiosInstance.interceptors.response.use(
      response => {
        console.log(`✅ ${response.config.url} - ${response.status}`)
        return response
      },
      error => {
        console.error(`❌ ${error.config?.url} - ${error.response?.status || error.message}`)
        return Promise.reject(error)
      }
    )
  }

  async getGuestToken(): Promise<string> {
    try {
      const response = await this.axiosInstance.get(
        '/authentication/public/v1/api/guest?authorizationNotRequired=true'
      )
      return response.data.token || ''
    } catch (error) {
      console.warn('Failed to get guest token')
      return ''
    }
  }

  async searchByCategory(categoryId: string, limit = 100): Promise<MigrosProduct[]> {
    console.log(`🔍 Searching category: ${categoryId}`)
    
    try {
      // Use the discovered category search endpoint
      const response = await this.axiosInstance.post(
        `/product-display/public/web/v1/products/category/${categoryId}/search`,
        {
          sortBy: 'RELEVANCE',
          page: 0,
          pageSize: limit,
          filters: {}
        }
      )

      const products: MigrosProduct[] = []
      
      if (response.data?.productIds) {
        // Get product details using the card endpoint
        const productDetails = await this.getProductCards(response.data.productIds)
        products.push(...productDetails)
      }

      return products
    } catch (error) {
      console.error('Category search failed:', error)
      return []
    }
  }

  async getProductCards(productIds: string[]): Promise<MigrosProduct[]> {
    if (productIds.length === 0) return []

    try {
      const response = await this.axiosInstance.post(
        '/product-display/public/v4/product-cards',
        {
          productIds: productIds.slice(0, 50), // Max 50 at a time
          regionId: 'national',
          language: 'fr',
          translations: ['name', 'brand']
        }
      )

      return (response.data?.productCards || []).map((card: any) => ({
        id: card.id,
        name: card.name,
        brand: card.brand,
        priceChf: card.offer?.price?.displayPrice || 0,
        url: `https://www.migros.ch/fr/product/${card.id}`,
        imageUrl: card.images?.[0]?.url,
        category: card.category
      }))
    } catch (error) {
      console.error('Failed to get product cards:', error)
      return []
    }
  }

  async getProductDetail(productId: string): Promise<MigrosProduct | null> {
    console.log(`📦 Getting product: ${productId}`)
    
    try {
      const response = await this.axiosInstance.post(
        '/product-display/public/v3/product-detail',
        {
          productId,
          regionId: 'national', 
          language: 'fr'
        }
      )

      const data = response.data as ProductDetailResponse
      
      if (data?.product) {
        return {
          id: data.product.id,
          name: data.product.name,
          brand: data.product.brand || data.gtmData?.brand,
          priceChf: data.product.prices?.[0]?.price || data.gtmData?.price || 0,
          url: `https://www.migros.ch/fr/product/${data.product.id}`,
          imageUrl: data.product.images?.[0]?.url,
          category: data.gtmData?.category
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to get product detail:', error)
      return null
    }
  }

  async scrapeCategoryPage(categorySlug: string): Promise<MigrosProduct[]> {
    console.log(`🛒 Scraping category: ${categorySlug}`)
    
    // Category mapping based on Migros structure
    const categoryMap: Record<string, string> = {
      'pasta': '7494976',          // Pâtes alimentaires
      'meat': '7494740',           // Viande
      'vegetables': '7494732',     // Fruits & légumes
      'dairy': '7494756',          // Produits laitiers
      'bakery': '7494715',         // Pain & boulangerie
      'beverages': '7494704',      // Boissons
      'frozen': '7494796',         // Surgelés
      'pantry': '7494973',         // Conserves & bocaux
      'snacks': '7494805'          // Snacks & confiserie
    }

    const categoryId = categoryMap[categorySlug]
    if (!categoryId) {
      console.warn(`Unknown category: ${categorySlug}`)
      return []
    }

    return await this.searchByCategory(categoryId)
  }

  async testScraping(): Promise<void> {
    console.log('🧪 Testing Migros API scraping...')
    
    // Test getting guest token
    const token = await this.getGuestToken()
    console.log('Guest token:', token ? '✅' : '❌')
    
    // Test category search
    const pastaProducts = await this.scrapeCategoryPage('pasta')
    console.log(`\nPasta products found: ${pastaProducts.length}`)
    
    if (pastaProducts.length > 0) {
      console.log('\nSample products:')
      pastaProducts.slice(0, 3).forEach(p => {
        console.log(`- ${p.name} (${p.brand}) - CHF ${p.priceChf} - ${p.url}`)
      })
      
      // Test product detail
      const detail = await this.getProductDetail(pastaProducts[0].id)
      console.log('\nProduct detail test:', detail ? '✅' : '❌')
    }
  }
}

// Export for use
export { MigrosAPIScraper }
export type { MigrosProduct }

// Test if run directly
if (require.main === module) {
  const scraper = new MigrosAPIScraper()
  scraper.testScraping().catch(console.error)
}