import axios from 'axios';

const testUrls = [
  'https://www.migros.ch/fr/product/220220030210',
  'https://www.migros.ch/fr/product/104222200000',
  'https://www.migros.ch/fr/product/111433900000',
  'https://www.migros.ch/fr/product/999999999999', // Test with fake product ID
];

async function testManualUrls() {
  console.log('🔍 Manual URL Testing\n');
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        }
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`Status Text: ${response.statusText}`);
      
      // Check if it's a redirect
      if (response.headers.location) {
        console.log(`Redirect to: ${response.headers.location}`);
      }
      
      // Check content for 404 page indicators
      const content = response.data.toString();
      if (content.includes('404') || content.includes('not found') || content.includes('introuvable')) {
        console.log(`⚠️  Content suggests 404 page`);
      }
      
      // Check page title
      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        console.log(`Page Title: ${titleMatch[1]}`);
      }
      
      console.log('---\n');
      
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
      console.log('---\n');
    }
  }
}

testManualUrls();