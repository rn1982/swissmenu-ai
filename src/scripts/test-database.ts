import { PRODUCT_STATS, getAllProducts, getProductsByCategory } from '../lib/swiss-product-database'

console.log('🇨🇭 Swiss Product Database Test')
console.log('=' .repeat(60))

console.log('\n📊 Database Statistics:')
console.log(`Total Products: ${PRODUCT_STATS.totalProducts}`)
console.log(`Categories: ${PRODUCT_STATS.categories}`)
console.log(`Price Range: ${PRODUCT_STATS.priceRange.min} - ${PRODUCT_STATS.priceRange.max} CHF`)
console.log(`Average Price: ${PRODUCT_STATS.priceRange.average} CHF`)

console.log('\n📦 Products per Category:')
Object.entries(PRODUCT_STATS.categoryCounts).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} products`)
})

console.log('\n🥘 Sample Products from Each Category:')
const categories = ['pasta', 'meat', 'vegetables', 'dairy', 'bakery', 'beverages', 'frozen', 'pantry', 'snacks']

categories.forEach(category => {
  const products = getProductsByCategory(category)
  if (products.length > 0) {
    console.log(`\n${category.toUpperCase()}:`)
    products.slice(0, 3).forEach(product => {
      console.log(`  - ${product.name} (${product.brand}) - ${product.priceChf} CHF`)
    })
  }
})

console.log('\n✅ Database test complete!')