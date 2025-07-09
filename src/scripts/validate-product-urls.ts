#!/usr/bin/env tsx

import { db } from '../lib/db'
import { validateUrls, isMigrosProductUrl } from '../lib/url-validator'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

interface ValidationStats {
  total: number
  valid: number
  invalid: number
  redirected: number
  fixed: number
  removed: number
}

async function validateAndFixProductUrls() {
  console.log('🔍 Validating all product URLs in database...\n')

  const stats: ValidationStats = {
    total: 0,
    valid: 0,
    invalid: 0,
    redirected: 0,
    fixed: 0,
    removed: 0
  }

  try {
    // Get all products with URLs
    const products = await db.migrosProduct.findMany({
      where: {
        url: { not: null }
      },
      orderBy: { lastUpdated: 'desc' }
    })

    stats.total = products.length
    console.log(`📦 Found ${products.length} products with URLs to validate\n`)

    // Extract URLs for batch validation
    const urls = products.map(p => p.url!).filter(url => url)
    
    // Validate URLs in batches
    console.log('🌐 Validating URLs (this may take a while)...\n')
    const validationResults = await validateUrls(urls, {
      concurrency: 10,
      delayMs: 200
    })

    // Create a map for quick lookup
    const resultMap = new Map(
      validationResults.map(result => [result.url, result])
    )

    // Process each product based on validation results
    for (const product of products) {
      const result = resultMap.get(product.url!)
      
      if (!result) continue

      console.log(`\n🔍 ${product.name} (${product.id})`)
      console.log(`   URL: ${product.url}`)

      if (!isMigrosProductUrl(product.url!)) {
        console.log(`   ❌ Invalid URL format - removing`)
        await db.migrosProduct.update({
          where: { id: product.id },
          data: { url: null }
        })
        stats.removed++
        stats.invalid++
        continue
      }

      if (result.isValid) {
        if (result.redirectUrl && result.redirectUrl !== product.url) {
          console.log(`   ↪️ Redirected to: ${result.redirectUrl}`)
          await db.migrosProduct.update({
            where: { id: product.id },
            data: { 
              url: result.redirectUrl,
              lastUpdated: new Date()
            }
          })
          stats.redirected++
          stats.fixed++
        } else {
          console.log(`   ✅ Valid (${result.statusCode})`)
          stats.valid++
        }
      } else {
        console.log(`   ❌ Invalid (${result.statusCode || result.error})`)
        
        // For 404s, remove the URL
        if (result.statusCode === 404) {
          console.log(`   🗑️ Removing 404 URL`)
          await db.migrosProduct.update({
            where: { id: product.id },
            data: { url: null }
          })
          stats.removed++
        }
        stats.invalid++
      }
    }

    // Final report
    console.log('\n' + '='.repeat(60))
    console.log('📊 VALIDATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total products checked: ${stats.total}`)
    console.log(`✅ Valid URLs: ${stats.valid}`)
    console.log(`❌ Invalid URLs: ${stats.invalid}`)
    console.log(`↪️ Redirected URLs: ${stats.redirected}`)
    console.log(`🔧 Fixed URLs: ${stats.fixed}`)
    console.log(`🗑️ Removed URLs: ${stats.removed}`)
    console.log(`📈 Success rate: ${((stats.valid + stats.fixed) / stats.total * 100).toFixed(1)}%`)

    // Show products without URLs
    const productsWithoutUrls = await db.migrosProduct.count({
      where: { url: null }
    })
    console.log(`\n⚠️ Products without URLs: ${productsWithoutUrls}`)

  } catch (error) {
    console.error('❌ Error during validation:', error)
    process.exit(1)
  }
}

// Run the validation
validateAndFixProductUrls().then(() => {
  console.log('\n✅ URL validation complete!')
  process.exit(0)
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})