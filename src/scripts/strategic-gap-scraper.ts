#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { ProxyScraper } from '../lib/proxy-scraper'
import { db } from '../lib/db'
import * as cheerio from 'cheerio'
import pLimit from 'p-limit'

// Configuration for targeted scraping based on gaps analysis
const SCRAPING_CONFIG = {
  // Priority 1: Essential missing ingredients
  essentialProducts: {
    dairy: [
      { query: 'crème fraîche migros', expectedProducts: ['Crème fraîche', 'Crème fraîche légère'] },
      { query: 'mascarpone migros', expectedProducts: ['Mascarpone Galbani', 'M-Classic Mascarpone'] },
      { query: 'ricotta migros', expectedProducts: ['Ricotta Galbani', 'M-Classic Ricotta'] },
      { query: 'parmesan râpé migros', expectedProducts: ['Parmesan râpé', 'Parmigiano Reggiano'] },
      { query: 'raclette fromage migros', expectedProducts: ['Fromage à raclette', 'Raclette du Valais'] },
      { query: 'fondue fromage migros', expectedProducts: ['Mélange à fondue', 'Fondue moitié-moitié'] },
      { query: 'crème à café migros', expectedProducts: ['Crème à café', 'Crème entière'] }
    ],
    pantry: [
      { query: 'levure migros', expectedProducts: ['Levure sèche', 'Levure fraîche', 'Levure chimique'] },
      { query: 'bicarbonate soude migros', expectedProducts: ['Bicarbonate de soude', 'Bicarbonate alimentaire'] },
      { query: 'pesto migros', expectedProducts: ['Pesto alla Genovese', 'Pesto rosso', 'M-Classic Pesto'] }
    ],
    meat: [
      { query: 'lardons migros', expectedProducts: ['Lardons fumés', 'Lardons nature'] },
      { query: 'jambon cuit migros', expectedProducts: ['Jambon cuit', 'Jambon de dinde'] },
      { query: 'salami migros', expectedProducts: ['Salami Milano', 'Salami nostrano'] },
      { query: 'cervelas migros', expectedProducts: ['Cervelas', 'Cervelas géant'] },
      { query: 'viande séchée migros', expectedProducts: ['Viande séchée des Grisons', 'Viande séchée du Valais'] }
    ],
    fish: [
      { query: 'truite migros', expectedProducts: ['Filet de truite', 'Truite fumée'] }
    ],
    bakery: [
      { query: 'pain blanc migros', expectedProducts: ['Pain blanc', 'Pain toast'] },
      { query: 'croissant migros', expectedProducts: ['Croissant au beurre', 'Croissant'] },
      { query: 'tresse migros', expectedProducts: ['Tresse au beurre', 'Tresse dominicale'] },
      { query: 'pain seigle migros', expectedProducts: ['Pain de seigle', 'Pain complet de seigle'] }
    ],
    condiments: [
      { query: 'thym migros', expectedProducts: ['Thym séché', 'Thym frais'] },
      { query: 'romarin migros', expectedProducts: ['Romarin séché', 'Romarin frais'] },
      { query: 'laurier migros', expectedProducts: ['Feuilles de laurier', 'Laurier séché'] },
      { query: 'curry poudre migros', expectedProducts: ['Curry en poudre', 'Curry doux'] }
    ],
    grains: [
      { query: 'flocons avoine migros', expectedProducts: ['Flocons d\'avoine', 'Avoine complète'] },
      { query: 'orge perlé migros', expectedProducts: ['Orge perlé', 'Orge mondé'] },
      { query: 'lentilles migros', expectedProducts: ['Lentilles vertes', 'Lentilles corail', 'Lentilles beluga'] },
      { query: 'haricots blancs migros', expectedProducts: ['Haricots blancs', 'Haricots rouges'] },
      { query: 'pois chiches migros', expectedProducts: ['Pois chiches', 'Pois chiches en conserve'] }
    ],
    sauces: [
      { query: 'sauce hollandaise migros', expectedProducts: ['Sauce hollandaise', 'Knorr Hollandaise'] },
      { query: 'sauce béarnaise migros', expectedProducts: ['Sauce béarnaise', 'Knorr Béarnaise'] },
      { query: 'worcestershire sauce migros', expectedProducts: ['Sauce Worcestershire', 'Lea & Perrins'] },
      { query: 'tabasco migros', expectedProducts: ['Tabasco', 'Sauce piquante'] }
    ],
    swiss: [
      { query: 'rösti migros', expectedProducts: ['Rösti prêt', 'Rösti surgelé', 'Hero Rösti'] },
      { query: 'spätzli migros', expectedProducts: ['Spätzli frais', 'Spätzli aux œufs'] },
      { query: 'knöpfli migros', expectedProducts: ['Knöpfli frais', 'Knöpfli aux œufs'] },
      { query: 'bircher muesli migros', expectedProducts: ['Bircher muesli', 'Familia Bircher'] },
      { query: 'aromat migros', expectedProducts: ['Aromat Knorr', 'Aromat'] },
      { query: 'sbrinz migros', expectedProducts: ['Sbrinz AOP', 'Sbrinz râpé'] },
      { query: 'appenzeller migros', expectedProducts: ['Appenzeller', 'Appenzeller extra'] },
      { query: 'tilsiter migros', expectedProducts: ['Tilsiter', 'Tilsiter doux'] }
    ]
  },

  // Priority 2: Category URLs for bulk scraping
  categoryUrls: {
    dairy: [
      'https://www.migros.ch/fr/category/lait-produits-laitiers-oeufs/fromage',
      'https://www.migros.ch/fr/category/lait-produits-laitiers-oeufs/lait-creme-serai',
      'https://www.migros.ch/fr/category/lait-produits-laitiers-oeufs/yogourt'
    ],
    fish: [
      'https://www.migros.ch/fr/category/viande-poisson/poisson',
      'https://www.migros.ch/fr/category/viande-poisson/fruits-de-mer'
    ],
    bakery: [
      'https://www.migros.ch/fr/category/pain-patisserie/pain',
      'https://www.migros.ch/fr/category/pain-patisserie/petits-pains-tresses',
      'https://www.migros.ch/fr/category/pain-patisserie/viennoiseries'
    ],
    herbs: [
      'https://www.migros.ch/fr/category/fruits-legumes/herbes-aromatiques',
      'https://www.migros.ch/fr/category/epicerie/epices-condiments/epices'
    ],
    grains: [
      'https://www.migros.ch/fr/category/epicerie/pates-riz-legumineuses/legumineuses',
      'https://www.migros.ch/fr/category/epicerie/cereales-muesli/cereales'
    ]
  },

  // Scraping settings
  maxProductsPerQuery: 5,
  maxProductsPerCategory: 20,
  delayBetweenRequests: 2000,
  maxConcurrent: 1,
  
  // ScrapingBee specific
  scrapingBeeConfig: {
    render_js: true,
    premium_proxy: true,
    country_code: 'ch',
    wait: 3000,
    block_ads: true
  }
}

