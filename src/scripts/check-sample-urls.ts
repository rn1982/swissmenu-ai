import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkSampleUrls() {
  try {
    const products = await prisma.migrosProduct.findMany({
      take: 20,
      orderBy: { lastUpdated: 'desc' }
    });
    
    console.log('Sample of latest product URLs:');
    console.log('============================\n');
    
    products.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name}`);
      console.log(`   Category: ${p.category}`);
      console.log(`   URL: ${p.url}`);
      console.log(`   Last Updated: ${p.lastUpdated.toISOString()}\n`);
    });
    
    // Check URL patterns
    console.log('URL Pattern Analysis:');
    console.log('====================');
    
    const patterns = {
      withProduct: products.filter(p => p.url.includes('/product/')).length,
      withProdukte: products.filter(p => p.url.includes('/produkte/')).length,
      endsWithNumber: products.filter(p => /\/\d+$/.test(p.url)).length
    };
    
    console.log(`URLs with /product/: ${patterns.withProduct}`);
    console.log(`URLs with /produkte/: ${patterns.withProdukte}`);
    console.log(`URLs ending with number: ${patterns.endsWithNumber}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSampleUrls();