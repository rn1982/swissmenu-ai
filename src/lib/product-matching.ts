import { db } from '@/lib/db'

export interface IngredientMatch {
  ingredient: {
    name: string
    quantity?: number
    unit?: string
  }
  matches: ProductMatch[]
  bestMatch?: ProductMatch
}

export interface ProductMatch {
  id: string
  name: string
  brand?: string
  priceChf?: number
  unit?: string
  category?: string
  url?: string
  matchScore: number
  confidence: 'high' | 'medium' | 'low'
}

export interface MatchingOptions {
  maxResults?: number
  minScore?: number
  preferBrands?: string[]
  maxPriceChf?: number
  category?: string
}

/**
 * Match recipe ingredients to Migros products
 */
export async function matchIngredientsToProducts(
  ingredients: Array<{ name: string; quantity?: number; unit?: string }>,
  options: MatchingOptions = {}
): Promise<IngredientMatch[]> {
  const {
    maxResults = 5,
    minScore = 0.3,
    preferBrands = ['M-Classic', 'Migros Bio'],
    maxPriceChf,
    category
  } = options

  const results: IngredientMatch[] = []

  for (const ingredient of ingredients) {
    const matches = await findProductMatches(ingredient.name, {
      maxResults,
      minScore,
      preferBrands,
      maxPriceChf,
      category
    })

    const ingredientMatch: IngredientMatch = {
      ingredient,
      matches,
      bestMatch: matches[0] || undefined
    }

    results.push(ingredientMatch)
  }

  return results
}

/**
 * Find matching products for a single ingredient
 */
export async function findProductMatches(
  ingredientName: string,
  options: MatchingOptions = {}
): Promise<ProductMatch[]> {
  const {
    maxResults = 5,
    minScore = 0.3,
    preferBrands = [],
    maxPriceChf,
    category
  } = options

  try {
    // Build search conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereConditions: Record<string, any> = {}

    // Price filter
    if (maxPriceChf) {
      whereConditions.priceChf = {
        lte: maxPriceChf
      }
    }

    // Category filter
    if (category) {
      whereConditions.category = {
        contains: category,
        mode: 'insensitive'
      }
    }

    // Get potential matches using text search
    const searchTerms = preprocessIngredient(ingredientName)
    const products = await db.migrosProduct.findMany({
      where: {
        ...whereConditions,
        OR: searchTerms.map(term => ({
          name: {
            contains: term,
            mode: 'insensitive'
          }
        }))
      },
      orderBy: [
        { priceChf: 'asc' }, // Prefer cheaper options
        { name: 'asc' }
      ],
      take: maxResults * 3 // Get more results for better scoring
    })

    // Calculate match scores
    const scoredMatches = products
      .map(product => ({
        ...product,
        matchScore: calculateMatchScore(ingredientName, product.name, product.brand || undefined),
        confidence: getConfidenceLevel(calculateMatchScore(ingredientName, product.name, product.brand || undefined))
      }))
      .filter(match => match.matchScore >= minScore)

    // Apply brand preferences
    const sortedMatches = scoredMatches.sort((a, b) => {
      // Boost score for preferred brands
      const aBoost = preferBrands.includes(a.brand || '') ? 0.2 : 0
      const bBoost = preferBrands.includes(b.brand || '') ? 0.2 : 0
      
      const aFinalScore = Math.min(a.matchScore + aBoost, 1.0)
      const bFinalScore = Math.min(b.matchScore + bBoost, 1.0)
      
      return bFinalScore - aFinalScore
    })

    // Convert to ProductMatch format (null -> undefined)
    const productMatches = sortedMatches.slice(0, maxResults).map(product => ({
      id: product.id,
      name: product.name,
      brand: product.brand || undefined,
      priceChf: product.priceChf || undefined,
      unit: product.unit || undefined,
      category: product.category || undefined,
      url: product.url || undefined,
      imageUrl: product.imageUrl || undefined,
      ariaLabel: product.ariaLabel || undefined,
      matchScore: product.matchScore,
      confidence: product.confidence
    }))

    return productMatches

  } catch (error) {
    console.error('Error finding product matches:', error)
    return []
  }
}

/**
 * Preprocess ingredient name for better matching
 */
