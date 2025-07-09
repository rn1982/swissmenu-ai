// Simple test without database dependency
const { analyzeIngredient } = require('./src/lib/enhanced-product-matching');

console.log('🔬 TESTING INGREDIENT ANALYSIS:\n');

const testCases = [
  // Common recipe ingredients with quantities
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
  'beurre'
];

testCases.forEach(ingredient => {
  const analysis = analyzeIngredient(ingredient);
  console.log(`\n📝 "${ingredient}"`);
  console.log(`   → Cleaned: "${analysis.cleaned}"`);
  console.log(`   → Main: "${analysis.mainIngredient}" (${analysis.category})`);
  if (analysis.quantity) {
    console.log(`   → Quantity: ${analysis.quantity} ${analysis.unit || '(no unit)'}`);
  }
  if (analysis.modifiers.length > 0) {
    console.log(`   → Modifiers: ${analysis.modifiers.join(', ')}`);
  }
});