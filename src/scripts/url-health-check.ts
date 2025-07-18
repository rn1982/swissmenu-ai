import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { validateUrls, validateUrl } from '../lib/url-validator'
import nodemailer from 'nodemailer'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

interface HealthCheckResult {
  totalProducts: number
  checkedUrls: number
  validUrls: number
  invalidUrls: number
  redirectedUrls: number
  missingUrls: number
  errorsByType: Record<string, number>
  invalidProducts: Array<{
    id: string
    name: string
    url: string | null
    error: string
    lastUpdated: Date
  }>
  performanceMetrics: {
    duration: number
    avgResponseTime: number
  }
}

/**
 * Perform comprehensive URL health check
 */
async function performHealthCheck(options: {
  sampleSize?: number
  fullScan?: boolean
  categories?: string[]
} = {}): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const { sampleSize = 100, fullScan = false, categories } = options
  
  console.log('🏥 Starting URL Health Check')
  console.log(`Mode: ${fullScan ? 'Full Scan' : `Sample (${sampleSize} products)`}`)
  if (categories?.length) {
    console.log(`Categories: ${categories.join(', ')}`)
  }
  console.log('')

  // Build query
  const whereClause: any = {}
  if (categories?.length) {
    whereClause.category = { in: categories }
  }

  // Get products to check
  const products = await prisma.migrosProduct.findMany({
    where: whereClause,
    take: fullScan ? undefined : sampleSize,
    orderBy: fullScan ? undefined : { lastUpdated: 'asc' }, // Check oldest first in sample mode
    select: {
      id: true,
      name: true,
      url: true,
      category: true,
      lastUpdated: true
    }
  })

  console.log(`Found ${products.length} products to check\n`)

  // Initialize result
  const result: HealthCheckResult = {
    totalProducts: products.length,
    checkedUrls: 0,
    validUrls: 0,
    invalidUrls: 0,
    redirectedUrls: 0,
    missingUrls: 0,
    errorsByType: {},
    invalidProducts: [],
    performanceMetrics: {
      duration: 0,
      avgResponseTime: 0
    }
  }

  // Separate products with and without URLs
  const productsWithUrls = products.filter(p => p.url)
  const productsWithoutUrls = products.filter(p => !p.url)
  
  result.missingUrls = productsWithoutUrls.length
  
  // Add products without URLs to invalid list
  productsWithoutUrls.forEach(product => {
    result.invalidProducts.push({
      id: product.id,
      name: product.name,
      url: null,
      error: 'No URL',
      lastUpdated: product.lastUpdated
    })
  })

  // Check URLs in batches
  const batchSize = 20
  const totalResponseTimes: number[] = []
  
  for (let i = 0; i < productsWithUrls.length; i += batchSize) {
    const batch = productsWithUrls.slice(i, i + batchSize)
    const batchUrls = batch.map(p => p.url!)
    
    console.log(`Checking batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productsWithUrls.length / batchSize)}...`)
    
    const batchStartTime = Date.now()
    const validationResults = await validateUrls(batchUrls, {
      concurrency: 5,
      delayMs: 200
    })
    const batchDuration = Date.now() - batchStartTime
    totalResponseTimes.push(batchDuration / batch.length)
    
    // Process results
    validationResults.forEach((validation, index) => {
      const product = batch[index]
      result.checkedUrls++
      
      if (validation.isValid) {
        result.validUrls++
        
        if (validation.redirectUrl && validation.redirectUrl !== product.url) {
          result.redirectedUrls++
          
          // Update redirected URL in database
          updateProductUrl(product.id, validation.redirectUrl).catch(err => {
            console.error(`Failed to update redirected URL for ${product.id}:`, err)
          })
        }
      } else {
        result.invalidUrls++
        
        // Track error types
        const errorType = validation.error || `HTTP ${validation.statusCode || 'unknown'}`
        result.errorsByType[errorType] = (result.errorsByType[errorType] || 0) + 1
        
        // Add to invalid products list
        result.invalidProducts.push({
          id: product.id,
          name: product.name,
          url: product.url,
          error: errorType,
          lastUpdated: product.lastUpdated
        })
      }
    })
    
    // Progress update
    const progress = Math.min(i + batchSize, productsWithUrls.length)
    const percentComplete = (progress / productsWithUrls.length * 100).toFixed(1)
    console.log(`✓ Progress: ${progress}/${productsWithUrls.length} (${percentComplete}%)`)
    console.log(`  Valid: ${result.validUrls} | Invalid: ${result.invalidUrls} | Redirected: ${result.redirectedUrls}\n`)
  }

  // Calculate performance metrics
  result.performanceMetrics.duration = (Date.now() - startTime) / 1000 // seconds
  result.performanceMetrics.avgResponseTime = totalResponseTimes.length > 0
    ? totalResponseTimes.reduce((a, b) => a + b, 0) / totalResponseTimes.length
    : 0

  return result
}

