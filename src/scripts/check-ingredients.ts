import { db } from '../lib/db'

async function checkIngredients() {
  // Get a recent menu
  const menu = await db.menu.findFirst({
    orderBy: { createdAt: 'desc' },
    take: 1
  })

  if (menu) {
    const data = JSON.parse(menu.data)
    
    console.log('=== Sample Menu Ingredients ===\n')
    
    // Check a few meals
    const days = ['lundi', 'mardi', 'mercredi']
    const meals = ['dejeuner', 'diner']
    
    for (const day of days) {
      for (const meal of meals) {
        const mealData = data.weekMenu[day][meal]
        if (mealData) {
          console.log(`\n${day.toUpperCase()} - ${meal}:`)
          console.log(`Nom: ${mealData.nom}`)
          console.log('Ingredients:')
          mealData.ingredients.forEach((ing: string, i: number) => {
            console.log(`  ${i + 1}. "${ing}"`)
          })
        }
      }
    }
    
    // Check for specific ingredients we're looking for
    console.log('\n=== Searching for specific ingredients ===')
    const searchTerms = ['spaghetti', 'pennes', 'haricots rouges', 'gruyère râpé', 'pain', 'croûtons']
    
    let allIngredients: string[] = []
    Object.values(data.weekMenu).forEach((dayMenu: any) => {
      Object.values(dayMenu).forEach((meal: any) => {
        if (meal && meal.ingredients) {
          allIngredients = allIngredients.concat(meal.ingredients)
        }
      })
    })
    
    searchTerms.forEach(term => {
      const found = allIngredients.filter(ing => 
        ing.toLowerCase().includes(term.toLowerCase())
      )
      if (found.length > 0) {
        console.log(`\n✅ Found "${term}" in:`)
        found.forEach(ing => console.log(`  - "${ing}"`))
      } else {
        console.log(`\n❌ "${term}" not found in any ingredients`)
      }
    })
  }
  
  await db.$disconnect()
}

checkIngredients().catch(console.error)