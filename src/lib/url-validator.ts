import axios from 'axios'

export interface UrlValidationResult {
  url: string
  isValid: boolean
  statusCode?: number
  redirectUrl?: string
  error?: string
  isProductPage?: boolean
  suggestedFix?: string
}

/**
 * Validate a URL by making a HEAD request to check if it exists
 * Enhanced with better error handling and redirect detection
 */
export async function validateUrl(url: string, options?: { 
  checkContent?: boolean 
}): Promise<UrlValidationResult> {
  try {
    // First, do basic URL validation
    if (!isValidUrlFormat(url)) {
      return {
        url,
        isValid: false,
        error: 'Invalid URL format'
      }
    }

    // Use GET if we need to check content, otherwise HEAD
    const method = options?.checkContent ? 'get' : 'head'
    
    const response = await axios({
      method,
      url,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-CH,fr;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    })

    const result: UrlValidationResult = {
      url,
      isValid: response.status >= 200 && response.status < 400,
      statusCode: response.status
    }

    // Check if URL was redirected
    const finalUrl = response.request?.res?.responseUrl || response.request?.responseURL
    if (finalUrl && finalUrl !== url) {
      result.redirectUrl = finalUrl
    }

    // Check if it's actually a product page (if content check is enabled)
    if (options?.checkContent && method === 'get' && response.data) {
      result.isProductPage = isProductPage(response.data)
    }

    return result
  } catch (error: any) {
    // Enhanced error handling
    if (error.code === 'ENOTFOUND') {
      return {
        url,
        isValid: false,
        error: 'Domain not found'
      }
    } else if (error.code === 'ETIMEDOUT') {
      return {
        url,
        isValid: false,
        error: 'Request timeout'
      }
    } else if (error.response) {
      return {
        url,
        isValid: false,
        statusCode: error.response.status,
        error: `HTTP ${error.response.status}`
      }
    }
    
    return {
      url,
      isValid: false,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Check if a string is a valid URL format
 */
export function isValidUrlFormat(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Check if HTML content is a product page
 */
function isProductPage(html: string): boolean {
  const productIndicators = [
    'product-detail',
    'ProductDetail',
    'product-info',
    'add-to-cart',
    'data-product-id',
    'product-price',
    'nutritional-values',
    '"@type":"Product"',
    'productID'
  ]
  
  const htmlLower = html.toLowerCase()
  return productIndicators.some(indicator => 
    htmlLower.includes(indicator.toLowerCase())
  )
}

/**
 * Batch validate multiple URLs with rate limiting
 */
export async function validateUrls(
  urls: string[], 
  options: { 
    concurrency?: number
    delayMs?: number 
  } = {}
): Promise<UrlValidationResult[]> {
  const { concurrency = 5, delayMs = 100 } = options
  const results: UrlValidationResult[] = []
  
  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(url => validateUrl(url))
    )
    results.push(...batchResults)
    
    // Rate limiting delay
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  return results
}

/**
 * Check if a Migros product URL is properly formatted
 */
export function isMigrosProductUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return (
      urlObj.hostname === 'www.migros.ch' &&
      urlObj.pathname.includes('/product/')
    )
  } catch {
    return false
  }
}

/**
 * Extract product ID from Migros URL
 */
export function extractProductId(url: string): string | null {
  // Try multiple patterns
  const patterns = [
    /\/product\/(?:mo\/)?(\d+)/,
    /\/(\d{6,})/,  // 6+ digit number in URL
    /[?&]id=(\d+)/,  // ID in query parameter
    /migros\.ch\/.*\/(\d+)$/  // ID at end of URL
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

/**
 * Clean and normalize a Migros product URL
 */
export function normalizeProductUrl(url: string): string {
  try {
    // Remove trailing slashes and query parameters
    let cleanUrl = url.replace(/\/$/, '').split('?')[0]
    
    // Ensure proper protocol
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl
    }
    
    // Ensure www subdomain for migros.ch
    cleanUrl = cleanUrl.replace(/https?:\/\/migros\.ch/, 'https://www.migros.ch')
    
    // Normalize language path (default to fr)
    if (!cleanUrl.includes('/fr/') && !cleanUrl.includes('/de/') && !cleanUrl.includes('/it/')) {
      cleanUrl = cleanUrl.replace('/product/', '/fr/product/')
    }
    
    return cleanUrl
  } catch {
    return url
  }
}

/**
 * Generate possible URL variations for a product
 */
export function generateUrlVariations(productId: string): string[] {
  const variations = [
    `https://www.migros.ch/fr/product/${productId}`,
    `https://www.migros.ch/de/product/${productId}`,
    `https://www.migros.ch/it/product/${productId}`,
    `https://www.migros.ch/fr/product/mo/${productId}`,
    `https://www.migros.ch/product/${productId}`,
    `https://migros.ch/fr/product/${productId}`
  ]
  
  return [...new Set(variations)] // Remove duplicates
}

/**
 * Validate URL during scraping before saving
 */
export async function validateScrapedUrl(url: string, productName?: string): Promise<{
  isValid: boolean
  finalUrl: string
  reason?: string
}> {
  // Step 1: Basic format validation
  if (!url || !isValidUrlFormat(url)) {
    return {
      isValid: false,
      finalUrl: url,
      reason: 'Invalid URL format'
    }
  }
  
  // Step 2: Normalize the URL
  const normalizedUrl = normalizeProductUrl(url)
  
  // Step 3: Check if it's a Migros product URL
  if (!isMigrosProductUrl(normalizedUrl)) {
    return {
      isValid: false,
      finalUrl: normalizedUrl,
      reason: 'Not a Migros product URL'
    }
  }
  
  // Step 4: Validate the URL
  const validation = await validateUrl(normalizedUrl)
  
  if (validation.isValid) {
    return {
      isValid: true,
      finalUrl: validation.redirectUrl || normalizedUrl,
      reason: validation.redirectUrl ? 'URL redirected' : 'URL is valid'
    }
  }
  
  // Step 5: Try to fix the URL if validation failed
  const productId = extractProductId(normalizedUrl)
  if (productId) {
    const variations = generateUrlVariations(productId)
    
    for (const variation of variations) {
      const varValidation = await validateUrl(variation)
      if (varValidation.isValid) {
        return {
          isValid: true,
          finalUrl: varValidation.redirectUrl || variation,
          reason: 'Found valid URL variation'
        }
      }
    }
  }
  
  return {
    isValid: false,
    finalUrl: normalizedUrl,
    reason: validation.error || 'URL validation failed'
  }
}