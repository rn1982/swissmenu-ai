// Migros Session Capture Tool
// This helps capture and analyze real browser sessions

import { chromium } from 'playwright'
import * as fs from 'fs/promises'
import * as path from 'path'

interface CapturedRequest {
  url: string
  method: string
  headers: Record<string, string>
  postData?: string
  timestamp: number
  responseStatus?: number
  responseHeaders?: Record<string, string>
  responseData?: any
}

class MigrosSessionCapture {
  private capturedRequests: CapturedRequest[] = []
  private sessionData: any = {
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    userAgent: '',
    viewport: {}
  }

  async captureSession() {
    console.log('🎬 Starting Migros Session Capture...')
    
    const browser = await chromium.launch({
      headless: false, // Show browser for manual interaction
      devtools: true   // Open devtools to see network
    })

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'fr-CH',
      timezoneId: 'Europe/Zurich'
    })

    const page = await context.newPage()

    // Capture all requests
    page.on('request', request => {
      const url = request.url()
      
      // Focus on API calls
      if (url.includes('/api/') || url.includes('graphql') || url.includes('product')) {
        const captured: CapturedRequest = {
          url,
          method: request.method(),
          headers: request.headers(),
          postData: request.postData() || undefined,
          timestamp: Date.now()
        }
        
        console.log(`📡 Captured: ${request.method()} ${url.substring(0, 80)}...`)
        this.capturedRequests.push(captured)
      }
    })

    // Capture responses
    page.on('response', async response => {
      const url = response.url()
      const request = this.capturedRequests.find(r => r.url === url && !r.responseStatus)
      
      if (request) {
        request.responseStatus = response.status()
        request.responseHeaders = response.headers()
        
        try {
          const contentType = response.headers()['content-type'] || ''
          if (contentType.includes('application/json')) {
            request.responseData = await response.json()
            console.log(`✅ Got JSON response for ${url.substring(0, 60)}...`)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    })

    console.log('\n📝 Instructions:')
    console.log('1. Navigate to https://www.migros.ch/fr')
    console.log('2. Search for a product (e.g., "pasta")')
    console.log('3. Click on a few products to load their pages')
    console.log('4. Add something to cart if possible')
    console.log('5. When done, press Enter in the terminal')
    
    await page.goto('https://www.migros.ch/fr')

    // Wait for user to finish
    await new Promise(resolve => {
      process.stdin.once('data', resolve)
    })

    // Capture final session state
    this.sessionData.cookies = await context.cookies()
    this.sessionData.userAgent = await page.evaluate(() => navigator.userAgent)
    this.sessionData.viewport = page.viewportSize()
    
    // Save localStorage and sessionStorage
    this.sessionData.localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) items[key] = localStorage.getItem(key) || ''
      }
      return items
    })

    await browser.close()
    
    // Save captured data
    await this.saveSessionData()
  }

  async saveSessionData() {
    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const outputDir = path.join(process.cwd(), 'captured-sessions')
    await fs.mkdir(outputDir, { recursive: true })

    // Save requests
    const requestsFile = path.join(outputDir, `requests-${timestamp}.json`)
    await fs.writeFile(requestsFile, JSON.stringify(this.capturedRequests, null, 2))
    
    // Save session data
    const sessionFile = path.join(outputDir, `session-${timestamp}.json`)
    await fs.writeFile(sessionFile, JSON.stringify(this.sessionData, null, 2))
    
    // Generate analysis report
    const report = this.analyzeCapture()
    const reportFile = path.join(outputDir, `analysis-${timestamp}.md`)
    await fs.writeFile(reportFile, report)
    
    console.log(`\n✅ Session captured and saved to ${outputDir}`)
    console.log(`📊 Captured ${this.capturedRequests.length} requests`)
  }

  analyzeCapture(): string {
    const apiEndpoints = new Set<string>()
    const productUrls = []
    const graphqlQueries = []
    
    for (const req of this.capturedRequests) {
      // Extract API patterns
      if (req.url.includes('/api/')) {
        const urlObj = new URL(req.url)
        apiEndpoints.add(urlObj.pathname)
      }
      
      // Find product URLs
      if (req.url.includes('/product/') && req.responseData) {
        productUrls.push({
          url: req.url,
          hasData: !!req.responseData
        })
      }
      
      // GraphQL queries
      if (req.url.includes('graphql') && req.postData) {
        try {
          const query = JSON.parse(req.postData)
          graphqlQueries.push(query)
        } catch {}
      }
    }
    
    let report = '# Migros Session Analysis\n\n'
    report += `## Summary\n`
    report += `- Total requests captured: ${this.capturedRequests.length}\n`
    report += `- API endpoints found: ${apiEndpoints.size}\n`
    report += `- Product URLs found: ${productUrls.length}\n`
    report += `- GraphQL queries: ${graphqlQueries.length}\n\n`
    
    report += '## API Endpoints\n'
    apiEndpoints.forEach(endpoint => {
      report += `- ${endpoint}\n`
    })
    
    report += '\n## Key Headers Found\n'
    const headers = new Set<string>()
    this.capturedRequests.forEach(req => {
      Object.keys(req.headers).forEach(h => headers.add(h))
    })
    
    const importantHeaders = ['authorization', 'x-api-key', 'x-csrf-token', 'x-requested-with']
    importantHeaders.forEach(h => {
      if (Array.from(headers).some(header => header.toLowerCase().includes(h))) {
        report += `- ${h}: FOUND\n`
      }
    })
    
    return report
  }
}

// Run the capture
async function main() {
  const capture = new MigrosSessionCapture()
  await capture.captureSession()
}

main().catch(console.error)