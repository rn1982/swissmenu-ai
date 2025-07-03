import { testEnhancedScraper, getSmartPastaProducts, closeEnhancedScraper } from '../lib/migros-enhanced'

async function runEnhancedTest() {
  console.log('🚀 Testing Enhanced Migros Scraper with Fallback')
  console.log('=' .repeat(60))
  
  try {
    // Test the full enhanced scraper
    console.log('📊 Running comprehensive test...')
    const testResult = await testEnhancedScraper()
    
    console.log('\n🎯 Test Results:')
    console.log(`Success: ${testResult.success ? '✅' : '❌'}`)
    console.log(`Total Products: ${testResult.productCount}`)
    console.log(`Primary Source: ${testResult.source}`)
    
    if (testResult.sampleProduct) {
      console.log('\n📦 Sample Product:')
      console.log(`  Name: ${testResult.sampleProduct.name}`)
      console.log(`  Brand: ${testResult.sampleProduct.brand}`)
      console.log(`  Price: ${testResult.sampleProduct.priceChf} CHF`)
      console.log(`  Source: ${testResult.sampleProduct.source}`)
      console.log(`  URL: ${testResult.sampleProduct.url}`)
    }
    
    console.log('\n🔍 Category Breakdown:')
    Object.entries(testResult.categories).forEach(([category, info]) => {
      console.log(`  ${category}: ${info.count} products (${info.source})`)
    })
    
    // Test specific pasta functionality
    console.log('\n🍝 Testing Pasta Products Specifically...')
    const pastaProducts = await getSmartPastaProducts()
    console.log(`Found ${pastaProducts.length} pasta products`)
    
    if (pastaProducts.length > 0) {
      console.log('\n📋 First 5 Pasta Products:')
      pastaProducts.slice(0, 5).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ${product.priceChf} CHF (${product.source})`)
      })
    }
    
    if (testResult.error) {
      console.log('\n❌ Error encountered:', testResult.error)
    }
    
    console.log('\n✅ Enhanced scraper test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await closeEnhancedScraper()
  }
}

// Run the test
runEnhancedTest()