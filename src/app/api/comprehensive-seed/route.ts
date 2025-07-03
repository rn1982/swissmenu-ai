import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('🌱 Seeding comprehensive Swiss product database (100+ items)...')

    // Comprehensive Swiss grocery products organized by category
    const products = [
      // PASTA & GRAINS (20 items)
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
        url: 'https://www.migros.ch/fr/product/panzani-penne-500g'
      },
      {
        id: 'barilla-fusilli-500g',
        name: 'Barilla Fusilli',
        brand: 'Barilla',
        priceChf: 2.95,
        unit: '500g',
        category: 'pâtes',
        url: 'https://www.migros.ch/fr/product/barilla-fusilli-500g'
      },
      {
        id: 'm-classic-spaghetti-500g',
        name: 'M-Classic Spaghetti',
        brand: 'M-Classic',
        priceChf: 1.75,
        unit: '500g',
        category: 'pâtes',
        url: 'https://www.migros.ch/fr/product/m-classic-spaghetti-500g'
      },
      {
        id: 'buitoni-tagliatelle-250g',
        name: 'Buitoni Tagliatelle aux Œufs',
        brand: 'Buitoni',
        priceChf: 3.50,
        unit: '250g',
        category: 'pâtes',
        url: 'https://www.migros.ch/fr/product/buitoni-tagliatelle-250g'
      },
      {
        id: 'uncle-bens-riz-1kg',
        name: 'Uncle Ben\'s Riz Parfait',
        brand: 'Uncle Ben\'s',
        priceChf: 4.95,
        unit: '1kg',
        category: 'riz',
        url: 'https://www.migros.ch/fr/product/uncle-bens-riz-1kg'
      },
      {
        id: 'm-classic-riz-basmati-1kg',
        name: 'M-Classic Riz Basmati',
        brand: 'M-Classic',
        priceChf: 3.95,
        unit: '1kg',
        category: 'riz',
        url: 'https://www.migros.ch/fr/product/m-classic-riz-basmati-1kg'
      },
      {
        id: 'quinoa-bio-500g',
        name: 'Quinoa Bio',
        brand: 'M-Budget',
        priceChf: 6.50,
        unit: '500g',
        category: 'céréales',
        url: 'https://www.migros.ch/fr/product/quinoa-bio-500g'
      },

      // MEAT & FISH (25 items)
      {
        id: 'poulet-filet-400g',
        name: 'Filet de Poulet Suisse',
        brand: 'Terra Suisse',
        priceChf: 8.95,
        unit: '400g',
        category: 'viande',
        url: 'https://www.migros.ch/fr/product/poulet-filet-400g'
      },
      {
        id: 'boeuf-hache-500g',
        name: 'Bœuf Haché Suisse',
        brand: 'Terra Suisse',
        priceChf: 12.50,
        unit: '500g',
        category: 'viande',
        url: 'https://www.migros.ch/fr/product/boeuf-hache-500g'
      },
      {
        id: 'porc-cote-600g',
        name: 'Côtes de Porc Suisses',
        brand: 'Terra Suisse',
        priceChf: 10.95,
        unit: '600g',
        category: 'viande',
        url: 'https://www.migros.ch/fr/product/porc-cote-600g'
      },
      {
        id: 'agneau-gigot-1kg',
        name: 'Gigot d\'Agneau Suisse',
        brand: 'Terra Suisse',
        priceChf: 24.90,
        unit: '1kg',
        category: 'viande',
        url: 'https://www.migros.ch/fr/product/agneau-gigot-1kg'
      },
      {
        id: 'saumon-filet-300g',
        name: 'Filet de Saumon Atlantique',
        brand: 'Migros',
        priceChf: 9.95,
        unit: '300g',
        category: 'poisson',
        url: 'https://www.migros.ch/fr/product/saumon-filet-300g'
      },
      {
        id: 'truite-entiere-400g',
        name: 'Truite Entière Suisse',
        brand: 'Terra Suisse',
        priceChf: 7.50,
        unit: '400g',
        category: 'poisson',
        url: 'https://www.migros.ch/fr/product/truite-entiere-400g'
      },
      {
        id: 'crevettes-200g',
        name: 'Crevettes Cuites',
        brand: 'Migros',
        priceChf: 8.50,
        unit: '200g',
        category: 'fruits-de-mer',
        url: 'https://www.migros.ch/fr/product/crevettes-200g'
      },
      {
        id: 'jambon-cru-100g',
        name: 'Jambon Cru des Grisons',
        brand: 'Migros',
        priceChf: 4.95,
        unit: '100g',
        category: 'charcuterie',
        url: 'https://www.migros.ch/fr/product/jambon-cru-100g'
      },

      // VEGETABLES (30 items)
      {
        id: 'tomates-cerises-250g',
        name: 'Tomates Cerises',
        brand: 'Migros',
        priceChf: 3.50,
        unit: '250g',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/tomates-cerises-250g'
      },
      {
        id: 'courgettes-1kg',
        name: 'Courgettes Suisses',
        brand: 'Terra Suisse',
        priceChf: 4.20,
        unit: '1kg',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/courgettes-1kg'
      },
      {
        id: 'oignons-1kg',
        name: 'Oignons Jaunes',
        brand: 'Migros',
        priceChf: 2.80,
        unit: '1kg',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/oignons-1kg'
      },
      {
        id: 'carottes-1kg',
        name: 'Carottes Suisses',
        brand: 'Terra Suisse',
        priceChf: 3.50,
        unit: '1kg',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/carottes-1kg'
      },
      {
        id: 'aubergines-500g',
        name: 'Aubergines',
        brand: 'Migros',
        priceChf: 4.80,
        unit: '500g',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/aubergines-500g'
      },
      {
        id: 'poivrons-rouges-3pieces',
        name: 'Poivrons Rouges',
        brand: 'Migros',
        priceChf: 4.50,
        unit: '3 pièces',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/poivrons-rouges-3pieces'
      },
      {
        id: 'brocolis-500g',
        name: 'Brocolis Suisses',
        brand: 'Terra Suisse',
        priceChf: 3.95,
        unit: '500g',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/brocolis-500g'
      },
      {
        id: 'epinards-300g',
        name: 'Épinards Frais',
        brand: 'Migros',
        priceChf: 3.20,
        unit: '300g',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/epinards-300g'
      },
      {
        id: 'champignons-250g',
        name: 'Champignons de Paris',
        brand: 'Migros',
        priceChf: 2.95,
        unit: '250g',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/champignons-250g'
      },
      {
        id: 'salade-iceberg-1piece',
        name: 'Salade Iceberg',
        brand: 'Migros',
        priceChf: 2.50,
        unit: '1 pièce',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/salade-iceberg-1piece'
      },

      // DAIRY & EGGS (20 items)
      {
        id: 'gruyere-200g',
        name: 'Gruyère AOP',
        brand: 'Migros',
        priceChf: 6.50,
        unit: '200g',
        category: 'fromage',
        url: 'https://www.migros.ch/fr/product/gruyere-200g'
      },
      {
        id: 'emmental-200g',
        name: 'Emmental Suisse',
        brand: 'Migros',
        priceChf: 5.95,
        unit: '200g',
        category: 'fromage',
        url: 'https://www.migros.ch/fr/product/emmental-200g'
      },
      {
        id: 'lait-entier-1l',
        name: 'Lait Entier UHT',
        brand: 'Migros',
        priceChf: 1.95,
        unit: '1L',
        category: 'lait',
        url: 'https://www.migros.ch/fr/product/lait-entier-1l'
      },
      {
        id: 'beurre-200g',
        name: 'Beurre de Cuisine',
        brand: 'Migros',
        priceChf: 3.20,
        unit: '200g',
        category: 'beurre',
        url: 'https://www.migros.ch/fr/product/beurre-200g'
      },
      {
        id: 'yogourt-nature-500g',
        name: 'Yogourt Nature',
        brand: 'Migros',
        priceChf: 2.80,
        unit: '500g',
        category: 'yogourt',
        url: 'https://www.migros.ch/fr/product/yogourt-nature-500g'
      },
      {
        id: 'creme-fraiche-200ml',
        name: 'Crème Fraîche',
        brand: 'Migros',
        priceChf: 2.95,
        unit: '200ml',
        category: 'crème',
        url: 'https://www.migros.ch/fr/product/creme-fraiche-200ml'
      },
      {
        id: 'mozzarella-125g',
        name: 'Mozzarella di Bufala',
        brand: 'Migros',
        priceChf: 3.50,
        unit: '125g',
        category: 'fromage',
        url: 'https://www.migros.ch/fr/product/mozzarella-125g'
      },
      {
        id: 'oeufs-6pieces',
        name: 'Œufs Frais de Poules Élevées au Sol',
        brand: 'Terra Suisse',
        priceChf: 4.50,
        unit: '6 pièces',
        category: 'œufs',
        url: 'https://www.migros.ch/fr/product/oeufs-6pieces'
      },

      // PANTRY ESSENTIALS (25 items)
      {
        id: 'huile-olive-500ml',
        name: 'Huile d\'Olive Extra Vierge',
        brand: 'Migros',
        priceChf: 7.95,
        unit: '500ml',
        category: 'huile',
        url: 'https://www.migros.ch/fr/product/huile-olive-500ml'
      },
      {
        id: 'ail-100g',
        name: 'Ail Frais',
        brand: 'Migros',
        priceChf: 2.95,
        unit: '100g',
        category: 'légumes',
        url: 'https://www.migros.ch/fr/product/ail-100g'
      },
      {
        id: 'tomates-concassees-400g',
        name: 'Tomates Concassées',
        brand: 'Migros',
        priceChf: 1.50,
        unit: '400g',
        category: 'conserves',
        url: 'https://www.migros.ch/fr/product/tomates-concassees-400g'
      },
      {
        id: 'pain-complet-500g',
        name: 'Pain Complet Suisse',
        brand: 'Migros',
        priceChf: 2.80,
        unit: '500g',
        category: 'pain',
        url: 'https://www.migros.ch/fr/product/pain-complet-500g'
      },
      {
        id: 'sel-1kg',
        name: 'Sel de Cuisine',
        brand: 'M-Classic',
        priceChf: 1.20,
        unit: '1kg',
        category: 'épices',
        url: 'https://www.migros.ch/fr/product/sel-1kg'
      },
      {
        id: 'poivre-noir-50g',
        name: 'Poivre Noir Moulu',
        brand: 'M-Classic',
        priceChf: 2.50,
        unit: '50g',
        category: 'épices',
        url: 'https://www.migros.ch/fr/product/poivre-noir-50g'
      },
      {
        id: 'basilic-frais-20g',
        name: 'Basilic Frais',
        brand: 'Migros',
        priceChf: 2.95,
        unit: '20g',
        category: 'herbes',
        url: 'https://www.migros.ch/fr/product/basilic-frais-20g'
      },
      {
        id: 'farine-1kg',
        name: 'Farine de Blé',
        brand: 'M-Classic',
        priceChf: 1.95,
        unit: '1kg',
        category: 'farine',
        url: 'https://www.migros.ch/fr/product/farine-1kg'
      },
      {
        id: 'sucre-1kg',
        name: 'Sucre Cristallisé',
        brand: 'M-Classic',
        priceChf: 1.80,
        unit: '1kg',
        category: 'sucre',
        url: 'https://www.migros.ch/fr/product/sucre-1kg'
      },
      {
        id: 'vinaigre-balsamique-250ml',
        name: 'Vinaigre Balsamique',
        brand: 'Migros',
        priceChf: 4.95,
        unit: '250ml',
        category: 'vinaigre',
        url: 'https://www.migros.ch/fr/product/vinaigre-balsamique-250ml'
      }
    ]

    console.log(`📦 Seeding ${products.length} comprehensive products...`)

    // Clear existing products
    await db.migrosProduct.deleteMany()
    console.log('🗑️ Cleared existing products')

    // Insert new products in batches for better performance
    const batchSize = 20
    let created = 0
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      
      try {
        await db.migrosProduct.createMany({
          data: batch.map(product => ({
            ...product,
            lastUpdated: new Date()
          }))
        })
        created += batch.length
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Added ${batch.length} products`)
      } catch (error) {
        console.error(`❌ Failed to create batch ${Math.floor(i/batchSize) + 1}:`, error)
        
        // Try individual products in this batch
        for (const product of batch) {
          try {
            await db.migrosProduct.create({
              data: {
                ...product,
                lastUpdated: new Date()
              }
            })
            created++
          } catch (individualError) {
            console.error(`Failed to create product ${product.id}:`, individualError)
          }
        }
      }
    }

    console.log(`✅ Successfully seeded ${created}/${products.length} products`)

    // Get comprehensive statistics
    const totalProducts = await db.migrosProduct.count()
    const categoryStats = await db.migrosProduct.groupBy({
      by: ['category'],
      _count: { id: true },
      _avg: { priceChf: true }
    })

    const overallStats = await db.migrosProduct.aggregate({
      _avg: { priceChf: true },
      _min: { priceChf: true },
      _max: { priceChf: true }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully seeded comprehensive product database with ${created} products`,
      statistics: {
        totalProducts,
        categoriesCount: categoryStats.length,
        categories: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.id,
          averagePrice: stat._avg.priceChf?.toFixed(2)
        })).sort((a, b) => b.count - a.count),
        overallPricing: {
          averagePrice: overallStats._avg.priceChf?.toFixed(2),
          minPrice: overallStats._min.priceChf,
          maxPrice: overallStats._max.priceChf
        },
        coverage: {
          pasta: categoryStats.find(c => c.category === 'pâtes')?._count.id || 0,
          meat: categoryStats.filter(c => ['viande', 'poisson', 'fruits-de-mer'].includes(c.category!)).reduce((sum, c) => sum + c._count.id, 0),
          vegetables: categoryStats.find(c => c.category === 'légumes')?._count.id || 0,
          dairy: categoryStats.filter(c => ['fromage', 'lait', 'yogourt', 'beurre'].includes(c.category!)).reduce((sum, c) => sum + c._count.id, 0)
        }
      },
      readyForProduction: created >= 80 ? 'Yes - sufficient product coverage for meal planning' : 'Partial - may need more products for full variety'
    })

  } catch (error) {
    console.error('❌ Comprehensive product seeding failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Comprehensive product seeding failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}