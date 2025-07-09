import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;

interface DiagnosticResult {
  productId: string;
  productName: string;
  category: string;
  url: string;
  status: number;
  requiresJavaScript: boolean;
  hasProductContent: boolean;
  pageType: 'product' | 'error' | 'generic' | 'unknown';
  diagnosis: string;
}

async function diagnoseUrlIssues() {
  console.log('🔍 Diagnosing URL Issues\n');

  // Test with and without JavaScript rendering
  const testProducts = await prisma.migrosProduct.findMany({
    take: 10,
    where: { url: { not: null } }
  });

  const results: DiagnosticResult[] = [];

  for (const product of testProducts) {
    console.log(`\nTesting: ${product.name}`);
    console.log(`URL: ${product.url}`);

    // Test without JavaScript
    console.log('1. Testing without JavaScript...');
    const noJsResult = await testUrl(product.url!, false);
    
    // Test with JavaScript
    console.log('2. Testing with JavaScript rendering...');
    const jsResult = await testUrl(product.url!, true);

    const diagnosis = analyzeDiagnosis(noJsResult, jsResult, product);
    results.push(diagnosis);

    console.log(`Diagnosis: ${diagnosis.diagnosis}`);
    console.log('---');
  }

  // Summary
  console.log('\n📊 DIAGNOSIS SUMMARY');
  console.log('==================\n');

  const requiresJs = results.filter(r => r.requiresJavaScript).length;
  const hasContent = results.filter(r => r.hasProductContent).length;
  const pageTypes = results.reduce((acc, r) => {
    acc[r.pageType] = (acc[r.pageType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`Total tested: ${results.length}`);
  console.log(`Require JavaScript: ${requiresJs} (${(requiresJs / results.length * 100).toFixed(0)}%)`);
  console.log(`Have product content: ${hasContent} (${(hasContent / results.length * 100).toFixed(0)}%)`);
  console.log('\nPage types:');
  Object.entries(pageTypes).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Save detailed report
  const report = {
    summary: {
      totalTested: results.length,
      requiresJavaScript: requiresJs,
      hasProductContent: hasContent,
      pageTypes,
      timestamp: new Date().toISOString()
    },
    diagnostics: results,
    recommendations: generateRecommendations(results)
  };

  const reportPath = join(process.cwd(), `url-diagnosis-${new Date().toISOString().split('T')[0]}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed diagnosis saved to: ${reportPath}`);

  await prisma.$disconnect();
}

async function testUrl(url: string, renderJs: boolean): Promise<any> {
  try {
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: SCRAPINGBEE_API_KEY,
        url: url,
        render_js: renderJs ? 'true' : 'false',
        premium_proxy: 'true',
        country_code: 'ch',
        wait: renderJs ? '3000' : '0' // Wait for JS to load
      },
      timeout: 60000,
      validateStatus: () => true
    });

    const status = parseInt(response.headers['spb-original-status'] || response.status.toString());
    const html = response.data;

    return {
      status,
      html,
      title: extractTitle(html),
      hasProductInfo: checkProductInfo(html),
      hasPrice: checkPrice(html),
      contentLength: html.length
    };
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match ? match[1].trim() : '';
}

function checkProductInfo(html: string): boolean {
  const productIndicators = [
    'product-detail',
    'ProductDetail',
    'product-info',
    'add-to-cart',
    'data-product',
    'product-price',
    'nutritional-values'
  ];
  
  return productIndicators.some(indicator => 
    html.toLowerCase().includes(indicator.toLowerCase())
  );
}

function checkPrice(html: string): boolean {
  return /CHF\s*\d+\.?\d*/.test(html);
}

function analyzeDiagnosis(noJsResult: any, jsResult: any, product: any): DiagnosticResult {
  let pageType: DiagnosticResult['pageType'] = 'unknown';
  let diagnosis = '';
  
  // Determine page type
  if (jsResult.hasProductInfo || jsResult.hasPrice) {
    pageType = 'product';
  } else if (jsResult.title?.includes('404') || jsResult.title?.includes('not found')) {
    pageType = 'error';
  } else if (jsResult.title === 'Migros' && jsResult.contentLength < 50000) {
    pageType = 'generic';
  }

  // Generate diagnosis
  if (noJsResult.status === 'error' || jsResult.status === 'error') {
    diagnosis = 'Connection error - unable to reach URL';
  } else if (!noJsResult.hasProductInfo && jsResult.hasProductInfo) {
    diagnosis = 'Product page requires JavaScript to load content';
  } else if (!jsResult.hasProductInfo && !jsResult.hasPrice) {
    if (jsResult.status === 200) {
      diagnosis = 'URL returns 200 but shows generic/error page - likely invalid product ID';
    } else {
      diagnosis = `URL returns ${jsResult.status} - product may not exist`;
    }
  } else {
    diagnosis = 'Product page loads correctly';
  }

  return {
    productId: product.id,
    productName: product.name,
    category: product.category || 'unknown',
    url: product.url,
    status: jsResult.status,
    requiresJavaScript: !noJsResult.hasProductInfo && jsResult.hasProductInfo,
    hasProductContent: jsResult.hasProductInfo || jsResult.hasPrice,
    pageType,
    diagnosis
  };
}

function generateRecommendations(results: DiagnosticResult[]): string[] {
  const recommendations: string[] = [];
  
  const invalidUrls = results.filter(r => !r.hasProductContent);
  const requiresJs = results.filter(r => r.requiresJavaScript);

  if (invalidUrls.length > 0) {
    recommendations.push(
      `${invalidUrls.length} URLs (${(invalidUrls.length / results.length * 100).toFixed(0)}%) appear to be invalid or have changed. Consider re-scraping these products.`
    );
  }

  if (requiresJs.length > 0) {
    recommendations.push(
      'Product pages require JavaScript rendering. Ensure your scraping solution uses JavaScript rendering for accurate results.'
    );
  }

  if (results.every(r => r.pageType === 'generic')) {
    recommendations.push(
      'All URLs return generic pages. Migros may have changed their URL structure or implemented additional anti-scraping measures.'
    );
  }

  return recommendations;
}

diagnoseUrlIssues();