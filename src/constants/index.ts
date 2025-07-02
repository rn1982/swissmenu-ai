export const DIETARY_RESTRICTIONS = [
  'Végétarien',
  'Végétalien', 
  'Sans gluten',
  'Sans lactose',
  'Sans noix',
  'Halal',
  'Casher'
] as const

export const CUISINE_PREFERENCES = [
  'Suisse',
  'Française',
  'Italienne',
  'Asiatique',
  'Méditerranéenne',
  'Mexicaine',
  'Indienne'
] as const

export const COOKING_SKILL_LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' }
] as const

export const MEAL_TYPES = [
  'Petit-déjeuner',
  'Déjeuner', 
  'Dîner',
  'Collation'
] as const