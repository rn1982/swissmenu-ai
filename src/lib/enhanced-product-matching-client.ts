// Client-safe functions for product matching
// This file contains only logic that can run in both server and client environments
// No database imports or server-only dependencies

export interface EnhancedProductMatch {
  id: string
  name: string
  brand?: string
  priceChf: number
  unit?: string
  category?: string
  url?: string
  imageUrl?: string
  matchScore: number
  matchReason: string
  confidence: 'high' | 'medium' | 'low'
  source: 'scrapingbee' | 'fallback'
  searchUrl?: string  // Fallback search URL for unmatched products
}

export interface IngredientAnalysis {
  original: string
  cleaned: string
  mainIngredient: string
  quantity?: number
  unit?: string
  modifiers: string[]
  category: string
}

// Parse and analyze ingredient string
export function analyzeIngredient(ingredientStr: string): IngredientAnalysis {
  const original = ingredientStr.trim()
  const lower = original.toLowerCase()
  
  // Handle compound ingredients first (e.g., "sel et poivre", "sel, poivre")
  if (lower.includes(' et ') || lower.includes(', ')) {
    // For compound ingredients like "sel et poivre" or "sel, poivre"
    // We'll process the first ingredient and note it's compound
    const separator = lower.includes(' et ') ? ' et ' : ', '
    const parts = lower.split(separator).map(p => p.trim())
    // Process first part but keep original for matching
    const firstPart = parts[0]
    // Continue processing with first part
    return analyzeIngredient(firstPart)
  }
  
  // First, handle special French units properly
  const unitPatterns = [
    // Special French units - must come first
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*gousses?\s*(d'|de\s*)?/i, unit: 'gousse(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*c\.?\s*à\s*s\.?\s+/i, unit: 'c.à.s' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*c\.?\s*à\s*c\.?/i, unit: 'c.à.c' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*cuillères?\s*à\s*soupe/i, unit: 'c.à.s' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*cuillères?\s*à\s*café/i, unit: 'c.à.c' },
    
    // Weight units - must NOT capture partial words
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*kg\b/i, unit: 'kg' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*g\b/i, unit: 'g' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*mg\b/i, unit: 'mg' },
    
    // Volume units
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*litres?\b/i, unit: 'litre(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*l\b/i, unit: 'litre(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*dl\b/i, unit: 'dl' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*cl\b/i, unit: 'cl' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*ml\b/i, unit: 'ml' },
    
    // Count units
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*pièces?\b/i, unit: 'pièce(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*tranches?\b/i, unit: 'tranche(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*feuilles?\b/i, unit: 'feuille(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*branches?\b/i, unit: 'branche(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*tasses?\b/i, unit: 'tasse(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*paquets?\b/i, unit: 'paquet(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*bouquets?\b/i, unit: 'bouquet(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*bottes?\b/i, unit: 'botte(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*sachets?\b/i, unit: 'sachet(s)' },
    { pattern: /^(\d+(?:[,\.]\d+)?)\s*boîtes?\b/i, unit: 'boîte(s)' },
    
    // Generic number without unit
    { pattern: /^(\d+(?:[,\.]\d+)?)\s+/i, unit: undefined }
  ]
  
  let quantity: number | undefined
  let unit: string | undefined
  let cleanedStr = lower
  
  // Try each pattern in order
  for (const { pattern, unit: unitValue } of unitPatterns) {
    const match = lower.match(pattern)
    if (match) {
      quantity = parseFloat(match[1].replace(',', '.'))
      unit = unitValue
      cleanedStr = lower.replace(match[0], '').trim()
      break
    }
  }
  
  // Remove common modifiers and cooking terms
  const modifiers: string[] = []
  const modifierPatterns = [
    { pattern: /\bfrais\b/gi, modifier: 'frais' },
    { pattern: /\bfraîches?\b/gi, modifier: 'fraîche' },
    { pattern: /\bhachée?s?\b/gi, modifier: 'haché' },
    { pattern: /\brâpée?s?\b/gi, modifier: 'râpé' },
    { pattern: /\bcoupée?s?\b/gi, modifier: 'coupé' },
    { pattern: /\bémincée?s?\b/gi, modifier: 'émincé' },
    { pattern: /\bpelée?s?\b/gi, modifier: 'pelé' },
    { pattern: /\bcuite?s?\b/gi, modifier: 'cuit' },
    { pattern: /\bcrue?s?\b/gi, modifier: 'cru' },
    { pattern: /\bfinement\b/gi, modifier: 'finement' },
    { pattern: /\bgrossièrement\b/gi, modifier: 'grossièrement' },
    { pattern: /\bentière?s?\b/gi, modifier: 'entier' },
    { pattern: /\bentier\b/gi, modifier: 'entier' }
  ]
  
  modifierPatterns.forEach(({ pattern, modifier }) => {
    if (pattern.test(cleanedStr)) {
      modifiers.push(modifier)
      cleanedStr = cleanedStr.replace(pattern, '').trim()
    }
  })
  
  // Remove articles and prepositions - but only when they're separate words
  // Handle contractions like d'huile, d'olive separately
  cleanedStr = cleanedStr.replace(/\bd'\s*/g, ' ').trim() // Handle d' contractions
  cleanedStr = cleanedStr.replace(/\bl'\s*/g, ' ').trim() // Handle l' contractions
  
  // Now remove standalone articles
  const articlesPattern = /\b(le|la|les|un|une|des|de|du|à|au|aux|en)\b/gi
  cleanedStr = cleanedStr.replace(articlesPattern, ' ').trim()
  
  // Clean up multiple spaces
  cleanedStr = cleanedStr.replace(/\s+/g, ' ').trim()
  
  // Simplified category detection for client-side
  const category = detectCategory(cleanedStr)
  const mainIngredient = cleanedStr || original
  
  return {
    original,
    cleaned: cleanedStr,
    mainIngredient,
    quantity,
    unit,
    modifiers,
    category
  }
}

// Simple category detection for client-side
function detectCategory(ingredient: string): string {
  const lower = ingredient.toLowerCase()
  
  // Common categories
  if (/pâtes?|pasta|spaghetti|penne|fusilli|linguine|tagliatelle|rigatoni|macaroni|farfalle|lasagne|cannelloni/.test(lower)) return 'pasta'
  if (/riz|rice|basmati|jasmin|arborio|risotto|couscous|quinoa|polenta/.test(lower)) return 'rice'
  if (/poulet|chicken|bœuf|beef|porc|pork|veau|veal|agneau|lamb|viande|meat|jambon|lard|bacon/.test(lower)) return 'meat'
  if (/poisson|fish|saumon|salmon|thon|tuna|cabillaud|colin|lieu|perche|crevettes|shrimp/.test(lower)) return 'fish'
  if (/tomate|oignon|ail|carotte|pomme de terre|courgette|aubergine|poivron|brocoli|épinard|salade|champignon|céleri|poireau|haricot|maïs/.test(lower)) return 'vegetables'
  if (/pomme|orange|banane|fraise|abricot|pêche|poire|raisin|cerise|mangue|avocat/.test(lower)) return 'fruits'
  if (/lait|milk|fromage|cheese|beurre|butter|crème|cream|œuf|egg|yaourt|yogurt|mascarpone|ricotta|mozzarella|parmesan|gruyère|feta/.test(lower)) return 'dairy'
  if (/huile|oil|vinaigre|vinegar|sel|salt|poivre|pepper|farine|flour|sucre|sugar|miel|honey|moutarde|ketchup|mayonnaise|sauce/.test(lower)) return 'pantry'
  if (/basilic|persil|thym|romarin|origan|coriandre|menthe|sauge|laurier|ciboulette|aneth|estragon|herbe|épice|spice|paprika|curry|cannelle|muscade|cumin/.test(lower)) return 'herbs'
  if (/pain|bread|baguette|croûton|pâte feuilletée/.test(lower)) return 'bakery'
  if (/amande|noix|noisette|pignon|sésame/.test(lower)) return 'nuts'
  
  return 'autres'
}

// Smart quantity calculation
export function calculateSmartQuantity(
  ingredient: IngredientAnalysis,
  peopleCount: number,
  mealsPerWeek: number = 1
): { quantity: number; unit: string } {
  const baseQuantity = Math.ceil(peopleCount / 4) * mealsPerWeek
  
  // Use ingredient-specific rules
  const quantityRules: Record<string, { base: number; unit: string }> = {
    // Pasta/Rice: 100g per person per meal
    'pâtes': { base: peopleCount * 100 * mealsPerWeek / 500, unit: 'paquet(s) 500g' },
    'riz': { base: peopleCount * 75 * mealsPerWeek / 500, unit: 'paquet(s) 500g' },
    
    // Meat: 150g per person per meal
    'poulet': { base: peopleCount * 150 * mealsPerWeek / 1000, unit: 'kg' },
    'bœuf': { base: peopleCount * 150 * mealsPerWeek / 1000, unit: 'kg' },
    'porc': { base: peopleCount * 150 * mealsPerWeek / 1000, unit: 'kg' },
    'viande hachée': { base: peopleCount * 125 * mealsPerWeek / 500, unit: 'paquet(s) 500g' },
    
    // Vegetables: varies
    'tomate': { base: peopleCount * 2 * mealsPerWeek, unit: 'pièce(s)' },
    'oignon': { base: Math.ceil(peopleCount * mealsPerWeek / 2), unit: 'pièce(s)' },
    'pomme de terre': { base: peopleCount * 200 * mealsPerWeek / 1000, unit: 'kg' },
    
    // Dairy
    'lait': { base: Math.ceil(mealsPerWeek / 2), unit: 'litre(s)' },
    'fromage': { base: peopleCount * 30 * mealsPerWeek / 200, unit: 'paquet(s) 200g' },
    'œuf': { base: peopleCount * 2 * mealsPerWeek, unit: 'pièce(s)' },
    
    // Pantry (usually one unit serves many meals)
    'huile': { base: 1, unit: 'bouteille' },
    'sel': { base: 1, unit: 'paquet' },
    'poivre': { base: 1, unit: 'moulin' },
    'farine': { base: 1, unit: 'paquet 1kg' },
    'sucre': { base: 1, unit: 'paquet 1kg' }
  }
  
  const rule = quantityRules[ingredient.mainIngredient]
  if (rule) {
    return {
      quantity: Math.ceil(rule.base),
      unit: rule.unit
    }
  }
  
  // Default calculation based on category
  const categoryDefaults: Record<string, { quantity: number; unit: string }> = {
    'pasta': { quantity: Math.ceil(peopleCount * mealsPerWeek / 4), unit: 'paquet(s)' },
    'rice': { quantity: Math.ceil(peopleCount * mealsPerWeek / 4), unit: 'paquet(s)' },
    'meat': { quantity: Math.ceil(peopleCount * 0.15 * mealsPerWeek), unit: 'kg' },
    'fish': { quantity: Math.ceil(peopleCount * 0.15 * mealsPerWeek), unit: 'kg' },
    'vegetables': { quantity: Math.ceil(peopleCount * mealsPerWeek), unit: 'pièce(s)' },
    'fruits': { quantity: Math.ceil(peopleCount * mealsPerWeek), unit: 'pièce(s)' },
    'dairy': { quantity: baseQuantity, unit: 'unité(s)' },
    'pantry': { quantity: 1, unit: 'unité' },
    'herbs': { quantity: 1, unit: 'bouquet' },
    'bakery': { quantity: baseQuantity, unit: 'unité(s)' },
    'autres': { quantity: baseQuantity, unit: 'unité(s)' }
  }
  
  const categoryDefault = categoryDefaults[ingredient.category]
  if (categoryDefault) {
    return categoryDefault
  }
  
  // Final fallback
  return {
    quantity: baseQuantity,
    unit: ingredient.unit || 'unité(s)'
  }
}

// Generate Migros search URL for products
export function generateMigrosSearchUrl(searchTerm: string): string {
  const encodedTerm = encodeURIComponent(searchTerm)
  return `https://www.migros.ch/fr/search?query=${encodedTerm}`
}