import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import pLimit from 'p-limit';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

interface BrokenUrlResult {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  url: string;
  status: number | 'error';
  error?: string;
  checkedAt: Date;
}

interface CategoryStats {
  total: number;
  broken: number;
  percentage: number;
}

async function checkUrl(url: string): Promise<{ status: number | 'error'; error?: string }> {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return { status: response.status };
  } catch (error: any) {
    // Try GET if HEAD fails
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return { status: response.status };
    } catch (error: any) {
      return { 
        status: 'error', 
        error: error.message || 'Unknown error'
      };
    }
  }
}

async function checkBrokenUrls(testMode = false, sampleSize?: number) {
  console.log('🔍 Starting URL validation check...\n');

  try {
    // Fetch all products or a sample
    let products;
    if (testMode && sampleSize) {
      // Get a diverse sample across categories
      const categories = await prisma.migrosProduct.groupBy({
        by: ['category'],
        _count: true
      });

      products = [];
      for (const cat of categories) {
        const categoryProducts = await prisma.migrosProduct.findMany({
          where: { category: cat.category },
          take: Math.ceil(sampleSize / categories.length)
        });
        products.push(...categoryProducts);
      }
      console.log(`📊 Testing sample of ${products.length} products across ${categories.length} categories\n`);
    } else {
      products = await prisma.migrosProduct.findMany({
        orderBy: { category: 'asc' }
      });
      console.log(`📊 Found ${products.length} products to check\n`);
    }

    // Rate limiting - 5 concurrent requests
    const limit = pLimit(5);
    const brokenUrls: BrokenUrlResult[] = [];
    const results: BrokenUrlResult[] = [];
    
    console.log('🌐 Checking URLs (this may take a while)...\n');
    
    const checks = products.map((product, index) => 
      limit(async () => {
        const result = await checkUrl(product.url || '');
        
        // Progress indicator
        if ((index + 1) % 10 === 0) {
          process.stdout.write(`\rChecked ${index + 1}/${products.length} products...`);
        }

        const urlResult: BrokenUrlResult = {
          id: product.id,
          name: product.name,
          category: product.category || 'Unknown',
          brand: product.brand,
          url: product.url || '',
          status: result.status,
          error: result.error,
          checkedAt: new Date()
        };

        results.push(urlResult);

        // Consider 403, 404, 410, 5xx errors, and connection errors as broken
        // Note: 403 often indicates Cloudflare blocking which means the URL might still be valid
        if (result.status === 404 || 
            result.status === 403 || 
            result.status === 410 || 
            result.status === 'error' ||
            (typeof result.status === 'number' && result.status >= 500)) {
          brokenUrls.push(urlResult);
        }

        return urlResult;
      })
    );

    await Promise.all(checks);
    console.log('\n\n✅ URL checking complete!\n');

    // Analyze results by category
    const categoryStats: Record<string, CategoryStats> = {};
    const brandStats: Record<string, { total: number; broken: number }> = {};

    for (const product of products) {
      const category = product.category || 'Unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, broken: 0, percentage: 0 };
      }
      categoryStats[category].total++;

      const brand = product.brand || 'No Brand';
      if (!brandStats[brand]) {
        brandStats[brand] = { total: 0, broken: 0 };
      }
      brandStats[brand].total++;
    }

    for (const broken of brokenUrls) {
      categoryStats[broken.category].broken++;
      const brand = broken.brand || 'No Brand';
      brandStats[brand].broken++;
    }

    // Calculate percentages
    for (const cat in categoryStats) {
      categoryStats[cat].percentage = 
        (categoryStats[cat].broken / categoryStats[cat].total) * 100;
    }

    // Sort categories by broken percentage
    const sortedCategories = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.percentage - a.percentage);

    // Display results
    console.log('📊 SUMMARY REPORT');
    console.log('================\n');
    console.log(`Total products checked: ${products.length}`);
    console.log(`Broken URLs found: ${brokenUrls.length} (${((brokenUrls.length / products.length) * 100).toFixed(1)}%)\n`);

    console.log('🏷️  BREAKDOWN BY CATEGORY:');
    console.log('------------------------');
    for (const [category, stats] of sortedCategories) {
      console.log(`${category}: ${stats.broken}/${stats.total} broken (${stats.percentage.toFixed(1)}%)`);
    }

    console.log('\n🏢 TOP AFFECTED BRANDS:');
    console.log('---------------------');
    const sortedBrands = Object.entries(brandStats)
      .filter(([, stats]) => stats.broken > 0)
      .sort(([, a], [, b]) => b.broken - a.broken)
      .slice(0, 10);

    for (const [brand, stats] of sortedBrands) {
      const percentage = (stats.broken / stats.total) * 100;
      console.log(`${brand}: ${stats.broken}/${stats.total} broken (${percentage.toFixed(1)}%)`);
    }

    // Analyze URL patterns
    console.log('\n🔍 URL PATTERNS IN BROKEN LINKS:');
    console.log('-------------------------------');
    
    const urlPatterns: Record<string, number> = {};
    for (const broken of brokenUrls) {
      // Extract product ID pattern
      const idMatch = broken.url.match(/\/(\d+)$/);
      if (idMatch) {
        const idLength = idMatch[1].length;
        const pattern = `${idLength}-digit IDs`;
        urlPatterns[pattern] = (urlPatterns[pattern] || 0) + 1;
      }

      // Check for specific URL structures
      if (broken.url.includes('/produkte/')) {
        urlPatterns['Contains /produkte/'] = (urlPatterns['Contains /produkte/'] || 0) + 1;
      }
      if (broken.url.includes('/product/')) {
        urlPatterns['Contains /product/'] = (urlPatterns['Contains /product/'] || 0) + 1;
      }
    }

    for (const [pattern, count] of Object.entries(urlPatterns)) {
      console.log(`${pattern}: ${count} broken URLs`);
    }

    // Sample of broken URLs
    console.log('\n❌ SAMPLE BROKEN URLS:');
    console.log('--------------------');
    const sampleBroken = brokenUrls.slice(0, 10);
    for (const broken of sampleBroken) {
      console.log(`- ${broken.name} (${broken.category})`);
      console.log(`  URL: ${broken.url}`);
      console.log(`  Status: ${broken.status}${broken.error ? ` - ${broken.error}` : ''}\n`);
    }

    // Save detailed results
    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = join(process.cwd(), `broken-urls-report-${timestamp}.json`);
    
    const report = {
      summary: {
        totalChecked: products.length,
        totalBroken: brokenUrls.length,
        percentageBroken: ((brokenUrls.length / products.length) * 100).toFixed(1),
        checkedAt: new Date().toISOString()
      },
      categoryStats: sortedCategories.map(([cat, stats]) => ({
        category: cat,
        ...stats
      })),
      brokenUrls: brokenUrls.sort((a, b) => a.category.localeCompare(b.category)),
      allResults: results
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Status code distribution
    const statusCodes: Record<string, number> = {};
    for (const result of results) {
      const status = result.status.toString();
      statusCodes[status] = (statusCodes[status] || 0) + 1;
    }

    console.log('\n📊 STATUS CODE DISTRIBUTION:');
    console.log('-------------------------');
    for (const [status, count] of Object.entries(statusCodes).sort(([a], [b]) => a.localeCompare(b))) {
      const percentage = (count / results.length) * 100;
      console.log(`${status}: ${count} (${percentage.toFixed(1)}%)`);
    }

  } catch (error) {
    console.error('❌ Error checking URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const testMode = args.includes('--test');
const sampleSizeArg = args.find(arg => arg.startsWith('--sample='));
const sampleSize = sampleSizeArg ? parseInt(sampleSizeArg.split('=')[1]) : undefined;

// Run the check
checkBrokenUrls(testMode, sampleSize)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });