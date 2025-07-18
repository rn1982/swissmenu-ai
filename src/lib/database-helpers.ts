// Database helper functions for price validation

import { db } from './db'
import type { ScrapedProduct } from './proxy-scraper'

/**
 * Save a scraped product with price validation data
 */
export async function saveScrapedProductWithValidation(product: ScrapedProduct) {
  const data = {
    id: product.id,
    migrosId: product.id,
    name: product.name,
    brand: product.brand,
    priceChf: product.priceChf,
    price: product.priceChf,
    url: product.url,
    imageUrl: product.imageUrl,
    category: product.category,
    source: product.source,
    lastScraped: new Date(),
    priceConfidence: product.priceConfidence,
    priceVariants: product.priceVariants,
    needsPriceReview: product.priceConfidence === 'low' || product.priceChf === 0
  }

  // Update MigrosProduct table
  await db.migrosProduct.upsert({
    where: { id: product.id },
    update: data,
    create: data
  })

  // Also update Product table for compatibility
  await db.product.upsert({
    where: { migrosId: product.id },
    update: {
      ...data,
      migrosId: product.id
    },
    create: {
      ...data,
      migrosId: product.id
    }
  })

  return data
}

/**
 * Get products that need price review
 */
export async function getProductsNeedingPriceReview() {
  return await db.migrosProduct.findMany({
    where: {
      OR: [
        { needsPriceReview: true },
        { priceConfidence: 'low' },
        { priceChf: 0 },
        { priceChf: null }
      ]
    },
    orderBy: { lastUpdated: 'desc' }
  })
}

/**
 * Get price validation statistics
 */
export async function getPriceValidationStats() {
  const [total, highConfidence, mediumConfidence, lowConfidence, needsReview] = await Promise.all([
    db.migrosProduct.count(),
    db.migrosProduct.count({ where: { priceConfidence: 'high' } }),
    db.migrosProduct.count({ where: { priceConfidence: 'medium' } }),
    db.migrosProduct.count({ where: { priceConfidence: 'low' } }),
    db.migrosProduct.count({ where: { needsPriceReview: true } })
  ])

  return {
    total,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    needsReview,
    percentageHighConfidence: total > 0 ? (highConfidence / total * 100).toFixed(1) : '0',
    percentageMediumConfidence: total > 0 ? (mediumConfidence / total * 100).toFixed(1) : '0',
    percentageLowConfidence: total > 0 ? (lowConfidence / total * 100).toFixed(1) : '0'
  }
}