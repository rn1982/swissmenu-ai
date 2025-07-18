// Test script to check menu generation
const testMenuGeneration = async () => {
  console.log('Testing menu generation API...')
  
  // Get user preferences
  const prefsResponse = await fetch('http://localhost:3000/api/preferences')
  if (!prefsResponse.ok) {
    console.error('Failed to get preferences:', prefsResponse.status)
    return
  }
  
  const preferences = await prefsResponse.json()
  console.log('User preferences:', {
    id: preferences.id,
    peopleCount: preferences.peopleCount,
    mealsPerDay: preferences.mealsPerDay,
    budgetChf: preferences.budgetChf
  })
  
  // Generate menu
  console.log('\nGenerating menu...')
  const menuResponse = await fetch('http://localhost:3000/api/menu/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userPreferencesId: preferences.id
    })
  })
  
  if (!menuResponse.ok) {
    console.error('Failed to generate menu:', menuResponse.status)
    const error = await menuResponse.json()
    console.error('Error details:', error)
    return
  }
  
  const menu = await menuResponse.json()
  console.log('\nMenu generated successfully!')
  console.log('Menu summary:', menu.menu.menuData.resume)
  
  // Count meals per day
  console.log('\nMeals per day:')
  const weekMenu = menu.menu.menuData.weekMenu
  Object.keys(weekMenu).forEach(day => {
    const dayMeals = Object.keys(weekMenu[day])
    console.log(`${day}: ${dayMeals.length} meals (${dayMeals.join(', ')})`)
  })
  
  // Check total meals
  const totalMeals = Object.values(weekMenu).reduce((sum, day) => 
    sum + Object.keys(day).length, 0
  )
  const expectedMeals = preferences.mealsPerDay * 7
  console.log(`\nTotal meals: ${totalMeals}/${expectedMeals} (${totalMeals === expectedMeals ? '✅ CORRECT' : '❌ INCORRECT'})`)
}

testMenuGeneration().catch(console.error)