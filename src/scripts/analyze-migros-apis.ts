// Analyze Migros API responses to understand structure
import { chromium } from 'playwright'

async function analyzeMigrosAPIs() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'fr-CH'
  })
  
  const page = await context.newPage()
  const apiResponses: any[] = []
  
  // Intercept all API responses
  page.on('response', async (response) => {
    const url = response.url()
    
    if ((url.includes('/api/') || url.includes('product')) && !url.includes('.js')) {
      try {
        const contentType = response.headers()['content-type'] || ''
        if (contentType.includes('json')) {
          const data = await response.json()
          apiResponses.push({
            url: url.substring(0, 100) + '...',
            status: response.status(),
            data: JSON.stringify(data).substring(0, 500) + '...'
          })
          
          // Look for product data patterns
          if (JSON.stringify(data).includes('product') || 
              JSON.stringify(data).includes('price') ||
              JSON.stringify(data).includes('name')) {
            console.log('\n🎯 FOUND PRODUCT DATA:')
            console.log('URL:', url)
            console.log('Sample:', JSON.stringify(data).substring(0, 200))
          }
        }
      } catch {}
    }
  })
  
  console.log('🔍 Navigate to Migros and search for products...')
  console.log('Press Ctrl+C when done')
  
  await page.goto('https://www.migros.ch/fr/category/pates-alimentaires')
  
  // Keep browser open for manual interaction
  await new Promise(() => {})
}

analyzeMigrosAPIs().catch(console.error)