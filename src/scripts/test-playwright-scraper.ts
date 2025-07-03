import { testPlaywrightScraper, scrapeProductsWithPlaywright, closePlaywrightScraper } from '../lib/migros-playwright'

async function runPlaywrightTest() {
  console.log('🎭 Testing Playwright Migros Scraper with API Interception')
  console.log('=' .repeat(60))
  
  try {
    // Test the full scraper
    console.log('📊 Running comprehensive test with all categories...')
    const startTime = Date.now()
    const testResult = await testPlaywrightScraper()
    const duration = Date.now() - startTime
    
    console.log('\n🎯 Test Results:')
    console.log(`Success: ${testResult.success ? '✅' : '❌'}`)
    console.log(`Duration: ${duration}ms`)
    console.log(`Total Products: ${testResult.productCount}`)
    console.log(`API Products: ${testResult.apiProducts} (${Math.round(testResult.apiProducts / testResult.productCount * 100)}%)`)
    console.log(`Scraped Products: ${testResult.scrapedProducts} (${Math.round(testResult.scrapedProducts / testResult.productCount * 100)}%)`)
    console.log(`Fallback Products: ${testResult.fallbackProducts} (${Math.round(testResult.fallbackProducts / testResult.productCount * 100)}%)`)
    
    console.log('\n📦 Category Breakdown:')
    Object.entries(testResult.categories).forEach(([category, info]) => {
      console.log(`  ${category}: ${info.count} products (${info.source})`)
    })
    
    if (testResult.sampleProducts.length > 0) {
      console.log('\n🛒 Sample Products:')
      testResult.sampleProducts.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name}`)
        console.log(`     Brand: ${product.brand || 'N/A'}`)
        console.log(`     Price: ${product.priceChf ? `${product.priceChf} CHF` : 'N/A'}`)
        console.log(`     Source: ${product.source}`)
        console.log(`     URL: ${product.url || 'N/A'}`)
      })
    }
    
    // Test specific category with details
    console.log('\n🍝 Testing Pasta Category Specifically...')
    const pastaProducts = await scrapeProductsWithPlaywright('pasta')
    console.log(`Found ${pastaProducts.length} pasta products`)
    
    const apiPasta = pastaProducts.filter(p => p.source === 'api').length
    const scrapedPasta = pastaProducts.filter(p => p.source === 'scraped').length
    const fallbackPasta = pastaProducts.filter(p => p.source === 'fallback').length
    
    console.log(`  API: ${apiPasta}, Scraped: ${scrapedPasta}, Fallback: ${fallbackPasta}`)
    
    if (apiPasta > 0) {
      console.log('\n🎉 SUCCESS: API interception is working!')
      console.log('The scraper successfully intercepted Migros API calls.')
    } else if (scrapedPasta > 0) {
      console.log('\n✅ PARTIAL SUCCESS: DOM scraping is working!')
      console.log('API interception failed but DOM scraping succeeded.')
    } else {
      console.log('\n⚠️ FALLBACK MODE: Using enhanced product database')
      console.log('Both API and DOM scraping failed, but fallback is working.')
    }
    
    // Performance summary
    console.log('\n📈 Performance Summary:')
    console.log(`  Average time per category: ${Math.round(duration / 7)}ms`)
    console.log(`  Products per second: ${Math.round(testResult.productCount / (duration / 1000))}`)
    
    console.log('\n✅ Playwright scraper test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await closePlaywrightScraper()
  }
}

// Run the test
runPlaywrightTest()