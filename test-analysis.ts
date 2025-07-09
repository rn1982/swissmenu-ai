// Simplified version of analyzeIngredient for testing
function analyzeIngredient(ingredientStr: string) {
  const original = ingredientStr.trim()
  const lower = original.toLowerCase()
  
  // Extract quantity and unit
  const quantityMatch = lower.match(/^(\d+(?:[,\.]\d+)?)\s*(kg|g|mg|l|dl|cl|ml|cc|c\.?\s*à\s*[sc]\.?|cs|cuillères?\s*à\s*soupe|cuillères?\s*à\s*café|tasses?|pièces?|tranches?|gousses?|feuilles?|branches?|paquets?|bouquets?|bottes?|sachets?|boîtes?)?/i)
  let quantity: number | undefined
  let unit: string | undefined
  let cleanedStr = lower
  
  if (quantityMatch) {
    quantity = parseFloat(quantityMatch[1].replace(',', '.'))
    unit = quantityMatch[2]
    cleanedStr = lower.replace(quantityMatch[0], '').trim()
  }
  
  // Remove common modifiers
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
  cleanedStr = cleanedStr.replace(/\s+/g, ' ').trim()
  
  return {
    original,
    cleaned: cleanedStr,
    quantity,
    unit,
    modifiers
  }
}

console.log('🔬 TESTING INGREDIENT ANALYSIS:\n')

const testCases = [
  // Common recipe ingredients
  '200g de pâtes',
  '4 tomates fraîches', 
  '500g de bœuf haché',
  '2 oignons émincés',
  '3 gousses d\'ail hachées',
  '200ml de crème fraîche',
  '100g de fromage râpé',
  '1 litre de lait',
  '6 œufs',
  '2 c.à.s d\'huile d\'olive',
  '400g de poulet',
  '150g de riz basmati',
  '1 poivron rouge',
  '250g de champignons frais',
  'sel et poivre',
  '1 bouquet de persil',
  '2 branches de céleri',
  '300g de saumon frais',
  'farine',
  'beurre',
  // More complex cases
  '2 cuillères à soupe d\'huile d\'olive',
  '3 feuilles de laurier',
  '1 boîte de tomates pelées',
  '100g de lardons fumés',
  '2 paquets de pâtes fraîches',
  'quelques brins de thym frais',
  '1/2 litre de bouillon de légumes'
]

testCases.forEach(ingredient => {
  const analysis = analyzeIngredient(ingredient)
  console.log(`\n📝 "${ingredient}"`)
  console.log(`   → Cleaned: "${analysis.cleaned}"`)
  if (analysis.quantity) {
    console.log(`   → Quantity: ${analysis.quantity} ${analysis.unit || '(no unit)'}`)
  }
  if (analysis.modifiers.length > 0) {
    console.log(`   → Modifiers: ${analysis.modifiers.join(', ')}`)
  }
})