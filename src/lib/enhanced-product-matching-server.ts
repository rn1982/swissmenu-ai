// Server-only database operations for product matching
// This file should only be imported in server-side code (API routes, server components)

import { db } from '@/lib/db'
import { 
  EnhancedProductMatch, 
  IngredientAnalysis,
  analyzeIngredient,
  calculateSmartQuantity,
  generateMigrosSearchUrl
} from './enhanced-product-matching-client'

// Re-export client-safe functions
export { analyzeIngredient, calculateSmartQuantity, generateMigrosSearchUrl }
export type { EnhancedProductMatch, IngredientAnalysis }

// Enhanced ingredient database with synonyms and categories
const INGREDIENT_DATABASE: Record<string, {
  synonyms: string[]
  category: string
  preferredBrands?: string[]
  unitConversions?: Record<string, number>
}> = {
  // Pasta & Rice - Keep specific pasta types
  'spaghetti': {
    synonyms: ['spaghettis'],
    category: 'pasta',
    preferredBrands: ['Barilla', 'M-Classic', 'M-Budget']
  },
  'pennes': {
    synonyms: ['penne'],
    category: 'pasta',
    preferredBrands: ['Barilla', 'M-Classic']
  },
  'pâtes': {
    synonyms: ['pasta', 'fusilli', 'linguine', 'tagliatelle', 'rigatoni', 'macaroni', 'farfalle', 'lasagne', 'cannelloni'],
    category: 'pasta',
    preferredBrands: ['Barilla', 'M-Classic']
  },
  'riz': {
    synonyms: ['rice', 'basmati', 'jasmin', 'arborio', 'risotto', 'riz complet', 'riz sauvage'],
    category: 'rice',
    preferredBrands: ['Uncle Ben\'s', 'M-Classic']
  },
  'couscous': {
    synonyms: ['semoule'],
    category: 'rice',
    preferredBrands: ['M-Classic']
  },
  'quinoa': {
    synonyms: ['quinua'],
    category: 'rice'
  },
  'polenta': {
    synonyms: ['semoule de maïs'],
    category: 'rice'
  },
  
  // Meat & Poultry
  'poulet': {
    synonyms: ['chicken', 'volaille', 'blanc de poulet', 'cuisse de poulet', 'filet de poulet', 'escalope de poulet'],
    category: 'meat',
    preferredBrands: ['M-Classic', 'Optigal']
  },
  'bœuf': {
    synonyms: ['beef', 'boeuf', 'steak', 'viande de bœuf', 'entrecôte', 'rumsteak', 'filet de bœuf', 'rôti de bœuf'],
    category: 'meat',
    preferredBrands: ['M-Classic', 'TerraSuisse']
  },
  'porc': {
    synonyms: ['pork', 'côtelette', 'côtelettes de porc', 'filet de porc', 'escalope', 'rôti de porc'],
    category: 'meat',
    preferredBrands: ['M-Classic']
  },
  'veau': {
    synonyms: ['veal', 'escalope de veau', 'côtelette de veau'],
    category: 'meat'
  },
  'agneau': {
    synonyms: ['lamb', 'gigot', 'côtelettes d\'agneau'],
    category: 'meat'
  },
  'viande hachée': {
    synonyms: ['haché', 'hachée', 'viande moulue', 'bœuf haché', 'porc haché', 'viande mixte'],
    category: 'meat'
  },
  'jambon': {
    synonyms: ['ham', 'jambon cru', 'jambon cuit', 'prosciutto'],
    category: 'meat'
  },
  'lard': {
    synonyms: ['bacon', 'lardons', 'pancetta'],
    category: 'meat'
  },
  
  // Fish & Seafood
  'lieu noir': {
    synonyms: ['lieu', 'filet de lieu noir', 'filet de lieu'],
    category: 'fish'
  },
  'colin': {
    synonyms: ['filet de colin', 'merlu'],
    category: 'fish'
  },
  'saumon': {
    synonyms: ['salmon', 'filet de saumon', 'pavé de saumon'],
    category: 'fish'
  },
  'perche': {
    synonyms: ['filets de perche', 'perch'],
    category: 'fish'
  },
  'poisson': {
    synonyms: ['fish', 'filet de poisson', 'poisson blanc', 'cabillaud'],
    category: 'fish'
  },
  'crevettes': {
    synonyms: ['shrimp', 'gambas', 'scampi'],
    category: 'fish'
  },
  'thon': {
    synonyms: ['tuna', 'thon en boîte'],
    category: 'fish'
  },
  
  // Vegetables
  'tomate': {
    synonyms: ['tomates', 'tomato', 'tomates cerises', 'tomates pelées', 'sauce tomate', 'concentré de tomates'],
    category: 'vegetables'
  },
  'oignon': {
    synonyms: ['oignons', 'onion', 'échalote', 'échalotes', 'oignon rouge', 'oignon blanc'],
    category: 'vegetables'
  },
  'ail': {
    synonyms: ['garlic', 'gousse d\'ail', 'gousses d\'ail', 'gousse ail', 'gousses ail'],
    category: 'vegetables'
  },
  'carotte': {
    synonyms: ['carottes', 'carrot'],
    category: 'vegetables'
  },
  'pomme de terre': {
    synonyms: ['pommes de terre', 'patate', 'patates', 'potato', 'pommes terre'],
    category: 'vegetables'
  },
  'courgette': {
    synonyms: ['courgettes', 'zucchini'],
    category: 'vegetables'
  },
  'aubergine': {
    synonyms: ['aubergines', 'eggplant'],
    category: 'vegetables'
  },
  'poivron': {
    synonyms: ['poivrons', 'pepper', 'poivron rouge', 'poivron vert', 'poivron jaune'],
    category: 'vegetables'
  },
  'brocoli': {
    synonyms: ['brocolis', 'broccoli'],
    category: 'vegetables'
  },
  'épinards': {
    synonyms: ['épinard', 'spinach', 'pousses d\'épinards'],
    category: 'vegetables'
  },
  'salade': {
    synonyms: ['lettuce', 'laitue', 'mesclun', 'roquette', 'mâche'],
    category: 'vegetables'
  },
  'champignons': {
    synonyms: ['champignon', 'mushrooms', 'champignons de Paris'],
    category: 'vegetables'
  },
  'céleri': {
    synonyms: ['celery', 'céleri-branche'],
    category: 'vegetables'
  },
  'poireau': {
    synonyms: ['poireaux', 'leek'],
    category: 'vegetables'
  },
  
  // Herbs & Spices
  'basilic': {
    synonyms: ['basil'],
    category: 'herbs'
  },
  'persil': {
    synonyms: ['parsley'],
    category: 'herbs'
  },
  'thym': {
    synonyms: ['thyme'],
    category: 'herbs'
  },
  'romarin': {
    synonyms: ['rosemary'],
    category: 'herbs'
  },
  'origan': {
    synonyms: ['oregano'],
    category: 'herbs'
  },
  'coriandre': {
    synonyms: ['coriander', 'cilantro'],
    category: 'herbs'
  },
  'menthe': {
    synonyms: ['mint'],
    category: 'herbs'
  },
  'sauge': {
    synonyms: ['sage', 'feuilles de sauge'],
    category: 'herbs'
  },
  'laurier': {
    synonyms: ['bay leaf', 'feuille de laurier'],
    category: 'herbs'
  },
  'ciboulette': {
    synonyms: ['chives'],
    category: 'herbs'
  },
  'aneth': {
    synonyms: ['dill'],
    category: 'herbs'
  },
  'estragon': {
    synonyms: ['tarragon'],
    category: 'herbs'
  },
  'herbes': {
    synonyms: ['herbs', 'herbes fraîches', 'herbes de Provence', 'fines herbes'],
    category: 'herbs'
  },
  'gingembre': {
    synonyms: ['ginger'],
    category: 'herbs'
  },
  'curcuma': {
    synonyms: ['turmeric'],
    category: 'herbs'
  },
  'paprika': {
    synonyms: ['paprika doux', 'paprika fumé'],
    category: 'herbs'
  },
  'curry': {
    synonyms: ['poudre de curry'],
    category: 'herbs'
  },
  'cannelle': {
    synonyms: ['cinnamon'],
    category: 'herbs'
  },
  'muscade': {
    synonyms: ['nutmeg', 'noix de muscade'],
    category: 'herbs'
  },
  'cumin': {
    synonyms: ['cumin moulu'],
    category: 'herbs'
  },
  
  // Dairy
  'beurre': {
    synonyms: ['butter', 'beurre doux', 'beurre salé'],
    category: 'dairy',
    preferredBrands: ['M-Classic', 'Valflora']
  },
  'lait': {
    synonyms: ['milk', 'lait entier', 'lait demi-écrémé', 'lait écrémé'],
    category: 'dairy',
    preferredBrands: ['M-Classic', 'Valflora']
  },
  'fromage': {
    synonyms: ['cheese', 'gruyère', 'emmental', 'parmesan', 'mozzarella', 'cheddar', 'fromage râpé', 'fromage frais'],
    category: 'dairy'
  },
  'crème': {
    synonyms: ['cream', 'crème fraîche', 'crème entière', 'crème liquide', 'crème épaisse'],
    category: 'dairy'
  },
  'œuf': {
    synonyms: ['œufs', 'oeufs', 'egg', 'eggs', 'oeuf'],
    category: 'dairy',
    unitConversions: { 'piece': 1, 'douzaine': 12 }
  },
  'yaourt': {
    synonyms: ['yogourt', 'yogurt', 'yaourt nature'],
    category: 'dairy'
  },
  'mascarpone': {
    synonyms: [],
    category: 'dairy'
  },
  'ricotta': {
    synonyms: [],
    category: 'dairy'
  },
  
  // Pantry
  'huile': {
    synonyms: ['oil', 'huile d\'olive', 'huile olive', 'huile de tournesol', 'huile de colza', 'huile végétale'],
    category: 'pantry',
    preferredBrands: ['M-Classic', 'Filippo Berio']
  },
  'vinaigre': {
    synonyms: ['vinegar', 'vinaigre balsamique', 'vinaigre de vin'],
    category: 'pantry'
  },
  'sel': {
    synonyms: ['salt', 'fleur de sel', 'gros sel', 'sel fin'],
    category: 'pantry'
  },
  'poivre': {
    synonyms: ['pepper', 'poivre noir', 'poivre blanc', 'poivre moulu'],
    category: 'pantry'
  },
  'sel et poivre': {
    synonyms: ['salt and pepper', 'assaisonnement'],
    category: 'pantry'
  },
  'farine': {
    synonyms: ['flour', 'farine blanche', 'farine complète', 'farine tout usage'],
    category: 'pantry',
    preferredBrands: ['M-Classic']
  },
  'sucre': {
    synonyms: ['sugar', 'sucre blanc', 'sucre roux', 'cassonade', 'sucre glace'],
    category: 'pantry'
  },
  'miel': {
    synonyms: ['honey'],
    category: 'pantry'
  },
  'moutarde': {
    synonyms: ['mustard', 'moutarde de Dijon'],
    category: 'pantry'
  },
  'mayonnaise': {
    synonyms: ['mayo'],
    category: 'pantry'
  },
  'ketchup': {
    synonyms: [],
    category: 'pantry'
  },
  'sauce soja': {
    synonyms: ['soy sauce', 'sauce de soja'],
    category: 'pantry'
  },
  'bouillon': {
    synonyms: ['stock', 'bouillon de légumes', 'bouillon de poulet', 'bouillon de bœuf', 'cube de bouillon'],
    category: 'pantry'
  },
  'vin': {
    synonyms: ['wine', 'vin blanc', 'vin rouge'],
    category: 'pantry'
  },
  'citron': {
    synonyms: ['lemon', 'citrons', 'jus de citron', 'zeste de citron'],
    category: 'pantry'
  },
  'vanille': {
    synonyms: ['vanilla', 'extrait de vanille', 'gousse de vanille'],
    category: 'pantry'
  },
  'chocolat': {
    synonyms: ['chocolate', 'chocolat noir', 'chocolat au lait', 'cacao'],
    category: 'pantry'
  },
  
  // Bakery
  'pain': {
    synonyms: ['bread', 'baguette', 'pain complet', 'pain de mie', 'pain blanc'],
    category: 'bakery'
  },
  'croûtons': {
    synonyms: ['pain pour croûtons', 'pain rassis'],
    category: 'bakery'
  },
  'pâte feuilletée': {
    synonyms: ['puff pastry', 'pâte brisée', 'pâte à tarte'],
    category: 'bakery'
  },
  
  // Other common ingredients
  'tofu': {
    synonyms: ['tofu ferme', 'tofu soyeux'],
    category: 'autres'
  },
  'sauce tomate': {
    synonyms: ['tomato sauce', 'coulis de tomate', 'sauce tomates'],
    category: 'pantry'
  },
  'pâte de tomates': {
    synonyms: ['tomato paste', 'concentré de tomates'],
    category: 'pantry'
  },
  'crème fraîche': {
    synonyms: ['sour cream', 'crème acidulée', 'crème fraiche'],
    category: 'dairy'
  },
  'parmesan': {
    synonyms: ['parmigiano', 'parmigiano reggiano', 'fromage parmesan'],
    category: 'dairy'
  },
  'gruyère râpé': {
    synonyms: ['gruyère rapé', 'fromage gruyère râpé'],
    category: 'dairy'
  },
  'gruyère': {
    synonyms: ['gruyere', 'fromage gruyère'],
    category: 'dairy'
  },
  'mozzarella': {
    synonyms: ['mozarella', 'fromage mozzarella'],
    category: 'dairy'
  },
  'feta': {
    synonyms: ['fromage feta'],
    category: 'dairy'
  },
  'olives': {
    synonyms: ['olive', 'olives noires', 'olives vertes'],
    category: 'pantry'
  },
  'câpres': {
    synonyms: ['capers'],
    category: 'pantry'
  },
  'cornichons': {
    synonyms: ['pickles', 'cornichon'],
    category: 'pantry'
  },
  'maïs': {
    synonyms: ['corn', 'maïs en boîte'],
    category: 'vegetables'
  },
  'haricots rouges': {
    synonyms: ['red beans', 'kidney beans'],
    category: 'vegetables'
  },
  'haricots verts': {
    synonyms: ['green beans', 'haricots vert'],
    category: 'vegetables'
  },
  'haricots': {
    synonyms: ['beans', 'haricots blancs'],
    category: 'vegetables'
  },
  'lentilles': {
    synonyms: ['lentils', 'lentilles vertes', 'lentilles corail'],
    category: 'pantry'
  },
  'pois chiches': {
    synonyms: ['chickpeas'],
    category: 'pantry'
  },
  'chapelure': {
    synonyms: ['breadcrumbs', 'panure'],
    category: 'pantry'
  },
  'levure': {
    synonyms: ['yeast', 'levure chimique', 'levure de boulanger'],
    category: 'pantry'
  },
  'bicarbonate': {
    synonyms: ['baking soda', 'bicarbonate de soude'],
    category: 'pantry'
  }
}

// Enhanced matching algorithm - SERVER ONLY VERSION with database access
export async function findBestProductMatch(
  ingredient: IngredientAnalysis,
  options: {
    preferScrapingBee?: boolean
    maxPriceChf?: number
    preferredBrands?: string[]
  } = {}
): Promise<EnhancedProductMatch[]> {
  const { preferScrapingBee = true, maxPriceChf, preferredBrands = [] } = options
  
  // Build search conditions
  const whereConditions: any = {}
  
  if (maxPriceChf) {
    whereConditions.priceChf = { lte: maxPriceChf }
  }
  
  // Get ingredient data
  const ingredientData = INGREDIENT_DATABASE[ingredient.mainIngredient]
  const searchTerms = [
    ingredient.mainIngredient,
    ingredient.cleaned,
    ...(ingredientData?.synonyms || [])
  ].filter(term => term.length > 2)
  
  // Search for products - first try exact matches
  let products = await db.migrosProduct.findMany({
    where: {
      ...whereConditions,
      OR: searchTerms.map(term => ({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { ariaLabel: { contains: term, mode: 'insensitive' } }
        ]
      }))
    },
    orderBy: [
      { source: preferScrapingBee ? 'desc' : 'asc' }, // Prefer scrapingbee products
      { priceChf: 'asc' }
    ],
    take: 10
  })
  
  // If no products found, try category-based search
  if (products.length === 0 && ingredient.category !== 'autres') {
    console.log(`🔍 No exact match for "${ingredient.mainIngredient}", trying category: ${ingredient.category}`)
    
    products = await db.migrosProduct.findMany({
      where: {
        ...whereConditions,
        category: ingredient.category
      },
      orderBy: [
        { source: preferScrapingBee ? 'desc' : 'asc' },
        { priceChf: 'asc' }
      ],
      take: 5
    })
  }
  
  // If still no products, try broader search
  if (products.length === 0) {
    console.log(`🔍 No category match, trying broader search for: ${ingredient.cleaned}`)
    
    // Try individual words from the cleaned ingredient
    const words = ingredient.cleaned.split(' ').filter(w => w.length > 2)
    if (words.length > 0) {
      products = await db.migrosProduct.findMany({
        where: {
          ...whereConditions,
          OR: words.map(word => ({
            name: { contains: word, mode: 'insensitive' }
          }))
        },
        orderBy: { priceChf: 'asc' },
        take: 5
      })
    }
  }
  
  // Score and rank matches
  const scoredMatches = products.map(product => {
    const score = calculateEnhancedMatchScore(ingredient, product, ingredientData, preferredBrands)
    return {
      ...product,
      ...score
    }
  })
  
  // Sort by score and filter
  let sortedMatches = scoredMatches
    .filter(match => match.matchScore >= 0.7) // Higher threshold to avoid poor substitutions
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5)
  
  // If no good matches, don't return substitutes - let it fall back to original
  if (sortedMatches.length === 0) {
    console.log(`⚠️ No good matches for "${ingredient.original}", will use original name`)
    // Return empty array to trigger fallback in generateOptimizedShoppingList
    return []
  }
  
  return sortedMatches.map(match => ({
    id: match.id,
    name: match.name,
    brand: match.brand || undefined,
    priceChf: match.priceChf || 0,
    unit: match.unit || undefined,
    category: match.category || undefined,
    url: undefined, // Don't use database URLs
    imageUrl: match.imageUrl || undefined,
    matchScore: match.matchScore,
    matchReason: match.matchReason,
    confidence: match.confidence,
    source: match.source as 'scrapingbee' | 'fallback',
    searchUrl: generateMigrosSearchUrl(match.name) // Always use search URL
  }))
}

// Calculate match score with detailed reasoning
function calculateEnhancedMatchScore(
  ingredient: IngredientAnalysis,
  product: any,
  ingredientData: any,
  preferredBrands: string[]
): { matchScore: number; matchReason: string; confidence: 'high' | 'medium' | 'low' } {
  let score = 0
  const reasons: string[] = []
  
  const productNameLower = product.name.toLowerCase()
  const productBrandLower = (product.brand || '').toLowerCase()
  
  // Exact match on main ingredient
  if (productNameLower.includes(ingredient.mainIngredient)) {
    score += 0.5
    reasons.push('nom exact')
  } else {
    // Try fuzzy matching if no exact match
    const similarity = calculateSimilarity(ingredient.mainIngredient, productNameLower)
    if (similarity > 0.8) {
      score += 0.4 * similarity
      reasons.push(`similarité: ${Math.round(similarity * 100)}%`)
    }
  }
  
  // Synonym matches
  if (ingredientData?.synonyms) {
    for (const synonym of ingredientData.synonyms) {
      if (productNameLower.includes(synonym)) {
        score += 0.3
        reasons.push(`synonyme: ${synonym}`)
        break
      }
    }
  }
  
  // Special case for garlic - handle "ail" matching in products
  if (ingredient.mainIngredient === 'ail' && 
      (productNameLower.includes('ail') || productNameLower.includes('garlic'))) {
    if (score < 0.5) {
      score = 0.5
      reasons.push('produit ail')
    }
  }
  
  // Modifier matches
  for (const modifier of ingredient.modifiers) {
    if (productNameLower.includes(modifier)) {
      score += 0.1
      reasons.push(`modificateur: ${modifier}`)
    }
  }
  
  // Brand preference
  const allPreferredBrands = [
    ...(ingredientData?.preferredBrands || []),
    ...preferredBrands
  ]
  
  if (allPreferredBrands.some(brand => productBrandLower.includes(brand.toLowerCase()))) {
    score += 0.2
    reasons.push('marque préférée')
  }
  
  // Source preference
  if (product.source === 'scrapingbee') {
    score += 0.1
    reasons.push('produit vérifié')
  }
  
  // Category match
  if (product.category === ingredient.category) {
    score += 0.1
    reasons.push('catégorie correcte')
  }
  
  // Price factor (prefer cheaper options)
  if (product.priceChf && product.priceChf < 5) {
    score += 0.05
    reasons.push('prix économique')
  }
  
  // Normalize score
  score = Math.min(score, 1.0)
  
  // Determine confidence based on score and reasons
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (score >= 0.8 || reasons.includes('nom exact')) {
    confidence = 'high'
  } else if (score >= 0.5 || reasons.includes('synonyme')) {
    confidence = 'medium'
  } else if (score >= 0.3 && reasons.includes('catégorie correcte')) {
    confidence = 'medium'
  }
  
  return {
    matchScore: score,
    matchReason: reasons.join(', '),
    confidence
  }
}

// Generate optimized shopping list
export async function generateOptimizedShoppingList(
  ingredients: string[],
  options: {
    peopleCount: number
    budget?: number
    preferScrapingBee?: boolean
  }
): Promise<{
  items: Array<{
    product: EnhancedProductMatch
    ingredient: IngredientAnalysis
    quantity: number
    unit: string
    totalPrice: number
  }>
  categories: Map<string, any[]>
  totalCost: number
  savings: number
  unmatchedIngredients: string[]
}> {
  const items: any[] = []
  const unmatchedIngredients: string[] = []
  let totalCost = 0
  
  // Define non-essential categories to skip
  const SKIP_CATEGORIES = ['herbs', 'pantry']
  const ESSENTIAL_PANTRY = ['huile', 'farine', 'sucre', 'riz', 'pâtes'] // Keep these even from pantry
  
  // Group similar ingredients
  const ingredientGroups = new Map<string, string[]>()
  
  for (const ingredientStr of ingredients) {
    const analysis = analyzeIngredient(ingredientStr)
    
    // Skip non-essential ingredients
    if (SKIP_CATEGORIES.includes(analysis.category) && 
        !ESSENTIAL_PANTRY.includes(analysis.mainIngredient)) {
      console.log(`⏩ Skipping non-essential: ${analysis.mainIngredient} (${analysis.category})`)
      continue
    }
    
    const key = analysis.mainIngredient
    
    if (!ingredientGroups.has(key)) {
      ingredientGroups.set(key, [])
    }
    ingredientGroups.get(key)!.push(ingredientStr)
  }
  
  // Process each ingredient group
  console.log('\n🛒 Processing ingredient groups:')
  for (const [mainIngredient, group] of ingredientGroups) {
    const analysis = analyzeIngredient(group[0]) // Use first as representative
    console.log(`\n📦 Processing: "${mainIngredient}" (${group.length} occurrences)`)
    console.log(`   Category: ${analysis.category}, Original: "${group[0]}"`)
    
    const matches = await findBestProductMatch(analysis, {
      preferScrapingBee: options.preferScrapingBee,
      maxPriceChf: options.budget ? options.budget / ingredients.length : undefined
    })
    
    if (matches.length > 0) {
      const bestMatch = matches[0]
      console.log(`   ✅ Found match: "${bestMatch.name}" (${bestMatch.confidence}, score: ${Math.round(bestMatch.matchScore * 100)}%)`)
      
      const { quantity, unit } = calculateSmartQuantity(
        analysis,
        options.peopleCount,
        group.length // Number of meals using this ingredient
      )
      
      const itemTotalPrice = bestMatch.priceChf * quantity
      
      items.push({
        product: bestMatch,
        ingredient: analysis,
        quantity,
        unit,
        totalPrice: Math.round(itemTotalPrice * 100) / 100
      })
      
      totalCost += itemTotalPrice
    } else {
      console.log(`   ❌ No match found, creating fallback`)
      // Create a fallback entry for unmatched ingredients
      const { quantity, unit } = calculateSmartQuantity(
        analysis,
        options.peopleCount,
        group.length
      )
      
      const fallbackProduct: EnhancedProductMatch = {
        id: `unmatched-${Date.now()}-${Math.random()}`,
        name: analysis.original, // Use original ingredient text instead of simplified version
        priceChf: 5.00, // Default estimated price
        unit: unit,
        category: analysis.category,
        matchScore: 0,
        matchReason: 'non trouvé - recherche manuelle requise',
        confidence: 'low',
        source: 'fallback',
        url: undefined,
        searchUrl: generateMigrosSearchUrl(analysis.mainIngredient) // Still use main ingredient for search
      }
      
      items.push({
        product: fallbackProduct,
        ingredient: analysis,
        quantity,
        unit,
        totalPrice: 5.00 * quantity
      })
      
      totalCost += 5.00 * quantity
      unmatchedIngredients.push(...group)
    }
  }
  
  // Consolidate duplicate products
  const consolidatedItems = new Map<string, any>()
  
  items.forEach(item => {
    const productId = item.product.id
    
    if (consolidatedItems.has(productId)) {
      // Product already exists, merge quantities and ingredients
      const existing = consolidatedItems.get(productId)
      existing.quantity += item.quantity
      existing.totalPrice = Math.round((existing.product.priceChf * existing.quantity) * 100) / 100
      existing.matchedIngredients = [...existing.matchedIngredients, ...item.ingredient.original ? [item.ingredient.original] : []]
    } else {
      // New product
      consolidatedItems.set(productId, {
        ...item,
        matchedIngredients: item.ingredient.original ? [item.ingredient.original] : []
      })
    }
  })
  
  // Convert back to array
  const finalItems = Array.from(consolidatedItems.values())
  
  // Recalculate total cost after consolidation
  totalCost = finalItems.reduce((sum, item) => sum + item.totalPrice, 0)
  
  // Organize by category
  const categories = new Map<string, any[]>()
  finalItems.forEach(item => {
    const category = getCategoryName(item.ingredient.category)
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)!.push(item)
  })
  
  // Calculate savings (comparing with standard prices)
  const standardCost = finalItems.reduce((sum, item) => {
    const standardPrice = item.product.source === 'scrapingbee' 
      ? item.product.priceChf * 1.1 // ScrapingBee prices are current
      : item.product.priceChf * 0.9 // Fallback prices might be outdated
    return sum + (standardPrice * item.quantity)
  }, 0)
  
  const savings = Math.max(0, standardCost - totalCost)
  
  return {
    items: finalItems,
    categories,
    totalCost: Math.round(totalCost * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    unmatchedIngredients
  }
}

// Helper function for category display names
function getCategoryName(category: string): string {
  const categoryNames: Record<string, string> = {
    'pasta': 'Pâtes & Céréales',
    'rice': 'Pâtes & Céréales', 
    'meat': 'Viande & Volaille',
    'fish': 'Poisson & Fruits de mer',
    'vegetables': 'Fruits & Légumes',
    'fruits': 'Fruits & Légumes',
    'dairy': 'Produits Laitiers',
    'pantry': 'Épicerie',
    'herbs': 'Herbes & Épices',
    'bakery': 'Boulangerie',
    'nuts': 'Noix & Graines',
    'autres': 'Autres'
  }
  
  return categoryNames[category] || 'Autres'
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Calculate similarity score (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  return maxLength === 0 ? 1 : 1 - (distance / maxLength)
}