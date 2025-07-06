import { ProxyScraper } from '../lib/proxy-scraper'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

// Missing categories and their search URLs
const MISSING_CATEGORIES = [
  // Fish & Seafood
  {
    category: 'fish',
    searches: [
      'saumon',
      'filet%20de%20perche',
      'cabillaud',
      'thon',
      'crevettes',
      'poisson%20blanc'
    ]
  },
  // Herbs & Spices
  {
    category: 'herbs',
    searches: [
      'basilic',
      'persil',
      'thym',
      'romarin',
      'origan',
      'herbes%20de%20provence',
      'épices',
      'curry',
      'paprika',
      'cumin'
    ]
  },
  // Condiments & Sauces
  {
    category: 'pantry',
    searches: [
      'huile%20olive',
      'vinaigre',
      'moutarde',
      'sauce%20soja',
      'mayonnaise',
      'ketchup',
      'bouillon',
      'fond%20de%20sauce'
    ]
  },
  // Specialty grains
  {
    category: 'rice',
    searches: [
      'quinoa',
      'couscous',
      'polenta',
      'boulgour',
      'millet'
    ]
  },
  // Fresh produce not yet scraped
  {
    category: 'vegetables',
    searches: [
      'courgette',
      'aubergine',
      'poivron',
      'brocoli',
      'épinards',
      'champignons',
      'poireau',
      'céleri',
      'échalote',
      'gingembre'
    ]
  },
  // Fruits
  {
    category: 'fruits',
    searches: [
      'citron',
      'orange',
      'pomme',
      'abricot',
      'pêche',
      'avocat',
      'mangue'
    ]
  },
  // Bakery items
  {
    category: 'bakery',
    searches: [
      'pain',
      'baguette',
      'pâte%20feuilletée',
      'pâte%20brisée'
    ]
  },
  // Nuts & Seeds
  {
    category: 'nuts',
    searches: [
      'amandes',
      'noix',
      'noisettes',
      'pignons%20de%20pin',
      'graines%20de%20sésame'
    ]
  }
]

async function scrapeProductBatch(scraper: ProxyScraper, urls: string[], category: string) {
  console.log(`\n📦 Scraping ${urls.length} products for category: ${category}`)
  
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const product = await scraper.scrapeProduct(url)
        if (product) {
          // Save to database
          await prisma.migrosProduct.upsert({
            where: { id: product.id },
            update: {
              name: product.name,
              brand: product.brand,
              priceChf: product.price,
              price: product.price,
              unit: product.unit,
              category: category,
              url: product.url,
              imageUrl: product.imageUrl,
              ariaLabel: product.ariaLabel,
              source: 'scrapingbee',
              lastScraped: new Date(),
              lastUpdated: new Date()
            },
            create: {
              id: product.id,
              migrosId: product.migrosId,
              name: product.name,
              brand: product.brand,
              priceChf: product.price,
              price: product.price,
              unit: product.unit,
              category: category,
              url: product.url,
              imageUrl: product.imageUrl,
              ariaLabel: product.ariaLabel,
              source: 'scrapingbee',
              lastScraped: new Date()
            }
          })
          console.log(`✅ Saved: ${product.name} - CHF ${product.price}`)
          return product
        }
      } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error.message)
        return null
      }
    })
  )

  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length
  console.log(`✅ Successfully scraped ${successful}/${urls.length} products`)
  return successful
}

async function main() {
  console.log('🌟 Starting to scrape missing product categories...')
  console.log('📊 Target categories:', MISSING_CATEGORIES.map(c => c.category).join(', '))
  
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  let totalScraped = 0
  let totalProducts = 0
  
  try {
    for (const categoryData of MISSING_CATEGORIES) {
      console.log(`\n🏷️  Category: ${categoryData.category}`)
      console.log(`🔍 Searches: ${categoryData.searches.length}`)
      
      for (const search of categoryData.searches) {
        console.log(`\n🔍 Searching for: ${decodeURIComponent(search)}`)
        
        // Get search results
        const searchUrl = `https://www.migros.ch/fr/search?query=${search}`
        const productUrls = await scraper.extractProductUrlsFromSearch(searchUrl)
        
        if (productUrls.length === 0) {
          console.log(`⚠️  No products found for: ${search}`)
          continue
        }
        
        console.log(`📦 Found ${productUrls.length} products`)
        
        // Take first 5 products from each search
        const urlsToScrape = productUrls.slice(0, 5)
        totalProducts += urlsToScrape.length
        
        // Scrape in batches of 3
        for (let i = 0; i < urlsToScrape.length; i += 3) {
          const batch = urlsToScrape.slice(i, i + 3)
          const scraped = await scrapeProductBatch(scraper, batch, categoryData.category)
          totalScraped += scraped
          
          // Small delay between batches
          if (i + 3 < urlsToScrape.length) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      }
    }
    
    console.log('\n\n✅ Scraping complete!')
    console.log(`📊 Total products scraped: ${totalScraped}/${totalProducts}`)
    
    // Check final database status
    const categoryCounts = await prisma.migrosProduct.groupBy({
      by: ['category'],
      _count: true,
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    })
    
    console.log('\n📊 Updated database status:')
    categoryCounts.forEach(({ category, _count }) => {
      console.log(`  ${category}: ${_count} products`)
    })
    
    const total = await prisma.migrosProduct.count()
    console.log(`\n📦 Total products in database: ${total}`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    await scraper.close()
    await prisma.$disconnect()
  }
}

// Run the script
main().catch(console.error)