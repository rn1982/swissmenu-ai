// Price validation and multi-pack detection logic

import * as cheerio from 'cheerio'

export interface ProductPrices {
  mainPrice: number;        // The price we choose to use
  allPrices: number[];      // All prices found on page
  priceVariants?: {         // Optional: detected variants
    size: string;
    price: number;
  }[];
  confidence: 'high' | 'medium' | 'low';  // Confidence in price accuracy
}

export interface PriceExtractionResult extends ProductPrices {
  selectedReason: string;   // Why we chose this price
  warnings?: string[];      // Any issues found
}

/**
 * Extract all prices from a product page HTML
 */
export function extractAllPrices($: cheerio.CheerioAPI): PriceExtractionResult {
  const prices: number[] = [];
  const variants: { size: string; price: number }[] = [];
  const warnings: string[] = [];

  // Common price selectors for Migros
  const priceSelectors = [
    '[data-testid*="price"]',
    '[class*="price"]',
    '.product-price',
    '.price-value',
    '.price',
    'span[class*="Price"]',
    'div[class*="Price"]',
    '[data-cy*="price"]'
  ];

  // Find all price elements
  priceSelectors.forEach(selector => {
    $(selector).each((i, elem) => {
      const text = $(elem).text();
      const priceMatches = text.matchAll(/(\d+[.,]\d{2})/g);
      
      for (const match of priceMatches) {
        const price = parseFloat(match[1].replace(',', '.'));
        if (price > 0 && price < 1000) { // Reasonable price range
          prices.push(price);
          
          // Look for size/quantity context
          const context = getContextText($, elem);
          const sizeInfo = extractSizeInfo(context);
          
          if (sizeInfo) {
            variants.push({ size: sizeInfo, price });
          }
        }
      }
    });
  });

  // Remove duplicates
  const uniquePrices = [...new Set(prices)];
  
  if (uniquePrices.length === 0) {
    warnings.push('No prices found on page');
    return {
      mainPrice: 0,
      allPrices: [],
      confidence: 'low',
      selectedReason: 'No prices found',
      warnings
    };
  }

  // Determine confidence and select main price
  const result = selectMainPrice(uniquePrices, variants);
  
  return {
    ...result,
    allPrices: uniquePrices,
    priceVariants: variants.length > 0 ? variants : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Get surrounding text context for a price element
 */
function getContextText($: cheerio.CheerioAPI, elem: any): string {
  const $elem = $(elem);
  
  // Get text from parent and siblings
  const parentText = $elem.parent().text() || '';
  const prevText = $elem.prev().text() || '';
  const nextText = $elem.next().text() || '';
  
  // Also check data attributes
  const dataAttrs = Object.keys($elem.attr() || {})
    .filter(key => key.startsWith('data-'))
    .map(key => $elem.attr(key))
    .join(' ');
  
  return `${prevText} ${parentText} ${nextText} ${dataAttrs}`.toLowerCase();
}

/**
 * Extract size/quantity information from context text
 */
function extractSizeInfo(context: string): string | null {
  // Common patterns for sizes and quantities
  const patterns = [
    /(\d+\s*x\s*\d+\s*[gkl])/i,           // e.g., "3 x 500g"
    /(\d+\s*[gkl])\s*x\s*\d+/i,          // e.g., "500g x 3"
    /(family\s*pack|familienpackung)/i,   // Family pack
    /(multi\s*pack|multipack)/i,          // Multi-pack
    /(\d+er\s*pack)/i,                    // e.g., "6er Pack"
    /(\d+\s*stück|pieces?)/i,             // Pieces
    /(\d+\s*[gkl])\b/i,                   // Simple weight
    /(klein|mittel|gross|large|medium|small)/i, // Sizes
  ];

  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Select the main price from all found prices
 */
function selectMainPrice(
  prices: number[], 
  variants: { size: string; price: number }[]
): { mainPrice: number; confidence: 'high' | 'medium' | 'low'; selectedReason: string } {
  
  // Case 1: Only one price found
  if (prices.length === 1) {
    return {
      mainPrice: prices[0],
      confidence: 'high',
      selectedReason: 'Only one price found'
    };
  }

  // Case 2: Multiple prices with clear size indicators
  if (variants.length >= prices.length - 1) {
    // Find the smallest unit/pack
    const singleUnitVariant = variants.find(v => 
      !v.size.match(/multi|family|pack|\d+\s*x|\d+er/i) &&
      v.size.match(/\d+\s*[gkl]/i)
    );

    if (singleUnitVariant) {
      return {
        mainPrice: singleUnitVariant.price,
        confidence: 'medium',
        selectedReason: 'Selected single unit price over multi-packs'
      };
    }

    // Otherwise, select the lowest price
    const lowestPrice = Math.min(...prices);
    return {
      mainPrice: lowestPrice,
      confidence: 'medium',
      selectedReason: 'Selected lowest price among variants'
    };
  }

  // Case 3: Multiple prices without clear context
  // Strategy: Select the lowest reasonable price
  const validPrices = prices.filter(p => p >= 0.5); // Filter out too-low prices
  
  if (validPrices.length === 0) {
    return {
      mainPrice: prices[0],
      confidence: 'low',
      selectedReason: 'All prices seem unusually low'
    };
  }

  const lowestValid = Math.min(...validPrices);
  
  // Check if there's a significant price jump (might indicate multi-pack)
  const sortedPrices = validPrices.sort((a, b) => a - b);
  const priceRatios = sortedPrices.slice(1).map((p, i) => p / sortedPrices[i]);
  
  const hasLargeJump = priceRatios.some(ratio => ratio >= 1.8);
  
  return {
    mainPrice: lowestValid,
    confidence: hasLargeJump ? 'medium' : 'low',
    selectedReason: hasLargeJump 
      ? 'Selected lowest price (possible multi-pack detected)'
      : 'Multiple prices without clear context'
  };
}

/**
 * Validate price extraction result
 */
export function validatePriceExtraction(result: PriceExtractionResult, productName: string): boolean {
  // Check for common issues
  if (result.mainPrice === 0) {
    console.warn(`No price found for product: ${productName}`);
    return false;
  }

  if (result.confidence === 'low') {
    console.warn(`Low confidence price for product: ${productName} - ${result.selectedReason}`);
  }

  if (result.allPrices.length > 3) {
    console.warn(`Many prices found for product: ${productName} - found ${result.allPrices.length} prices`);
  }

  // Check for potential multi-pack based on name
  const nameIndicatesMultipack = /family|multi|pack|\d+\s*x|\d+er/i.test(productName);
  const priceIndicatesMultipack = result.mainPrice > 10 && result.allPrices.length > 1 && 
    Math.min(...result.allPrices) < result.mainPrice / 2;

  if (nameIndicatesMultipack && !priceIndicatesMultipack) {
    console.warn(`Product name suggests multi-pack but price doesn't: ${productName}`);
  }

  return result.confidence !== 'low';
}