/**
 * Update product URL in database
 */
async function updateProductUrl(productId: string, newUrl: string): Promise<void> {
  await prisma.migrosProduct.update({
    where: { id: productId },
    data: { 
      url: newUrl,
      lastUpdated: new Date()
    }
  })
}

/**
 * Generate health check report
 */
function generateReport(result: HealthCheckResult): string {
  const healthScore = (result.validUrls / result.checkedUrls * 100).toFixed(1)
  
  let report = `# URL Health Check Report\n\n`
  report += `Generated: ${new Date().toISOString()}\n`
  report += `Duration: ${result.performanceMetrics.duration.toFixed(2)} seconds\n\n`
  
  report += `## Summary\n`
  report += `- **Health Score**: ${healthScore}%\n`
  report += `- **Total Products**: ${result.totalProducts}\n`
  report += `- **URLs Checked**: ${result.checkedUrls}\n`
  report += `- **Valid URLs**: ${result.validUrls}\n`
  report += `- **Invalid URLs**: ${result.invalidUrls}\n`
  report += `- **Redirected URLs**: ${result.redirectedUrls}\n`
  report += `- **Missing URLs**: ${result.missingUrls}\n\n`
  
  report += `## Error Breakdown\n`
  Object.entries(result.errorsByType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([error, count]) => {
      report += `- ${error}: ${count}\n`
    })
  report += `\n`
  
  if (result.invalidProducts.length > 0) {
    report += `## Invalid Products (Top 20)\n`
    result.invalidProducts
      .slice(0, 20)
      .forEach(product => {
        report += `- **${product.name}** (ID: ${product.id})\n`
        report += `  - URL: ${product.url || 'None'}\n`
        report += `  - Error: ${product.error}\n`
        report += `  - Last Updated: ${product.lastUpdated.toISOString()}\n\n`
      })
  }
  
  report += `## Performance\n`
  report += `- Average Response Time: ${result.performanceMetrics.avgResponseTime.toFixed(2)}ms\n`
  
  return report
}

/**
 * Send alert if health check fails threshold
 */
async function sendAlert(result: HealthCheckResult, threshold: number = 90): Promise<void> {
  const healthScore = (result.validUrls / result.checkedUrls * 100)
  
  if (healthScore < threshold && process.env.SMTP_HOST) {
    console.log(`\n⚠️  Health score ${healthScore.toFixed(1)}% is below threshold ${threshold}%`)
    
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
      
      const report = generateReport(result)
      
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@example.com',
        to: process.env.ALERT_EMAIL || 'admin@example.com',
        subject: `⚠️ URL Health Check Alert - ${healthScore.toFixed(1)}% Health Score`,
        text: report,
        html: `<pre>${report}</pre>`
      })
      
      console.log('Alert email sent successfully')
    } catch (error) {
      console.error('Failed to send alert email:', error)
    }
  }
}

/**
 * Main health check runner
 */
async function runHealthCheck(options: {
  mode?: 'sample' | 'full' | 'category'
  categories?: string[]
  threshold?: number
  saveReport?: boolean
} = {}) {
  const { 
    mode = 'sample', 
    categories,
    threshold = 90,
    saveReport = true
  } = options
  
  console.log('🏥 Migros Product URL Health Check\n')
  
  try {
    let result: HealthCheckResult
    
    switch (mode) {
      case 'full':
        result = await performHealthCheck({ fullScan: true })
        break
        
      case 'category':
        result = await performHealthCheck({ 
          fullScan: true, 
          categories: categories || ['pasta', 'dairy', 'meat']
        })
        break
        
      default: // sample
        result = await performHealthCheck({ sampleSize: 100 })
    }
    
    // Generate report
    const report = generateReport(result)
    console.log('\n' + report)
    
    // Save report if requested
    if (saveReport) {
      const filename = `url-health-check-${mode}-${new Date().toISOString().split('T')[0]}.md`
      const filepath = join(process.cwd(), 'reports', filename)
      writeFileSync(filepath, report)
      console.log(`\n💾 Report saved to: ${filepath}`)
    }
    
    // Send alert if needed
    await sendAlert(result, threshold)
    
    // Return status code based on health
    const healthScore = (result.validUrls / result.checkedUrls * 100)
    process.exit(healthScore >= threshold ? 0 : 1)
    
  } catch (error) {
    console.error('Health check failed:', error)
    process.exit(2)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const mode = args.includes('--full') ? 'full' : 
             args.includes('--category') ? 'category' : 
             'sample'

const categoriesArg = args.find(arg => arg.startsWith('--categories='))
const categories = categoriesArg ? categoriesArg.split('=')[1].split(',') : undefined

const thresholdArg = args.find(arg => arg.startsWith('--threshold='))
const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1]) : 90

// Run health check
runHealthCheck({ mode, categories, threshold }).catch(console.error)