interface ScrapedProduct {
  id: string
  name: string
  brand?: string
  priceChf: number
  url: string
  imageUrl?: string
  category: string
}

class StrategicGapScraper {
  private scraper: ProxyScraper
  private stats = {
    productsScraped: 0,
    productsSaved: 0,
    errors: 0,
    startTime: new Date()
  }

  constructor() {
    if (!process.env.SCRAPINGBEE_API_KEY) {
      throw new Error('SCRAPINGBEE_API_KEY not set in environment')
    }

    this.scraper = new ProxyScraper({
      service: 'scrapingbee',
      apiKey: process.env.SCRAPINGBEE_API_KEY
    })
  }

  async run(options: { testMode?: boolean; targetCategories?: string[] } = {}) {
    console.log('🚀 Starting Strategic Gap Scraper')
    console.log('==================================')
    
    try {
      // Phase 1: Scrape essential missing products
      if (!options.targetCategories || options.targetCategories.length === 0) {
        await this.scrapeEssentialProducts(options.testMode)
      }

      // Phase 2: Scrape categories that need expansion
      const categoriesToExpand = options.targetCategories || ['dairy', 'fish', 'bakery', 'herbs', 'grains']
      for (const category of categoriesToExpand) {
        if (SCRAPING_CONFIG.categoryUrls[category as keyof typeof SCRAPING_CONFIG.categoryUrls]) {
          await this.scrapeCategoryUrls(category, options.testMode)
        }
      }

      // Print final stats
      this.printStats()
      
    } catch (error) {
      console.error('❌ Scraper failed:', error)
    } finally {
      await db.$disconnect()
    }
  }

