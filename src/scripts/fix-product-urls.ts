import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import * as dotenv from 'dotenv'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { validateUrl, isMigrosProductUrl, extractProductId } from '../lib/url-validator'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

interface UrlFixResult {
  productId: string
  productName: string
  originalUrl: string | null
  fixedUrl: string | null
  status: 'fixed' | 'unfixable' | 'valid' | 'no_url'
  reason?: string
  statusCode?: number
}

interface FixReport {
  totalProducts: number
  noUrl: number
  alreadyValid: number
  fixed: number
  unfixable: number
  results: UrlFixResult[]
  unfixableProducts: UrlFixResult[]
  timestamp: string
}

/**
 * Attempt to fix a broken Migros product URL
 */
async function attemptUrlFix(product: any): Promise<UrlFixResult> {
  const result: UrlFixResult = {
    productId: product.id,
    productName: product.name,
    originalUrl: product.url,
    fixedUrl: null,
    status: 'unfixable'
  }

  // Case 1: No URL at all
  if (!product.url) {
    result.status = 'no_url'
    result.reason = 'Product has no URL'
    
    // Try to construct URL from migrosId if available
    if (product.migrosId) {
      const constructedUrl = `https://www.migros.ch/fr/product/${product.migrosId}`
      const validation = await validateUrl(constructedUrl)
      
      if (validation.isValid) {
        result.fixedUrl = constructedUrl
        result.status = 'fixed'
        result.reason = 'Constructed URL from migrosId'
      } else {
        result.reason = 'No URL and constructed URL is invalid'
      }
    }
    
    return result
  }

  // Case 2: Check if current URL is valid
  const currentValidation = await validateUrl(product.url)
  
  if (currentValidation.isValid) {
    result.status = 'valid'
    result.fixedUrl = currentValidation.redirectUrl || product.url
    result.statusCode = currentValidation.statusCode
    
    if (currentValidation.redirectUrl && currentValidation.redirectUrl !== product.url) {
      result.status = 'fixed'
      result.reason = 'URL redirected to new location'
    }
    
    return result
  }

  // Case 3: Try common URL fixes
  const urlFixes = await tryCommonFixes(product)
  
  if (urlFixes.fixedUrl) {
    result.fixedUrl = urlFixes.fixedUrl
    result.status = 'fixed'
    result.reason = urlFixes.reason
    result.statusCode = urlFixes.statusCode
    return result
  }

  // Case 4: Extract product ID and try different URL patterns
  const productId = extractProductId(product.url) || product.migrosId
  
  if (productId) {
    const urlPatterns = [
      `https://www.migros.ch/fr/product/${productId}`,
      `https://www.migros.ch/de/product/${productId}`,
      `https://www.migros.ch/fr/product/mo/${productId}`,
      `https://www.migros.ch/product/${productId}`
    ]

    for (const pattern of urlPatterns) {
      const validation = await validateUrl(pattern)
      
      if (validation.isValid) {
        result.fixedUrl = validation.redirectUrl || pattern
        result.status = 'fixed'
        result.reason = `Found valid URL with pattern: ${pattern}`
        result.statusCode = validation.statusCode
        return result
      }
    }
  }

  // Case 5: Search for product by name (fallback)
  const searchResult = await searchProductByName(product.name, product.brand)
  
  if (searchResult) {
    result.fixedUrl = searchResult.url
    result.status = 'fixed'
    result.reason = 'Found product through search API'
    return result
  }

  result.reason = currentValidation.error || `HTTP ${currentValidation.statusCode || 'error'}`
  return result
}

/**
 * Try common URL fixes
 */
async function tryCommonFixes(product: any): Promise<{ fixedUrl?: string; reason?: string; statusCode?: number }> {
  const url = product.url
  
  // Fix 1: Add missing protocol
  if (!url.startsWith('http')) {
    const fixedUrl = `https://${url}`
    const validation = await validateUrl(fixedUrl)
    
    if (validation.isValid) {
      return {
        fixedUrl: validation.redirectUrl || fixedUrl,
        reason: 'Added missing protocol',
        statusCode: validation.statusCode
      }
    }
  }

  // Fix 2: Fix www subdomain
  if (url.includes('migros.ch') && !url.includes('www.migros.ch')) {
    const fixedUrl = url.replace('migros.ch', 'www.migros.ch')
    const validation = await validateUrl(fixedUrl)
    
    if (validation.isValid) {
      return {
        fixedUrl: validation.redirectUrl || fixedUrl,
        reason: 'Added www subdomain',
        statusCode: validation.statusCode
      }
    }
  }

  // Fix 3: Decode URL encoding issues
  try {
    const decodedUrl = decodeURIComponent(url)
    if (decodedUrl !== url) {
      const validation = await validateUrl(decodedUrl)
      
      if (validation.isValid) {
        return {
          fixedUrl: validation.redirectUrl || decodedUrl,
          reason: 'Fixed URL encoding',
          statusCode: validation.statusCode
        }
      }
    }
  } catch (e) {
    // URL decoding failed, skip
  }

  // Fix 4: Remove query parameters
  if (url.includes('?')) {
    const baseUrl = url.split('?')[0]
    const validation = await validateUrl(baseUrl)
    
    if (validation.isValid) {
      return {
        fixedUrl: validation.redirectUrl || baseUrl,
        reason: 'Removed query parameters',
        statusCode: validation.statusCode
      }
    }
  }

  return {}
}

