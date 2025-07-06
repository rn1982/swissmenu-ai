#!/usr/bin/env tsx

import * as cheerio from 'cheerio'
import * as fs from 'fs/promises'

async function analyzePriceHTML() {
  console.log('🔍 Analyzing macaronis HTML for price patterns...\n')
  
  try {
    const html = await fs.readFile('debug-macaronis.html', 'utf-8')
    const $ = cheerio.load(html)
    
    // Look for all elements containing prices
    const pricePatterns = [
      '[data-testid*="price"]',
      '[class*="price"]',
      '[aria-label*="price"]',
      '[aria-label*="Prix"]',
      'span:contains("CHF")',
      'span:contains("Fr.")',
      '[class*="Price"]'
    ]
    
    console.log('💰 Price elements found:\n')
    
    pricePatterns.forEach(pattern => {
      const elements = $(pattern)
      if (elements.length > 0) {
        console.log(`Pattern: ${pattern}`)
        elements.each((i, elem) => {
          const text = $(elem).text().trim()
          const ariaLabel = $(elem).attr('aria-label')
          const classes = $(elem).attr('class')
          
          if (text && text.includes('.') && (text.includes('CHF') || text.includes('Fr') || /\d/.test(text))) {
            console.log(`  [${i}] Text: "${text}"`)
            if (ariaLabel) console.log(`       Aria: "${ariaLabel}"`)
            if (classes) console.log(`       Class: "${classes}"`)
            console.log('')
          }
        })
      }
    })
    
    // Look specifically for product price structure
    console.log('\n🎯 Looking for main product price...\n')
    
    // Check for price in specific containers
    const containers = [
      '.product-price-container',
      '.price-wrapper',
      '[data-testid="product-price-wrapper"]',
      '.product-detail-price',
      '.main-price'
    ]
    
    containers.forEach(container => {
      const elem = $(container)
      if (elem.length > 0) {
        console.log(`Container: ${container}`)
        console.log(`Content: ${elem.text().trim()}\n`)
      }
    })
    
    // Extract all text containing CHF or numbers with decimals
    const allText = $('body').text()
    const priceMatches = allText.match(/(\d+[.,]\d{2})\s*(?:CHF|Fr\.?)/gi)
    
    if (priceMatches) {
      console.log('📊 All price patterns in page:')
      const uniquePrices = [...new Set(priceMatches)]
      uniquePrices.forEach(price => {
        console.log(`  - ${price}`)
      })
    }
    
  } catch (error) {
    console.error('Error reading HTML file:', error)
    console.log('Make sure to run check-single-product.ts first to generate the HTML file')
  }
}

analyzePriceHTML().catch(console.error)