# Proxy Services for Migros Scraping

## Overview

After extensive testing, we've found that Migros.ch uses advanced Cloudflare protection that blocks:
- Direct HTTP requests (403 Forbidden)
- Headless browser automation (Playwright/Puppeteer)
- Official API endpoints (even with authentication)

The solution is to use residential proxy services that provide:
- Real residential IP addresses
- Advanced anti-bot bypass
- JavaScript rendering
- Swiss IP addresses

## Recommended Services

### 1. ScrapingBee (Recommended for Testing)
**Best for**: Quick testing and development
- **Free tier**: 1000 API credits
- **Pricing**: $49/month for 150k credits
- **Features**: JS rendering, residential proxies, anti-bot bypass
- **Setup time**: 5 minutes
- **Swiss IPs**: Available

### 2. Bright Data (Enterprise Solution)
**Best for**: Large-scale production scraping
- **Free trial**: $5 credit
- **Pricing**: Pay-as-you-go, ~$12.75/GB
- **Features**: Largest proxy network, 72M+ IPs
- **Setup time**: 30 minutes
- **Swiss IPs**: Available

### 3. SmartProxy
**Best for**: Mid-scale operations
- **Free trial**: 3-day trial
- **Pricing**: $75/month for 5GB
- **Features**: 40M+ residential IPs
- **Setup time**: 15 minutes
- **Swiss IPs**: Available

## Quick Start with ScrapingBee

### 1. Sign Up
1. Go to https://www.scrapingbee.com/
2. Create free account (no credit card required)
3. Get API key from dashboard

### 2. Configure Environment
Add to `.env.local`:
```bash
SCRAPINGBEE_API_KEY=your_api_key_here
```

### 3. Test the Integration
```bash
npm run test:scrapingbee
```

### 4. Monitor Usage
- Dashboard: https://app.scrapingbee.com/dashboard
- Each request with JS rendering uses 10 credits
- Free tier = ~100 product scrapes

## Implementation

### Basic Usage
```typescript
import { ProxyScraper } from './lib/proxy-scraper'

const scraper = new ProxyScraper({
  service: 'scrapingbee',
  apiKey: process.env.SCRAPINGBEE_API_KEY
})

// Scrape a product
const product = await scraper.scrapeProduct('https://www.migros.ch/fr/product/mo/11790')

// Scrape a category
const products = await scraper.scrapeCategory('pasta', 20)
```

### Integration with Scheduled Scraper
```typescript
// In scheduled-scraper.ts
async function scrapeWithProxy(category: string) {
  const scraper = new ProxyScraper({
    service: 'scrapingbee',
    apiKey: process.env.SCRAPINGBEE_API_KEY
  })
  
  const products = await scraper.scrapeCategory(category, 30)
  
  // Update database with real products
  for (const product of products) {
    await updateProductInDatabase(product)
  }
}
```

## Cost Analysis

### ScrapingBee Pricing
- **Free tier**: 1000 credits
- **Starter**: $49/month = 150,000 credits
- **Scale**: $99/month = 400,000 credits

### Cost per Product
- Standard request: 1 credit = $0.0003
- With JS rendering: 10 credits = $0.003
- Premium proxy: 25 credits = $0.008

### Monthly Budget Estimate
For daily scraping of 255 products:
- Daily: 255 × 10 credits = 2,550 credits
- Monthly: 2,550 × 30 = 76,500 credits
- Cost: ~$49/month (Starter plan)

## Alternative Approaches

### 1. Mobile App API (Failed)
- Migros mobile app uses same API endpoints
- Also protected by Cloudflare
- Returns 403 Forbidden

### 2. Partner API Access
- Contact Migros for official partner API
- Requires business registration
- May have usage restrictions

### 3. Manual Data Entry
- Hire data entry team
- Update products weekly
- Most reliable but labor-intensive

## Security Considerations

### API Key Management
- Never commit API keys to git
- Use environment variables
- Rotate keys regularly
- Monitor usage for anomalies

### Rate Limiting
- Add delays between requests (2-5 seconds)
- Respect robots.txt
- Rotate through categories
- Run during off-peak hours (3-5 AM)

### Legal Compliance
- Review Migros terms of service
- Consider reaching out for partnership
- Only scrape public data
- Don't overload servers

## Troubleshooting

### Common Issues

1. **403 Forbidden**
   - Check API key is valid
   - Ensure proxy service is active
   - Try different proxy location

2. **Empty Product Data**
   - Page structure may have changed
   - Update CSS selectors
   - Check debug HTML output

3. **Rate Limits**
   - Reduce request frequency
   - Upgrade proxy plan
   - Implement exponential backoff

4. **Costs Too High**
   - Cache scraped data
   - Reduce scraping frequency
   - Focus on popular products only

## Next Steps

1. **Immediate**: Set up ScrapingBee free trial
2. **Short-term**: Test scraping accuracy
3. **Medium-term**: Implement caching layer
4. **Long-term**: Negotiate Migros partnership

## Support

- ScrapingBee docs: https://www.scrapingbee.com/documentation/
- Bright Data docs: https://docs.brightdata.com/
- SmartProxy docs: https://smartproxy.com/docs/