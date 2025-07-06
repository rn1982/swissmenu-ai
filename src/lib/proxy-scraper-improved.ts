// Improved price extraction for Migros products
import * as cheerio from 'cheerio'

export function parseProductFromHtmlImproved(html: string, url: string) {
  const $ = cheerio.load(html)
  
  // Extract product name
  const name = $('[data-testid="product-name"]').text().trim() ||
              $('h1.product-title').text().trim() ||
              $('.product-name').text().trim() ||
              $('h1').first().text().trim()

  if (!name) {
    console.warn('No product name found')
    return null
  }

  // Improved price extraction - look for the first/main price
  let priceChf = 0
  
  // Strategy 1: Look for the first price with data-testid
  const priceElements = $('[data-testid*="price"]')
  
  if (priceElements.length > 0) {
    // Find the first element with actual price (not unit price)
    priceElements.each((i, elem) => {
      const text = $(elem).text().trim()
      const priceMatch = text.match(/^[\d.]+$|^(\d+[.,]\d{2})(?:\s|$)/)
      
      if (priceMatch && !text.includes('/100g') && !text.includes('centimes')) {
        const price = parseFloat(priceMatch[0].replace(',', '.'))
        if (price > 0 && price < 100) { // Reasonable price range
          priceChf = price
          return false // Break the loop
        }
      }
    })
  }
  
  // Strategy 2: If no price found, try other selectors
  if (priceChf === 0) {
    const priceText = $('.price-value').first().text() ||
                     $('.product-price').first().text() ||
                     $('.actual-price').first().text()
    
    const priceMatch = priceText.match(/(\d+[.,]\d{2})/)
    if (priceMatch) {
      priceChf = parseFloat(priceMatch[1].replace(',', '.'))
    }
  }
  
  // Extract brand
  const brand = $('[data-testid="product-brand"]').text().trim() ||
               $('.brand-name').text().trim() ||
               $('.product-brand').text().trim()

  // Extract image
  const imageUrl = $('[data-testid="product-image"] img').attr('src') ||
                  $('.product-image img').attr('src') ||
                  $('img.product-photo').attr('src')

  // Extract ID from URL
  const idMatch = url.match(/\/product\/(?:mo\/)?(\d+)/)
  const id = idMatch ? idMatch[1] : `scraped-${Date.now()}`

  console.log(`Parsed: ${name} - Price found: CHF ${priceChf}`)

  return {
    id,
    name,
    brand: brand || undefined,
    priceChf,
    url,
    imageUrl: imageUrl || undefined,
    source: 'proxy-scraper'
  }
}