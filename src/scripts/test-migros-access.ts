import puppeteer from 'puppeteer'

async function testMigrosAccess() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to false to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    console.log('Testing Migros homepage access...')
    await page.goto('https://www.migros.ch', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    const title = await page.title()
    console.log('Page title:', title)
    
    // Take a screenshot
    await page.screenshot({ path: 'migros-homepage.png' })
    console.log('Screenshot saved as migros-homepage.png')
    
    // Test the pasta category URL
    console.log('\nTesting pasta category...')
    await page.goto('https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
    
    const pastaTitle = await page.title()
    console.log('Pasta page title:', pastaTitle)
    
    await page.screenshot({ path: 'migros-pasta.png' })
    console.log('Pasta screenshot saved as migros-pasta.png')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await browser.close()
  }
}

testMigrosAccess()