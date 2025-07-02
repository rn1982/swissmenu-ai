async function testSearchURL() {
  const url = 'https://www.migros.ch/fr/search?query=pates'
  
  console.log(`Testing URL: ${url}`)
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const text = await response.text()
      console.log('Content length:', text.length)
      console.log('Title match:', text.match(/<title>(.*?)<\/title>/i)?.[1])
      
      // Look for product-related content
      const productMatches = text.match(/product|pâtes|pasta|prix|chf/gi) || []
      console.log('Product-related matches found:', productMatches.length)
      
      // Check for common e-commerce patterns
      const patterns = [
        'data-product',
        'product-card', 
        'product-item',
        'search-result'
      ]
      
      patterns.forEach(pattern => {
        const matches = (text.match(new RegExp(pattern, 'gi')) || []).length
        console.log(`Pattern "${pattern}":`, matches)
      })
      
    } else {
      console.error('Request failed:', response.status, response.statusText)
    }
    
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

testSearchURL()