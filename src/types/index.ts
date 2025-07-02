export interface UserPreferences {
  peopleCount: number
  mealsPerDay: number
  budgetChf?: number
  dietaryRestrictions: string[]
  cuisinePreferences: string[]
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced'
}

export interface MigrosProduct {
  id: string
  name: string
  brand?: string
  priceChf?: number
  unit?: string
  category?: string
  url?: string
  imageUrl?: string
  ariaLabel?: string
}

export interface WeeklyMenu {
  id: string
  weekStartDate: Date
  menuData: {
    [day: string]: {
      [meal: string]: {
        recipeName: string
        ingredients: string[]
        instructions: string[]
        prepTime?: number
        cookTime?: number
      }
    }
  }
  totalBudgetChf?: number
}