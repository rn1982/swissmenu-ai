import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;

async function testSpecificUrls() {
  // URLs to test - including some that might be problematic
  const testUrls = [
    { name: 'Valid Product 1', url: 'https://www.migros.ch/fr/product/220220030210' },
    { name: 'Valid Product 2', url: 'https://www.migros.ch/fr/product/104222200000' },
    { name: 'Invalid Product ID', url: 'https://www.migros.ch/fr/product/999999999999' },
    { name: 'Old Format URL', url: 'https://www.migros.ch/fr/produkte/example-123' },
    { name: 'Malformed URL', url: 'https://www.migros.ch/fr/product/' },
  ];

  console.log('🔍 Testing Specific URLs with ScrapingBee\n');

  for (const test of testUrls) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`URL: ${test.url}`);
    
    try {
      const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key: SCRAPINGBEE_API_KEY,
          url: test.url,
          render_js: 'false',
          premium_proxy: 'true',
          country_code: 'ch'
        },
        timeout: 30000,
        validateStatus: () => true
      });

      const actualStatus = parseInt(response.headers['spb-original-status'] || response.status.toString());
      console.log(`Status: ${actualStatus}`);

      // Extract some content info
      const html = response.data;
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'No title found';
      console.log(`Page Title: "${title}"`);

      // Check for product info
      if (html.includes('product-detail') || html.includes('ProductDetail')) {
        console.log(`✅ Product page detected`);
      } else if (html.includes('404') || html.includes('not found') || html.includes('introuvable')) {
        console.log(`❌ Error page detected`);
      } else {
        console.log(`⚠️  Unknown page type`);
      }

      // Check for price info
      const priceMatch = html.match(/CHF\s*([\d.]+)/);
      if (priceMatch) {
        console.log(`Price found: CHF ${priceMatch[1]}`);
      }

    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Now test some products from the database
  console.log('\n\n📊 Testing Random Database Products\n');
  
  const dbProducts = await prisma.migrosProduct.findMany({
    take: 5,
    where: {
      url: { not: null }
    },
    orderBy: { lastUpdated: 'desc' }
  });

  for (const product of dbProducts) {
    console.log(`\nProduct: ${product.name}`);
    console.log(`Database URL: ${product.url}`);
    
    if (!product.url) continue;
    
    try {
      const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key: SCRAPINGBEE_API_KEY,
          url: product.url,
          render_js: 'false',
          premium_proxy: 'true',
          country_code: 'ch'
        },
        timeout: 30000,
        validateStatus: () => true
      });

      const actualStatus = parseInt(response.headers['spb-original-status'] || response.status.toString());
      console.log(`Status: ${actualStatus}`);

      const html = response.data;
      
      // Check if product name appears on page
      if (html.toLowerCase().includes(product.name.toLowerCase().substring(0, 20))) {
        console.log(`✅ Product name found on page`);
      } else {
        console.log(`⚠️  Product name not found on page`);
      }

      // Check for current price
      const priceMatches = html.match(/CHF\s*([\d.]+)/g);
      if (priceMatches && priceMatches.length > 0) {
        console.log(`Prices on page: ${priceMatches.slice(0, 3).join(', ')}`);
        console.log(`Database price: CHF ${product.priceChf}`);
      }

    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  await prisma.$disconnect();
}

testSpecificUrls();