function preprocessIngredient(ingredientName: string): string[] {
  const name = ingredientName.toLowerCase().trim()
  
  // Remove common cooking terms and quantities
  const cleanName = name
    .replace(/\b(frais|fraîche|coupé|coupée|haché|hachée|râpé|râpée)\b/g, '')
    .replace(/\b\d+\s*(g|kg|ml|l|grammes?|kilos?|litres?|cuillères?|c\.à\.s|c\.à\.c)\b/g, '')
    .replace(/\b(de|du|des|le|la|les|un|une)\b/g, '')
    .trim()

  // Handle ingredient mapping
  const ingredientMap: Record<string, string[]> = {
    'pâtes': ['pates', 'pasta', 'spaghetti', 'penne', 'fusilli'],
    'tomates': ['tomate', 'tomates'],
    'oignon': ['oignon', 'oignons'],
    'ail': ['ail', 'gousse'],
    'fromage': ['fromage', 'gruyère', 'parmesan'],
    'viande': ['viande', 'bœuf', 'porc', 'agneau'],
    'poulet': ['poulet', 'volaille'],
    'poisson': ['poisson', 'saumon', 'cabillaud'],
    'lait': ['lait', 'crème'],
    'œufs': ['œuf', 'œufs', 'oeufs'],
    'pain': ['pain', 'baguette'],
    'beurre': ['beurre'],
    'huile': ['huile'],
    'sel': ['sel'],
    'poivre': ['poivre']
  }

  // Check if ingredient matches any mapping
  for (const [key, variants] of Object.entries(ingredientMap)) {
    if (variants.some(variant => cleanName.includes(variant))) {
      return [key, ...variants, cleanName]
    }
  }

  // Return original terms plus common variations
  const terms = [cleanName]
  
  // Add singular/plural variations
  if (cleanName.endsWith('s')) {
    terms.push(cleanName.slice(0, -1))
  } else {
    terms.push(cleanName + 's')
  }

  // Split compound terms
  if (cleanName.includes(' ')) {
    terms.push(...cleanName.split(' ').filter(term => term.length > 2))
  }

  return [...new Set(terms)] // Remove duplicates
}

/**
 * Calculate match score between ingredient and product
 */
function calculateMatchScore(ingredient: string, productName: string, productBrand?: string): number {
  const ingredientLower = ingredient.toLowerCase()
  const productLower = productName.toLowerCase()
  const brandLower = productBrand?.toLowerCase() || ''

  // Exact match
  if (ingredientLower === productLower) return 1.0

  // Contains ingredient name exactly
  if (productLower.includes(ingredientLower)) return 0.9

  // Ingredient contains product name (for brand names)
  if (ingredientLower.includes(productLower)) return 0.8

  // Brand name match
  if (brandLower && ingredientLower.includes(brandLower)) return 0.7

  // Word overlap scoring
  const ingredientWords = ingredientLower.split(/\s+/)
  const productWords = productLower.split(/\s+/)
  
  let matchingWords = 0
  let totalWeight = 0

  for (const ingredientWord of ingredientWords) {
    if (ingredientWord.length < 3) continue // Skip short words
    
    totalWeight += 1
    
    for (const productWord of productWords) {
      if (productWord.includes(ingredientWord) || ingredientWord.includes(productWord)) {
        matchingWords += 1
        break
      }
      
      // Fuzzy matching for similar words
      if (levenshteinDistance(ingredientWord, productWord) <= 2 && ingredientWord.length > 4) {
        matchingWords += 0.8
        break
      }
    }
  }

  const wordScore = totalWeight > 0 ? matchingWords / totalWeight : 0
  
  // Minimum score for any partial match
  return Math.max(wordScore, 0.1)
}

/**
 * Get confidence level based on match score
 */
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.8) return 'high'
  if (score >= 0.5) return 'medium'
  return 'low'
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i
  }

  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Generate shopping list from ingredient matches
 */
export function generateShoppingList(
  ingredientMatches: IngredientMatch[],
  options: { budget?: number; peopleCount?: number } = {}
): {
  items: Array<{
    product: ProductMatch
    ingredient: string
    quantity?: number
    unit?: string
    estimatedPrice: number
  }>
  totalEstimatedPrice: number
  withinBudget: boolean
  missingIngredients: string[]
} {
  const items = []
  const missingIngredients = []
  let totalEstimatedPrice = 0

  for (const match of ingredientMatches) {
    if (match.bestMatch) {
      const estimatedPrice = match.bestMatch.priceChf || 0
      
      items.push({
        product: match.bestMatch,
        ingredient: match.ingredient.name,
        quantity: match.ingredient.quantity,
        unit: match.ingredient.unit,
        estimatedPrice
      })
      
      totalEstimatedPrice += estimatedPrice
    } else {
      missingIngredients.push(match.ingredient.name)
    }
  }

  const withinBudget = options.budget ? totalEstimatedPrice <= options.budget : true

  return {
    items,
    totalEstimatedPrice,
    withinBudget,
    missingIngredients
  }
}