import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import pLimit from 'p-limit';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;

interface UrlCheckResult {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  url: string;
  status: number | 'error';
  isValid: boolean;
  error?: string;
  pageTitle?: string;
  checkedAt: Date;
}

async function checkUrlWithScrapingBee(url: string): Promise<UrlCheckResult['status'] & { pageTitle?: string; error?: string }> {
  if (!SCRAPINGBEE_API_KEY) {
    return { status: 'error', error: 'ScrapingBee API key not configured' };
  }

  try {
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: SCRAPINGBEE_API_KEY,
        url: url,
        render_js: 'false',
        premium_proxy: 'true',
        country_code: 'ch'
      },
      timeout: 30000,
      validateStatus: () => true
    });

    // ScrapingBee returns the actual status in headers
    const actualStatus = parseInt(response.headers['spb-original-status'] || response.status.toString());
    
    // Extract page title to check for soft 404s
    const titleMatch = response.data.match(/<title>(.*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';

    return { 
      status: actualStatus,
      pageTitle 
    };
  } catch (error: any) {
    return { 
      status: 'error', 
      error: error.message || 'Unknown error' 
    };
  }
}

async function checkUrlsWithScrapingBee(testMode = false, sampleSize?: number) {
  console.log('🔍 Starting URL validation with ScrapingBee...\n');

  if (!SCRAPINGBEE_API_KEY) {
    console.error('❌ ScrapingBee API key not found in environment variables');
    return;
  }

  try {
    // Fetch products
    let products;
    if (testMode && sampleSize) {
      // Test with specific problematic products first
      const problematicIds = [
        '220220030210', // Known product
        '999999999999', // Fake product
      ];
      
      const specificProducts = await prisma.migrosProduct.findMany({
        where: {
          OR: problematicIds.map(id => ({ id }))
        }
      });

      // Add random sample
      const randomProducts = await prisma.migrosProduct.findMany({
        take: Math.max(0, sampleSize - specificProducts.length),
        skip: Math.floor(Math.random() * 300)
      });

      products = [...specificProducts, ...randomProducts];
      console.log(`📊 Testing ${products.length} products (including known test cases)\n`);
    } else {
      products = await prisma.migrosProduct.findMany({
        orderBy: { category: 'asc' }
      });
      console.log(`📊 Found ${products.length} products to check\n`);
    }

    // Rate limiting - 2 concurrent requests for ScrapingBee
    const limit = pLimit(2);
    const results: UrlCheckResult[] = [];
    let progress = 0;
    
    console.log('🌐 Checking URLs with ScrapingBee...\n');
    
    const checks = products.map((product) => 
      limit(async () => {
        const result = await checkUrlWithScrapingBee(product.url || '');
        progress++;
        
        // Progress indicator
        process.stdout.write(`\rChecked ${progress}/${products.length} products...`);

        const isValid = result.status === 200 && 
                       !result.pageTitle?.toLowerCase().includes('404') &&
                       !result.pageTitle?.toLowerCase().includes('not found') &&
                       !result.pageTitle?.toLowerCase().includes('introuvable') &&
                       !result.pageTitle?.toLowerCase().includes('maintenance');

        const urlResult: UrlCheckResult = {
          id: product.id,
          name: product.name,
          category: product.category || 'unknown',
          brand: product.brand,
          url: product.url || '',
          status: result.status,
          isValid,
          error: result.error,
          pageTitle: result.pageTitle,
          checkedAt: new Date()
        };

        results.push(urlResult);
        return urlResult;
      })
    );

    await Promise.all(checks);
    console.log('\n\n✅ URL checking complete!\n');

    // Analyze results
    const brokenUrls = results.filter(r => !r.isValid);
    const validUrls = results.filter(r => r.isValid);
    const errorUrls = results.filter(r => r.status === 'error');

    // Group by status
    const statusGroups: Record<string, UrlCheckResult[]> = {};
    results.forEach(r => {
      const status = r.status.toString();
      if (!statusGroups[status]) statusGroups[status] = [];
      statusGroups[status].push(r);
    });

    // Display results
    console.log('📊 SUMMARY REPORT');
    console.log('================\n');
    console.log(`Total products checked: ${products.length}`);
    console.log(`Valid URLs: ${validUrls.length} (${((validUrls.length / products.length) * 100).toFixed(1)}%)`);
    console.log(`Invalid URLs: ${brokenUrls.length} (${((brokenUrls.length / products.length) * 100).toFixed(1)}%)`);
    console.log(`Check errors: ${errorUrls.length}\n`);

    console.log('📊 STATUS CODE BREAKDOWN:');
    console.log('------------------------');
    Object.entries(statusGroups).sort(([a], [b]) => a.localeCompare(b)).forEach(([status, items]) => {
      console.log(`${status}: ${items.length} URLs`);
    });

    if (brokenUrls.length > 0) {
      console.log('\n❌ SAMPLE INVALID URLS:');
      console.log('----------------------');
      const sampleBroken = brokenUrls.slice(0, 10);
      for (const broken of sampleBroken) {
        console.log(`\n- ${broken.name} (${broken.category})`);
        console.log(`  URL: ${broken.url}`);
        console.log(`  Status: ${broken.status}`);
        if (broken.pageTitle) {
          console.log(`  Page Title: "${broken.pageTitle}"`);
        }
        if (broken.error) {
          console.log(`  Error: ${broken.error}`);
        }
      }

      // Category breakdown for broken URLs
      const brokenByCategory: Record<string, number> = {};
      brokenUrls.forEach(b => {
        brokenByCategory[b.category] = (brokenByCategory[b.category] || 0) + 1;
      });

      console.log('\n🏷️  INVALID URLS BY CATEGORY:');
      console.log('----------------------------');
      Object.entries(brokenByCategory)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, count]) => {
          const total = products.filter(p => p.category === cat).length;
          const percentage = (count / total) * 100;
          console.log(`${cat}: ${count}/${total} (${percentage.toFixed(1)}%)`);
        });
    }

    // Save detailed report
    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = join(process.cwd(), `scrapingbee-url-check-${timestamp}.json`);
    
    const report = {
      summary: {
        totalChecked: products.length,
        totalValid: validUrls.length,
        totalInvalid: brokenUrls.length,
        totalErrors: errorUrls.length,
        checkedAt: new Date().toISOString(),
        method: 'ScrapingBee'
      },
      statusBreakdown: Object.entries(statusGroups).map(([status, items]) => ({
        status,
        count: items.length,
        percentage: ((items.length / products.length) * 100).toFixed(1)
      })),
      invalidUrls: brokenUrls,
      allResults: results
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Check for patterns in broken URLs
    if (brokenUrls.length > 0) {
      console.log('\n🔍 PATTERNS IN INVALID URLS:');
      console.log('--------------------------');
      
      // Check ID lengths
      const idLengths: Record<number, number> = {};
      brokenUrls.forEach(b => {
        const match = b.url.match(/\/(\d+)$/);
        if (match) {
          const length = match[1].length;
          idLengths[length] = (idLengths[length] || 0) + 1;
        }
      });
      
      Object.entries(idLengths).forEach(([length, count]) => {
        console.log(`${length}-digit IDs: ${count} invalid URLs`);
      });
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
const sampleSize = sampleSizeArg ? parseInt(sampleSizeArg.split('=')[1]) : 10;

// Run the check
checkUrlsWithScrapingBee(testMode, sampleSize)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });