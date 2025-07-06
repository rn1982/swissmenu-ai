import { db } from '@/lib/db'

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

// Enhanced ingredient database with synonyms and categories
const INGREDIENT_DATABASE: Record<string, {
  synonyms: string[]
  category: string
  preferredBrands?: string[]
  unitConversions?: Record<string, number>
}> = {
  // Pasta & Rice
  'pâtes': {
    synonyms: ['pasta', 'spaghetti', 'penne', 'fusilli', 'linguine', 'tagliatelle', 'rigatoni', 'macaroni', 'farfalle', 'lasagne', 'cannelloni'],
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
  'saumon': {
    synonyms: ['salmon', 'filet de saumon', 'pavé de saumon'],
    category: 'fish'
  },
  'perche': {
    synonyms: ['filets de perche', 'perch'],
    category: 'fish'
  },
  'poisson': {
    synonyms: ['fish', 'filet de poisson', 'poisson blanc', 'cabillaud', 'colin', 'lieu'],
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
  'lait': {
    synonyms: ['milk', 'lait entier', 'lait demi-écrémé', 'lait écrémé'],
    category: 'dairy',
    preferredBrands: ['M-Classic', 'Valflora']
  },
  'fromage': {
    synonyms: ['cheese', 'gruyère', 'emmental', 'parmesan', 'mozzarella', 'cheddar', 'fromage râpé', 'fromage frais'],
    category: 'dairy'
  },
  'beurre': {
    synonyms: ['butter', 'beurre salé', 'beurre doux'],
    category: 'dairy',
    preferredBrands: ['M-Classic', 'Floralp']
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
  'farine': {
    synonyms: ['flour', 'farine blanche', 'farine complète'],
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
    synonyms: ['bread', 'baguette', 'pain complet', 'pain de mie'],
    category: 'bakery'
  },
  'pâte feuilletée': {
    synonyms: ['puff pastry', 'pâte brisée', 'pâte à tarte'],
    category: 'bakery'
  },
  
  // Fruits
  'pomme': {
    synonyms: ['pommes', 'apple'],
    category: 'fruits'
  },
  'orange': {
    synonyms: ['oranges'],
    category: 'fruits'
  },
  'banane': {
    synonyms: ['bananes', 'banana'],
    category: 'fruits'
  },
  'fraise': {
    synonyms: ['fraises', 'strawberry'],
    category: 'fruits'
  },
  'abricot': {
    synonyms: ['abricots', 'apricot'],
    category: 'fruits'
  },
  'pêche': {
    synonyms: ['pêches', 'peach'],
    category: 'fruits'
  },
  'poire': {
    synonyms: ['poires', 'pear'],
    category: 'fruits'
  },
  'raisin': {
    synonyms: ['raisins', 'grapes'],
    category: 'fruits'
  },
  'cerise': {
    synonyms: ['cerises', 'cherry'],
    category: 'fruits'
  },
  'mangue': {
    synonyms: ['mango'],
    category: 'fruits'
  },
  'avocat': {
    synonyms: ['avocado'],
    category: 'fruits'
  },
  
  // Nuts & Seeds
  'amande': {
    synonyms: ['amandes', 'almonds', 'amandes effilées', 'poudre d\'amandes'],
    category: 'nuts'
  },
  'noix': {
    synonyms: ['walnuts', 'cerneaux de noix'],
    category: 'nuts'
  },
  'noisette': {
    synonyms: ['noisettes', 'hazelnuts'],
    category: 'nuts'
  },
  'pignon': {
    synonyms: ['pignons de pin', 'pine nuts'],
    category: 'nuts'
  },
  'sésame': {
    synonyms: ['sesame', 'graines de sésame', 'huile de sésame'],
    category: 'nuts'
  },
  
  // Other common ingredients
  'tofu': {
    synonyms: ['tofu ferme', 'tofu soyeux'],
    category: 'autres'
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
  'haricots': {
    synonyms: ['beans', 'haricots verts', 'haricots blancs', 'haricots rouges'],
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

// Parse and analyze ingredient string
export function analyzeIngredient(ingredientStr: string): IngredientAnalysis {
  const original = ingredientStr.trim()
  const lower = original.toLowerCase()
  
  // Extract quantity and unit - expanded pattern
  const quantityMatch = lower.match(/^(\d+(?:[,\.]\d+)?)\s*(kg|g|mg|l|dl|cl|ml|cc|c\.?\s*à\s*[sc]\.?|cs|cuillères?\s*à\s*soupe|cuillères?\s*à\s*café|tasses?|pièces?|tranches?|gousses?|feuilles?|branches?|paquets?|bouquets?|bottes?|sachets?|boîtes?)?/i)
  let quantity: number | undefined
  let unit: string | undefined
  let cleanedStr = lower
  
  if (quantityMatch) {
    quantity = parseFloat(quantityMatch[1].replace(',', '.'))
    unit = quantityMatch[2]
    cleanedStr = lower.replace(quantityMatch[0], '').trim()
  }
  
  // Remove common modifiers and cooking terms
  const modifiers: string[] = []
  const modifierWords = [
    'frais', 'fraîche', 'fraîches', 'haché', 'hachée', 'hachées', 
    'râpé', 'râpée', 'râpées', 'coupé', 'coupée', 'coupées',
    'émincé', 'émincée', 'émincées', 'pelé', 'pelée', 'pelées',
    'cuit', 'cuite', 'cuites', 'cru', 'crue', 'crues',
    'finement', 'grossièrement', 'entier', 'entière', 'entières'
  ]
  
  modifierWords.forEach(modifier => {
    if (cleanedStr.includes(modifier)) {
      modifiers.push(modifier)
      cleanedStr = cleanedStr.replace(new RegExp(`\\b${modifier}\\b`, 'g'), '').trim()
    }
  })
  
  // Remove articles and prepositions
  cleanedStr = cleanedStr.replace(/\b(le|la|les|un|une|des|de|du|d'|à|au|aux|en)\b/g, ' ').trim()
  // Clean up multiple spaces
  cleanedStr = cleanedStr.replace(/\s+/g, ' ').trim()
  
  // Find main ingredient - check full string first, then individual words
  let mainIngredient = cleanedStr
  let category = 'autres'
  let foundMatch = false
  
  // First try exact matches
  for (const [key, data] of Object.entries(INGREDIENT_DATABASE)) {
    if (cleanedStr === key || data.synonyms.includes(cleanedStr)) {
      mainIngredient = key
      category = data.category
      foundMatch = true
      break
    }
  }
  
  // Then try contains matches
  if (!foundMatch) {
    for (const [key, data] of Object.entries(INGREDIENT_DATABASE)) {
      if (cleanedStr.includes(key) || data.synonyms.some(syn => cleanedStr.includes(syn))) {
        mainIngredient = key
        category = data.category
        foundMatch = true
        break
      }
    }
  }
  
  // Finally try word-by-word matching
  if (!foundMatch) {
    const words = cleanedStr.split(' ')
    for (const word of words) {
      for (const [key, data] of Object.entries(INGREDIENT_DATABASE)) {
        if (word === key || data.synonyms.includes(word)) {
          mainIngredient = key
          category = data.category
          foundMatch = true
          break
        }
      }
      if (foundMatch) break
    }
  }
  
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

// Enhanced matching algorithm
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
    .filter(match => match.matchScore >= 0.2) // Lower threshold for better coverage
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5)
  
  // If no good matches, return a generic substitute suggestion
  if (sortedMatches.length === 0 && products.length > 0) {
    console.log(`⚠️ No good matches for "${ingredient.original}", using best available`)
    sortedMatches = scoredMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 1)
      .map(match => ({
        ...match,
        matchReason: 'substitut générique',
        confidence: 'low' as const
      }))
  }
  
  return sortedMatches.map(match => ({
    id: match.id,
    name: match.name,
    brand: match.brand || undefined,
    priceChf: match.priceChf || 0,
    unit: match.unit || undefined,
    category: match.category || undefined,
    url: match.url || undefined,
    imageUrl: match.imageUrl || undefined,
    matchScore: match.matchScore,
    matchReason: match.matchReason,
    confidence: match.confidence,
    source: match.source as 'scrapingbee' | 'fallback'
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
  
  // Default calculation
  return {
    quantity: baseQuantity,
    unit: ingredient.unit || 'unité(s)'
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
  
  // Group similar ingredients
  const ingredientGroups = new Map<string, string[]>()
  
  for (const ingredientStr of ingredients) {
    const analysis = analyzeIngredient(ingredientStr)
    const key = analysis.mainIngredient
    
    if (!ingredientGroups.has(key)) {
      ingredientGroups.set(key, [])
    }
    ingredientGroups.get(key)!.push(ingredientStr)
  }
  
  // Process each ingredient group
  for (const [mainIngredient, group] of ingredientGroups) {
    const analysis = analyzeIngredient(group[0]) // Use first as representative
    const matches = await findBestProductMatch(analysis, {
      preferScrapingBee: options.preferScrapingBee,
      maxPriceChf: options.budget ? options.budget / ingredients.length : undefined
    })
    
    if (matches.length > 0) {
      const bestMatch = matches[0]
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
      unmatchedIngredients.push(...group)
    }
  }
  
  // Organize by category
  const categories = new Map<string, any[]>()
  items.forEach(item => {
    const category = getCategoryName(item.ingredient.category)
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)!.push(item)
  })
  
  // Calculate savings (comparing with standard prices)
  const standardCost = items.reduce((sum, item) => {
    const standardPrice = item.product.source === 'scrapingbee' 
      ? item.product.priceChf * 1.1 // ScrapingBee prices are current
      : item.product.priceChf * 0.9 // Fallback prices might be outdated
    return sum + (standardPrice * item.quantity)
  }, 0)
  
  const savings = Math.max(0, standardCost - totalCost)
  
  return {
    items,
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