  private async scrapeEssentialProducts(testMode = false) {
    console.log('\n📦 Phase 1: Scraping Essential Missing Products')
    console.log('=============================================')

    const limit = pLimit(SCRAPING_CONFIG.maxConcurrent)
    
    for (const [category, queries] of Object.entries(SCRAPING_CONFIG.essentialProducts)) {
      console.log(`\n🔍 Category: ${category.toUpperCase()}`)
      
      const queryLimit = testMode ? 2 : queries.length
      const queryTasks = queries.slice(0, queryLimit).map(queryConfig => 
        limit(async () => {
          try {
            await this.searchAndScrapeProducts(queryConfig.query, category, queryConfig.expectedProducts)
          } catch (error) {
            console.error(`  ❌ Failed: ${queryConfig.query}`)
            this.stats.errors++
          }
        })
      )
      
      await Promise.all(queryTasks)
    }
  }

  private async searchAndScrapeProducts(query: string, category: string, expectedProducts: string[]) {
    console.log(`  🔎 Searching: "${query}"`)
    
    const searchUrl = `https://www.migros.ch/fr/search?query=${encodeURIComponent(query)}`
    
    try {
      const html = await this.scraper.scrapeUrl(searchUrl)
      const $ = cheerio.load(html)
      
      // Extract product URLs from search results
      const productUrls: string[] = []
      
      // Multiple selectors for different page structures
      const selectors = [
        'a[href*="/product/"]',
        '.product-tile a',
        '.product-card a',
        '[data-testid="product-link"]'
      ]
      
      for (const selector of selectors) {
        $(selector).each((_, elem) => {
          const href = $(elem).attr('href')
          if (href && !href.includes('/category/')) {
            const fullUrl = href.startsWith('http') ? href : `https://www.migros.ch${href}`
            if (!productUrls.includes(fullUrl) && productUrls.length < SCRAPING_CONFIG.maxProductsPerQuery) {
              productUrls.push(fullUrl)
            }
          }
        })
      }
      
      console.log(`    Found ${productUrls.length} products`)
      
      // Scrape individual products
      for (const url of productUrls) {
        await this.delay(SCRAPING_CONFIG.delayBetweenRequests)
        
        try {
          const product = await this.scraper.scrapeProduct(url)
          if (product) {
            await this.saveProduct({ ...product, category })
            console.log(`    ✅ ${product.name} - CHF ${product.priceChf}`)
          }
        } catch (error) {
          console.log(`    ⚠️  Failed to scrape: ${url}`)
        }
      }
      
    } catch (error: any) {
      console.error(`  ❌ Search failed: ${error.message}`)
      this.stats.errors++
    }
  }

