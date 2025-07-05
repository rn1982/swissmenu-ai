# Price Validation Enhancement - TODO

## Issue Discovered
During testing, we found that some products may have multiple prices for different pack sizes:
- Example: M-Classic macaronis showed CHF 3.95 (family pack) instead of CHF 1.90 (single pack)
- The scraper currently takes the first price it finds, which might not be the base/smallest unit

## Proposed Solution

### 1. Enhanced Price Extraction
```typescript
// Store multiple prices found on the page
interface ProductPrices {
  mainPrice: number;        // The price we choose to use
  allPrices: number[];      // All prices found on page
  priceVariants?: {         // Optional: detected variants
    size: string;
    price: number;
  }[];
  confidence: 'high' | 'medium' | 'low';  // Confidence in price accuracy
}
```

### 2. Implementation Strategy
- Modify `parseProductFromHtml()` to extract ALL prices
- Look for size indicators (e.g., "500g", "1kg", "family pack")
- Prefer the lowest reasonable price (likely the base unit)
- Flag products with multiple prices for review

### 3. Database Schema Update
```sql
-- Add fields to track price validation
ALTER TABLE products ADD COLUMN price_variants JSONB;
ALTER TABLE products ADD COLUMN price_confidence VARCHAR(10);
ALTER TABLE products ADD COLUMN needs_price_review BOOLEAN DEFAULT FALSE;
```

### 4. Validation Rules
- If only one price found: HIGH confidence
- If multiple prices with clear size indicators: MEDIUM confidence
- If multiple prices without clear context: LOW confidence, flag for review

### 5. Review Interface
Create a simple admin page to:
- List products with LOW confidence or flagged for review
- Show all found prices
- Allow manual price selection
- Update the database with corrected price

## Example Implementation

```typescript
function extractAllPrices($: CheerioAPI): ProductPrices {
  const prices: number[] = [];
  const variants: { size: string; price: number }[] = [];
  
  // Find all price elements
  $('[data-testid*="price"], [class*="price"]').each((i, elem) => {
    const text = $(elem).text();
    const priceMatch = text.match(/(\d+[.,]\d{2})/);
    
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      prices.push(price);
      
      // Look for size context
      const parent = $(elem).parent().text();
      const sizeMatch = parent.match(/(\d+\s*[gkl]|family|pack)/i);
      if (sizeMatch) {
        variants.push({ size: sizeMatch[0], price });
      }
    }
  });
  
  // Choose main price (prefer lowest reasonable price)
  const validPrices = prices.filter(p => p > 0.5 && p < 100);
  const mainPrice = Math.min(...validPrices);
  
  return {
    mainPrice,
    allPrices: [...new Set(prices)],
    priceVariants: variants.length > 0 ? variants : undefined,
    confidence: prices.length === 1 ? 'high' : 
                variants.length > 0 ? 'medium' : 'low'
  };
}
```

## Benefits
- More accurate pricing
- Transparency about price variants
- Ability to audit and correct prices
- Better data quality over time

## When to Implement
- After initial product database is populated
- When we have time for a focused improvement sprint
- Can be done incrementally (add to new scrapes first)