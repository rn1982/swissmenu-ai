# Price Validation System - Implementation Guide

## Overview
The price validation system has been implemented to handle multi-pack detection and ensure accurate price extraction from Migros product pages.

## Features Implemented

### 1. Enhanced Price Extraction (`src/lib/price-validation.ts`)
- Extracts ALL prices found on a product page
- Identifies pack sizes and quantities using pattern matching
- Intelligently selects the base unit price (not multi-pack)
- Provides confidence scoring for price accuracy
- Returns detailed information about price selection reasoning

### 2. Updated Scraper (`src/lib/proxy-scraper.ts`)
- Integrated the new price validation logic
- Enhanced product interface to include price validation data
- Detailed logging of multi-price scenarios
- Saves all price variants for later review

### 3. Database Schema Updates
- Added `priceVariants` (JSONB) - stores all found price/size combinations
- Added `priceConfidence` (VARCHAR) - 'high', 'medium', or 'low'
- Added `needsPriceReview` (BOOLEAN) - flags products for manual review

### 4. Helper Functions (`src/lib/database-helpers.ts`)
- `saveScrapedProductWithValidation()` - saves products with validation data
- `getProductsNeedingPriceReview()` - retrieves products flagged for review
- `getPriceValidationStats()` - provides statistics on price confidence

### 5. Admin Interface (`src/app/admin/price-review/page.tsx`)
- Review products with low confidence or missing prices
- See all price variants found for each product
- Manually update prices with one click
- View price validation statistics

### 6. API Endpoints (`src/app/api/admin/price-review/route.ts`)
- GET: Retrieve products needing review with optional statistics
- POST: Update product prices after manual review

## Usage

### Running the Test Script
```bash
npm run tsx src/scripts/test-price-validation.ts
```

This will:
1. Test specific products known to have multi-pack issues
2. Show detailed price extraction results
3. Save products to database with validation data
4. Display statistics and products needing review

### Accessing the Admin Interface
Navigate to: http://localhost:3000/admin/price-review

### API Usage
```bash
# Get products needing review
curl http://localhost:3000/api/admin/price-review?limit=20&stats=true

# Update a product's price
curl -X POST http://localhost:3000/api/admin/price-review \
  -H "Content-Type: application/json" \
  -d '{"productId": "11790", "newPrice": 1.90, "confidence": "high"}'
```

## How It Works

### Price Selection Algorithm
1. **Single Price**: High confidence, use as-is
2. **Multiple Prices with Size Info**: Medium confidence, prefer smallest unit
3. **Multiple Prices without Context**: Low confidence, select lowest reasonable price

### Confidence Levels
- **High**: Only one price found or clear single-unit price identified
- **Medium**: Multiple prices with identifiable size/pack information
- **Low**: Multiple prices without clear context or no price found

### Pattern Recognition
The system recognizes various pack size patterns:
- "3 x 500g", "500g x 3"
- "Family Pack", "Familienpackung"
- "Multipack", "6er Pack"
- Weight indicators: "500g", "1kg", "2l"
- Size indicators: "klein", "mittel", "gross"

## Migration Guide

### Running Database Migration
```bash
npx prisma migrate dev
```

### Updating Existing Products
To update existing products with price validation:
```bash
npm run tsx src/scripts/update-existing-products-validation.ts
```

## Monitoring

### Check Price Validation Stats
```typescript
const stats = await getPriceValidationStats()
console.log(`High confidence: ${stats.percentageHighConfidence}%`)
console.log(`Products needing review: ${stats.needsReview}`)
```

### Find Problem Products
```typescript
const problemProducts = await db.migrosProduct.findMany({
  where: {
    OR: [
      { priceConfidence: 'low' },
      { priceChf: 0 },
      { needsPriceReview: true }
    ]
  }
})
```

## Future Enhancements
1. Machine learning model to improve price selection
2. Automated re-scraping of low-confidence products
3. Historical price tracking
4. Price change alerts
5. Bulk price update tools