  private async scrapeCategoryUrls(category: string, testMode = false) {
    console.log(`\n📂 Phase 2: Bulk scraping category: ${category.toUpperCase()}`)
    console.log('============================================')
    
    const urls = SCRAPING_CONFIG.categoryUrls[category as keyof typeof SCRAPING_CONFIG.categoryUrls] || []
    const urlLimit = testMode ? 1 : urls.length
    
    for (const url of urls.slice(0, urlLimit)) {
      console.log(`\n🌐 Scraping: ${url}`)
      
      try {
        const html = await this.scraper.scrapeUrl(url)
        const $ = cheerio.load(html)
        
        // Extract products from category page
        const products: ScrapedProduct[] = []
        
        // Try multiple product selectors
        const productSelectors = [
          '.product-tile',
          '.product-card', 
          '[data-testid="product-card"]',
          '.product-item'
        ]
        
        for (const selector of productSelectors) {
          if (products.length >= SCRAPING_CONFIG.maxProductsPerCategory) break
          
          $(selector).each((index, elem) => {
            if (products.length >= SCRAPING_CONFIG.maxProductsPerCategory) return
            
            try {
              const $elem = $(elem)
              const name = $elem.find('.product-name, .name, h3, h4').first().text().trim()
              const priceText = $elem.find('.price, .product-price').first().text()
              const link = $elem.find('a').first().attr('href')
              const image = $elem.find('img').first().attr('src')
              
              if (name && priceText) {
                const priceMatch = priceText.match(/(\d+\.?\d*)/);
                const priceChf = priceMatch ? parseFloat(priceMatch[1]) : 0
                
                const productUrl = link ? 
                  (link.startsWith('http') ? link : `https://www.migros.ch${link}`) : 
                  url
                
                // Extract ID from URL
                const idMatch = productUrl.match(/product\/([^\/\?]+)/);
                const productId = idMatch ? idMatch[1] : `${category}-${Date.now()}-${index}`
                
                products.push({
                  id: productId,
                  name,
                  brand: name.split(' ')[0], // First word often brand
                  priceChf,
                  url: productUrl,
                  imageUrl: image,
                  category
                })
              }
            } catch (error) {
              // Skip malformed products
            }
          })
        }
        
        console.log(`  Found ${products.length} products on page`)
        
        // Save products
        for (const product of products) {
          await this.saveProduct(product)
          console.log(`  ✅ ${product.name} - CHF ${product.priceChf}`)
        }
        
        await this.delay(SCRAPING_CONFIG.delayBetweenRequests)
        
      } catch (error: any) {
        console.error(`❌ Category scraping failed: ${error.message}`)
        this.stats.errors++
      }
    }
  }

  private async saveProduct(product: ScrapedProduct) {
    try {
      // Check if product already exists
      const existing = await db.migrosProduct.findFirst({
        where: {
          OR: [
            { migrosId: product.id },
            { url: product.url }
          ]
        }
      })

      const productData = {
        id: product.id, // Use migrosId as the primary key
        migrosId: product.id,
        name: product.name,
        brand: product.brand,
        priceChf: product.priceChf,
        price: product.priceChf, // For compatibility
        url: product.url,
        imageUrl: product.imageUrl,
        category: product.category,
        source: 'scrapingbee',
        lastScraped: new Date(),
        lastUpdated: new Date()
      }

      if (existing) {
        await db.migrosProduct.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            brand: product.brand,
            priceChf: product.priceChf,
            price: product.priceChf,
            url: product.url,
            imageUrl: product.imageUrl,
            category: product.category,
            source: 'scrapingbee',
            lastScraped: new Date(),
            lastUpdated: new Date()
          }
        })
      } else {
        await db.migrosProduct.create({
          data: productData
        })
      }

      this.stats.productsSaved++
    } catch (error: any) {
      console.error(`  ⚠️  Database error: ${error.message}`)
    }
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private printStats() {
    const duration = (new Date().getTime() - this.stats.startTime.getTime()) / 1000
    
    console.log('\n📊 Scraping Complete!')
    console.log('===================')
    console.log(`Duration: ${Math.round(duration)}s`)
    console.log(`Products scraped: ${this.stats.productsScraped}`)
    console.log(`Products saved: ${this.stats.productsSaved}`)
    console.log(`Errors: ${this.stats.errors}`)
    console.log(`Success rate: ${Math.round((this.stats.productsSaved / (this.stats.productsScraped || 1)) * 100)}%`)
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2)
  const testMode = args.includes('--test')
  const targetCategories = args
    .filter(arg => !arg.startsWith('--'))
    .filter(cat => ['dairy', 'fish', 'bakery', 'herbs', 'grains', 'pantry', 'meat'].includes(cat))

  const scraper = new StrategicGapScraper()
  await scraper.run({ testMode, targetCategories })
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}