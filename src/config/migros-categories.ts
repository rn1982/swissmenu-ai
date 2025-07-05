// Migros category configuration with actual URLs
// Updated with real Migros category pages

export interface CategoryConfig {
  name: string
  displayName: string
  urls: string[]  // Multiple URLs per category for better coverage
  priority: number    // 1 = highest priority for meal planning
}

export const migrosCategories: CategoryConfig[] = [
  {
    name: 'pasta-rice',
    displayName: 'Pâtes et riz',
    urls: [
      'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/riz',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/saveurs-du-monde/asie'
    ],
    priority: 1
  },
  {
    name: 'meat-poultry',
    displayName: 'Viande et volaille',
    urls: [
      'https://www.migros.ch/fr/category/viandes-poissons/viandes-volaille/boeuf',
      'https://www.migros.ch/fr/category/viandes-poissons/viandes-volaille/viande-hachee-steak-hache',
      'https://www.migros.ch/fr/category/viandes-poissons/viandes-volaille/porc',
      'https://www.migros.ch/fr/category/viandes-poissons/viandes-volaille/veau-agneau-cheval',
      'https://www.migros.ch/fr/category/viandes-poissons/viandes-volaille/poulet-dinde-canard'
    ],
    priority: 1
  },
  {
    name: 'fish-seafood',
    displayName: 'Poisson et fruits de mer',
    urls: [
      'https://www.migros.ch/fr/category/viandes-poissons/poissons/poissons-frais-coquillages',
      'https://www.migros.ch/fr/category/surgeles/poissons-fruits-de-mer/fruits-de-mer-crustaces',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/conserves-plats-cuisines/conserves-de-poissons'
    ],
    priority: 2
  },
  {
    name: 'vegetables',
    displayName: 'Légumes',
    urls: [
      'https://www.migros.ch/fr/category/fruits-legumes/legumes',
      'https://www.migros.ch/fr/category/surgeles/fruits-legumes/legumes'
    ],
    priority: 1
  },
  {
    name: 'dairy-eggs',
    displayName: 'Produits laitiers et œufs',
    urls: [
      'https://www.migros.ch/fr/category/produits-laitiers-ufs-plats-prep/lait-beurre-ufs',
      'https://www.migros.ch/fr/category/produits-laitiers-ufs-plats-prep/fromages',
      'https://www.migros.ch/fr/category/produits-laitiers-ufs-plats-prep/yogourts-desserts'
    ],
    priority: 1
  },
  {
    name: 'bread-bakery',
    displayName: 'Pain et boulangerie',
    urls: [
      'https://www.migros.ch/fr/category/boulangerie-patisserie-petit-dej/pains-frais',
      'https://www.migros.ch/fr/category/boulangerie-patisserie-petit-dej/pains-biscottes',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/saveurs-du-monde/mexique' // for tortillas
    ],
    priority: 2
  },
  {
    name: 'pantry',
    displayName: 'Épicerie',
    urls: [
      'https://www.migros.ch/fr/category/pates-condiments-conserves/condiments-sauces/huiles-vinaigres',
      'https://www.migros.ch/fr/category/boulangerie-patisserie-petit-dej/ingredients-pour-la-patisserie',
      'https://www.migros.ch/fr/category/boulangerie-patisserie-petit-dej/ingredients-pour-la-patisserie/farines-levures',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/condiments-sauces/sels-poivres',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/condiments-sauces/sels-poivres/sels',
      'https://www.migros.ch/fr/category/pates-condiments-conserves/condiments-sauces/epices-herbes-assaisonnements'
    ],
    priority: 1
  }
]

// Helper to get high priority categories for daily scraping
export function getHighPriorityCategories(): CategoryConfig[] {
  return migrosCategories.filter(cat => cat.priority === 1)
}

// Helper to get category by name
export function getCategoryByName(name: string): CategoryConfig | undefined {
  return migrosCategories.find(cat => cat.name === name)
}