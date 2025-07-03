import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('🌱 Seeding database with realistic Migros products...')

    // Realistic Swiss grocery products with proper pricing
    const products = [
      // Pasta & Rice
      {
        id: 'barilla-spaghetti-500g',
        name: 'Barilla Spaghetti',
        brand: 'Barilla',
        priceChf: 2.95,
        unit: '500g',
        category: 'pâtes',
        url: 'https://www.migros.ch/fr/product/barilla-spaghetti-500g',
        imageUrl: 'https://www.migros.ch/images/barilla-spaghetti.jpg',
        ariaLabel: 'Barilla Spaghetti 500g - CHF 2.95'
      },
      {
        id: 'panzani-penne-500g',
        name: 'Panzani Penne Rigate',
        brand: 'Panzani',
        priceChf: 2.50,
        unit: '500g',
        category: 'pâtes',
        url: 'https://www.migros.ch/fr/product/panzani-penne-500g',
        imageUrl: 'https://www.migros.ch/images/panzani-penne.jpg',
        ariaLabel: 'Panzani Penne Rigate 500g - CHF 2.50'
      },
      {
        id: 'uncle-bens-riz-1kg',
        name: 'Uncle Ben\'s Riz Parfait',
        brand: 'Uncle Ben\'s',
        priceChf: 4.95,
        unit: '1kg',
        category: 'riz',
        url: 'https://www.migros.ch/fr/product/uncle-bens-riz-1kg',
        imageUrl: 'https://www.migros.ch/images/uncle-bens-riz.jpg',
        ariaLabel: 'Uncle Ben\'s Riz Parfait 1kg - CHF 4.95'
      },

      // Meat
      {
        id: 'poulet-filet-400g',
        name: 'Filet de Poulet Suisse',
        brand: 'Terra Suisse',
        priceChf: 8.95,
        unit: '400g',
        category: 'viande',
        url: 'https://www.migros.ch/fr/product/poulet-filet-400g',
        imageUrl: 'https://www.migros.ch/images/poulet-filet.jpg',
        ariaLabel: 'Filet de Poulet Suisse 400g - CHF 8.95'
      },
      {
        id: 'boeuf-hache-500g',
        name: 'Bœuf Haché Suisse',
        brand: 'Terra Suisse',
        priceChf: 12.50,
        unit: '500g',
        category: 'viande',
        url: 'https://www.migros.ch/fr/product/boeuf-hache-500g',
        imageUrl: 'https://www.migros.ch/images/boeuf-hache.jpg',
        ariaLabel: 'Bœuf Haché Suisse 500g - CHF 12.50'
      },
      {
        id: 'saumon-filet-300g',
        name: 'Filet de Saumon Atlantique',
        brand: 'Migros',
        priceChf: 9.95,
        unit: '300g',
        category: 'poisson',
        url: 'https://www.migros.ch/fr/product/saumon-filet-300g',
        imageUrl: 'https://www.migros.ch/images/saumon-filet.jpg',
        ariaLabel: 'Filet de Saumon Atlantique 300g - CHF 9.95'
      },

      // Vegetables
      {
        id: 'tomates-cerises-250g',
        name: 'Tomates Cerises',
        brand: 'Migros',
        priceChf: 3.50,
        unit: '250g',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/tomates-cerises-250g',
        imageUrl: 'https://www.migros.ch/images/tomates-cerises.jpg',
        ariaLabel: 'Tomates Cerises 250g - CHF 3.50'
      },
      {
        id: 'courgettes-1kg',
        name: 'Courgettes Suisses',
        brand: 'Terra Suisse',
        priceChf: 4.20,
        unit: '1kg',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/courgettes-1kg',
        imageUrl: 'https://www.migros.ch/images/courgettes.jpg',
        ariaLabel: 'Courgettes Suisses 1kg - CHF 4.20'
      },
      {
        id: 'oignons-1kg',
        name: 'Oignons Jaunes',
        brand: 'Migros',
        priceChf: 2.80,
        unit: '1kg',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/oignons-1kg',
        imageUrl: 'https://www.migros.ch/images/oignons.jpg',
        ariaLabel: 'Oignons Jaunes 1kg - CHF 2.80'
      },
      {
        id: 'carottes-1kg',
        name: 'Carottes Suisses',
        brand: 'Terra Suisse',
        priceChf: 3.50,
        unit: '1kg',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/carottes-1kg',
        imageUrl: 'https://www.migros.ch/images/carottes.jpg',
        ariaLabel: 'Carottes Suisses 1kg - CHF 3.50'
      },

      // Dairy
      {
        id: 'gruyere-200g',
        name: 'Gruyère AOP',
        brand: 'Migros',
        priceChf: 6.50,
        unit: '200g',
        category: 'fromage',
        url: 'https://www.migros.ch/fr/product/gruyere-200g',
        imageUrl: 'https://www.migros.ch/images/gruyere.jpg',
        ariaLabel: 'Gruyère AOP 200g - CHF 6.50'
      },
      {
        id: 'emmental-200g',
        name: 'Emmental Suisse',
        brand: 'Migros',
        priceChf: 5.95,
        unit: '200g',
        category: 'fromage',
        url: 'https://www.migros.ch/fr/product/emmental-200g',
        imageUrl: 'https://www.migros.ch/images/emmental.jpg',
        ariaLabel: 'Emmental Suisse 200g - CHF 5.95'
      },
      {
        id: 'lait-entier-1l',
        name: 'Lait Entier UHT',
        brand: 'Migros',
        priceChf: 1.95,
        unit: '1L',
        category: 'lait',
        url: 'https://www.migros.ch/fr/product/lait-entier-1l',
        imageUrl: 'https://www.migros.ch/images/lait-entier.jpg',
        ariaLabel: 'Lait Entier UHT 1L - CHF 1.95'
      },
      {
        id: 'beurre-200g',
        name: 'Beurre de Cuisine',
        brand: 'Migros',
        priceChf: 3.20,
        unit: '200g',
        category: 'beurre',
        url: 'https://www.migros.ch/fr/product/beurre-200g',
        imageUrl: 'https://www.migros.ch/images/beurre.jpg',
        ariaLabel: 'Beurre de Cuisine 200g - CHF 3.20'
      },

      // Pantry Items
      {
        id: 'huile-olive-500ml',
        name: 'Huile d\'Olive Extra Vierge',
        brand: 'Migros',
        priceChf: 7.95,
        unit: '500ml',
        category: 'huile',
        url: 'https://www.migros.ch/fr/product/huile-olive-500ml',
        imageUrl: 'https://www.migros.ch/images/huile-olive.jpg',
        ariaLabel: 'Huile d\'Olive Extra Vierge 500ml - CHF 7.95'
      },
      {
        id: 'ail-100g',
        name: 'Ail Frais',
        brand: 'Migros',
        priceChf: 2.95,
        unit: '100g',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/ail-100g',
        imageUrl: 'https://www.migros.ch/images/ail.jpg',
        ariaLabel: 'Ail Frais 100g - CHF 2.95'
      },
      {
        id: 'tomates-concassees-400g',
        name: 'Tomates Concassées',
        brand: 'Migros',
        priceChf: 1.50,
        unit: '400g',
        category: 'conserves',
        url: 'https://www.migros.ch/fr/product/tomates-concassees-400g',
        imageUrl: 'https://www.migros.ch/images/tomates-concassees.jpg',
        ariaLabel: 'Tomates Concassées 400g - CHF 1.50'
      },
      {
        id: 'pain-complet-500g',
        name: 'Pain Complet Suisse',
        brand: 'Migros',
        priceChf: 2.80,
        unit: '500g',
        category: 'pain',
        url: 'https://www.migros.ch/fr/product/pain-complet-500g',
        imageUrl: 'https://www.migros.ch/images/pain-complet.jpg',
        ariaLabel: 'Pain Complet Suisse 500g - CHF 2.80'
      },
      {
        id: 'oeufs-6pieces',
        name: 'Œufs Frais de Poules Élevées au Sol',
        brand: 'Terra Suisse',
        priceChf: 4.50,
        unit: '6 pièces',
        category: 'œufs',
        url: 'https://www.migros.ch/fr/product/oeufs-6pieces',
        imageUrl: 'https://www.migros.ch/images/oeufs.jpg',
        ariaLabel: 'Œufs Frais de Poules Élevées au Sol 6 pièces - CHF 4.50'
      }
    ]

    console.log(`📦 Seeding ${products.length} products...`)

    // Clear existing products
    await db.migrosProduct.deleteMany()
    console.log('🗑️ Cleared existing products')

    // Insert new products
    let created = 0
    for (const product of products) {
      try {
        await db.migrosProduct.create({
          data: {
            ...product,
            lastUpdated: new Date()
          }
        })
        created++
      } catch (error) {
        console.error(`Failed to create product ${product.id}:`, error)
      }
    }

    console.log(`✅ Successfully seeded ${created}/${products.length} products`)

    // Get summary statistics
    const totalProducts = await db.migrosProduct.count()
    const categoryStats = await db.migrosProduct.groupBy({
      by: ['category'],
      _count: {
        id: true
      }
    })

    const averagePrice = await db.migrosProduct.aggregate({
      _avg: {
        priceChf: true
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${created} products`,
      statistics: {
        totalProducts,
        categoriesCount: categoryStats.length,
        categories: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.id
        })),
        averagePrice: averagePrice._avg.priceChf?.toFixed(2),
        priceRange: {
          min: Math.min(...products.map(p => p.priceChf)),
          max: Math.max(...products.map(p => p.priceChf))
        }
      }
    })

  } catch (error) {
    console.error('❌ Product seeding failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Product seeding failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}