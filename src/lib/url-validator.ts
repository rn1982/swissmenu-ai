import axios from 'axios'

export interface UrlValidationResult {
  url: string
  isValid: boolean
  statusCode?: number
  redirectUrl?: string
  error?: string
}

/**
 * Validate a URL by making a HEAD request to check if it exists
 * This is more efficient than GET for validation
 */
export async function validateUrl(url: string): Promise<UrlValidationResult> {
  try {
    const response = await axios.head(url, {
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MigrosProductValidator/1.0)'
      },
      timeout: 10000
    })

    const result: UrlValidationResult = {
      url,
      isValid: response.status >= 200 && response.status < 400,
      statusCode: response.status
    }

    // Check if URL was redirected
    if (response.request?.res?.responseUrl && response.request.res.responseUrl !== url) {
      result.redirectUrl = response.request.res.responseUrl
    }

    return result
  } catch (error: any) {
    return {
      url,
      isValid: false,
      error: error.message || 'Unknown error'
    }
  }
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
  const match = url.match(/\/product\/(?:mo\/)?(\d+)/)
  return match ? match[1] : null
}