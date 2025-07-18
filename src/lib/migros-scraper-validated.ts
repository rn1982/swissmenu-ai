import { PrismaClient } from '@prisma/client'
import { MigrosAPIScraper, MigrosProduct } from './migros-api-scraper'
import { validateScrapedUrl, normalizeProductUrl } from './url-validator'

export class ValidatedMigrosScraper {
  private scraper: MigrosAPIScraper
  private prisma: PrismaClient

  constructor() {
    this.scraper = new MigrosAPIScraper()
    this.prisma = new PrismaClient()
  }

  /**
   * Scrape products with URL validation
   */
  async scrapeWithValidation(categorySlug: string, limit = 100): Promise<{
    scraped: number
    saved: number
    invalidUrls: number
    errors: Array<{ product: string; reason: string }>
  }> {
    console.log(`🔍 Scraping ${categorySlug} with URL validation...`)
    
    const stats = {
      scraped: 0,
      saved: 0,
      invalidUrls: 0,
      errors: [] as Array<{ product: string; reason: string }>
    }

    try {
      // Scrape products
      const products = await this.scraper.scrapeCategoryPage(categorySlug)
      stats.scraped = products.length
      
      console.log(`Found ${products.length} products, validating URLs...`)

      // Process each product with URL validation
      for (const product of products) {
        try {
          // Validate and fix URL
          const urlValidation = await validateScrapedUrl(product.url, product.name)
          
          if (!urlValidation.isValid) {
            stats.invalidUrls++
            stats.errors.push({
              product: `${product.name} (${product.id})`,
              reason: urlValidation.reason || 'Invalid URL'
            })
            
            console.warn(`❌ Invalid URL for ${product.name}: ${urlValidation.reason}`)
            
            // Still save the product but without URL
            await this.saveProduct({
              ...product,
              url: null
            })
          } else {
            // Save product with validated URL
            await this.saveProduct({
              ...product,
              url: urlValidation.finalUrl
            })
            
            if (urlValidation.finalUrl !== product.url) {
              console.log(`✅ Fixed URL for ${product.name}: ${product.url} -> ${urlValidation.finalUrl}`)
            }
          }
          
          stats.saved++
        } catch (error: any) {
          stats.errors.push({
            product: `${product.name} (${product.id})`,
            reason: error.message || 'Save error'
          })
          console.error(`Failed to save product ${product.id}:`, error.message)
        }
      }

      return stats
    } catch (error) {
      console.error('Scraping failed:', error)
      throw error
    }
  }

  /**
   * Save product to database with additional validation
   */
  private async saveProduct(product: MigrosProduct & { url: string | null }): Promise<void> {
    // Normalize data before saving
    const normalizedProduct = {
      id: product.id,
      migrosId: product.id,
      name: product.name.trim(),
      brand: product.brand?.trim() || null,
      priceChf: product.priceChf || null,
      price: product.priceChf || null, // Alias
      url: product.url,
      imageUrl: product.imageUrl || null,
      category: product.category || null,
      ariaLabel: `${product.brand || ''} ${product.name}`.trim(),
      source: 'api',
      lastScraped: new Date(),
      lastUpdated: new Date()
    }

    await this.prisma.migrosProduct.upsert({
      where: { id: product.id },
      update: normalizedProduct,
      create: normalizedProduct
    })
  }

  /**
   * Scrape multiple categories with validation
   */
  async scrapeAllCategories(categories: string[] = [
    'pasta', 'meat', 'vegetables', 'dairy', 'bakery',
    'beverages', 'frozen', 'pantry', 'snacks'
  ]): Promise<void> {
    console.log('🚀 Starting validated scraping for all categories\n')
    
    const totalStats = {
      scraped: 0,
      saved: 0,
      invalidUrls: 0,
      errors: [] as Array<{ category: string; product: string; reason: string }>
    }

    for (const category of categories) {
      console.log(`\n📦 Processing category: ${category}`)
      
      try {
        const stats = await this.scrapeWithValidation(category)
        
        totalStats.scraped += stats.scraped
        totalStats.saved += stats.saved
        totalStats.invalidUrls += stats.invalidUrls
        
        // Add category to errors
        stats.errors.forEach(error => {
          totalStats.errors.push({
            category,
            ...error
          })
        })
        
        console.log(`✓ ${category}: ${stats.saved}/${stats.scraped} saved, ${stats.invalidUrls} invalid URLs`)
        
        // Rate limiting between categories
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`✗ Failed to scrape ${category}:`, error)
      }
    }

    // Summary
    console.log('\n📊 SCRAPING SUMMARY')
    console.log('==================')
    console.log(`Total products scraped: ${totalStats.scraped}`)
    console.log(`Total products saved: ${totalStats.saved}`)
    console.log(`Invalid URLs found: ${totalStats.invalidUrls}`)
    console.log(`Success rate: ${(totalStats.saved / totalStats.scraped * 100).toFixed(1)}%`)
    
    if (totalStats.errors.length > 0) {
      console.log('\n⚠️  Products with issues:')
      totalStats.errors.slice(0, 10).forEach(error => {
        console.log(`  - [${error.category}] ${error.product}: ${error.reason}`)
      })
      if (totalStats.errors.length > 10) {
        console.log(`  ... and ${totalStats.errors.length - 10} more`)
      }
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Export for use
export default ValidatedMigrosScraper

// Test if run directly
if (require.main === module) {
  const scraper = new ValidatedMigrosScraper()
  
  scraper.scrapeAllCategories()
    .then(() => scraper.disconnect())
    .catch(console.error)
}