/**
 * Search for product by name using Migros API
 */
async function searchProductByName(name: string, brand?: string): Promise<{ url: string } | null> {
  try {
    const searchQuery = brand ? `${brand} ${name}` : name
    
    const response = await axios.post(
      'https://www.migros.ch/product-display/public/v2/search',
      {
        query: searchQuery,
        sortBy: 'RELEVANCE',
        page: 0,
        pageSize: 5,
        filters: {}
      },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    )

    if (response.data?.productIds && response.data.productIds.length > 0) {
      // Check if first result is a good match
      const productId = response.data.productIds[0]
      const productUrl = `https://www.migros.ch/fr/product/${productId}`
      
      // Validate the URL before returning
      const validation = await validateUrl(productUrl)
      
      if (validation.isValid) {
        return { url: validation.redirectUrl || productUrl }
      }
    }
  } catch (error) {
    // Search failed, return null
  }
  
  return null
}

/**
 * Main function to fix all product URLs
 */
async function fixProductUrls() {
  console.log('🔧 Starting URL Fix Process\n')

  // Get all products
  const products = await prisma.migrosProduct.findMany({
    orderBy: { lastUpdated: 'desc' }
  })

  console.log(`Found ${products.length} total products\n`)

  const report: FixReport = {
    totalProducts: products.length,
    noUrl: 0,
    alreadyValid: 0,
    fixed: 0,
    unfixable: 0,
    results: [],
    unfixableProducts: [],
    timestamp: new Date().toISOString()
  }

  // Process products in batches to avoid rate limiting
  const batchSize = 10
  const delayMs = 1000 // 1 second delay between batches

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}...`)
    
    const batchResults = await Promise.all(
      batch.map(product => attemptUrlFix(product))
    )
    
    // Process results
    for (const result of batchResults) {
      report.results.push(result)
      
      switch (result.status) {
        case 'no_url':
          report.noUrl++
          if (result.fixedUrl) {
            report.fixed++
            await updateProductUrl(result.productId, result.fixedUrl)
          } else {
            report.unfixable++
            report.unfixableProducts.push(result)
          }
          break
          
        case 'valid':
          report.alreadyValid++
          // Update URL if there was a redirect
          if (result.fixedUrl && result.fixedUrl !== result.originalUrl) {
            await updateProductUrl(result.productId, result.fixedUrl)
          }
          break
          
        case 'fixed':
          report.fixed++
          await updateProductUrl(result.productId, result.fixedUrl!)
          break
          
        case 'unfixable':
          report.unfixable++
          report.unfixableProducts.push(result)
          break
      }
    }
    
    // Progress update
    const processed = Math.min(i + batchSize, products.length)
    console.log(`✓ Processed ${processed}/${products.length} products`)
    console.log(`  - Valid: ${report.alreadyValid}`)
    console.log(`  - Fixed: ${report.fixed}`)
    console.log(`  - Unfixable: ${report.unfixable}`)
    console.log(`  - No URL: ${report.noUrl}\n`)
    
    // Rate limiting delay
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  // Generate report
  console.log('\n📊 URL FIX SUMMARY')
  console.log('==================\n')
  console.log(`Total products: ${report.totalProducts}`)
  console.log(`Products with no URL: ${report.noUrl}`)
  console.log(`Already valid URLs: ${report.alreadyValid}`)
  console.log(`Fixed URLs: ${report.fixed}`)
  console.log(`Unfixable URLs: ${report.unfixable}`)
  console.log(`Success rate: ${((report.alreadyValid + report.fixed) / report.totalProducts * 100).toFixed(1)}%`)

  // Save detailed report
  const reportPath = join(process.cwd(), `url-fix-report-${new Date().toISOString().split('T')[0]}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n💾 Detailed report saved to: ${reportPath}`)

  // Save unfixable products list
  if (report.unfixableProducts.length > 0) {
    const unfixablePath = join(process.cwd(), `unfixable-products-${new Date().toISOString().split('T')[0]}.json`)
    writeFileSync(unfixablePath, JSON.stringify(report.unfixableProducts, null, 2))
    console.log(`📝 Unfixable products list saved to: ${unfixablePath}`)
  }

  await prisma.$disconnect()
}

/**
 * Update product URL in database
 */
async function updateProductUrl(productId: string, newUrl: string): Promise<void> {
  try {
    await prisma.migrosProduct.update({
      where: { id: productId },
      data: { 
        url: newUrl,
        lastUpdated: new Date()
      }
    })
  } catch (error) {
    console.error(`Failed to update product ${productId}:`, error)
  }
}

// Run the fix process
fixProductUrls().catch(console.error)