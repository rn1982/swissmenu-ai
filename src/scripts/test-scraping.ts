import { scrapePastaProducts, closeMigrosScraper } from '@/lib/migros'

async function testScraping() {
  console.log('Starting Migros pasta scraping test...')
  
  try {
    const products = await scrapePastaProducts()
    
    console.log(`\n✅ Successfully scraped ${products.length} pasta products`)
    
    if (products.length > 0) {
      console.log('\n📦 Sample products:')
      products.slice(0, 3).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`)
        console.log(`   ID: ${product.id}`)
        console.log(`   Brand: ${product.brand || 'N/A'}`)
        console.log(`   Price: ${product.priceChf ? `CHF ${product.priceChf}` : 'N/A'}`)
        console.log(`   URL: ${product.url || 'N/A'}`)
      })
    }
    
    return products
    
  } catch (error) {
    console.error('❌ Scraping failed:', error)
    throw error
  } finally {
    await closeMigrosScraper()
  }
}

// Run the test
testScraping()
  .then((products) => {
    console.log(`\n🎉 Test completed successfully with ${products.length} products`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message)
    process.exit(1)
  })