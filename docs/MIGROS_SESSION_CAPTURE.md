# Migros Session Capture Guide

## Overview
This guide explains how to capture and replicate Migros browser sessions to understand their API and improve our scraping success rate.

## Step 1: Capture a Real Session

### Run the Session Capture Tool
```bash
npx tsx src/scripts/migros-session-capture.ts
```

### What to do:
1. A browser window will open with DevTools
2. Navigate to https://www.migros.ch/fr
3. Perform these actions:
   - Accept cookies if prompted
   - Search for "pasta" or another product
   - Click on 2-3 products to view their pages
   - (Optional) Add a product to cart
   - Browse a category page
4. Press Enter in the terminal when done

### What gets captured:
- All API requests and responses
- Headers, cookies, timing
- LocalStorage and SessionStorage
- Browser configuration

### Output:
Files will be saved in `captured-sessions/`:
- `requests-[timestamp].json` - All captured API calls
- `session-[timestamp].json` - Browser session data
- `analysis-[timestamp].md` - Analysis report

## Step 2: Analyze the Capture

Look at the analysis report to find:
- API endpoints used by Migros
- Authentication headers
- Request patterns and timing
- Product data structure

## Step 3: Replicate the Session

### Test Session Replication
```bash
npx tsx src/scripts/migros-session-replicate.ts
```

This will:
1. Load the latest captured session
2. Set up browser with same configuration
3. Test searching for products
4. Navigate to product pages

## Step 4: Use Direct API Access

### In your code:
```typescript
import { MigrosDirectAPI } from './lib/migros-direct-api'

const api = new MigrosDirectAPI()
await api.initializeSession()

// Search products
const results = await api.searchProducts('pasta')
console.log(results.products)

// Get product details
const product = await api.getProductDetails('11790')
console.log(product)
```

## Understanding Migros Protection

### What we've learned:
1. **URL Patterns**:
   - Short IDs: `/product/mo/11790`
   - Long IDs: `/product/104074500000`

2. **Required Headers**:
   - User-Agent must be realistic
   - Accept-Language: fr-CH
   - Various sec-* headers

3. **Session Management**:
   - Guest token required
   - CSRF token for some requests
   - Cookies must be maintained

4. **Timing**:
   - Human-like delays needed
   - Too fast = blocked
   - Pattern recognition

## Next Steps

1. **Capture Multiple Sessions**
   - Different times of day
   - Different user behaviors
   - Mobile vs desktop

2. **Build Session Pool**
   - Rotate between sessions
   - Monitor success rates
   - Auto-refresh expired sessions

3. **Optimize Scraping**
   - Use discovered API endpoints
   - Mimic exact request patterns
   - Implement proper rate limiting

## Troubleshooting

### Getting 403 Errors?
- Session might be expired
- Missing required headers
- Too many requests too fast

### No Products Found?
- Check selectors in DevTools
- API endpoint might have changed
- Need to update request format

### Session Capture Fails?
- Make sure Playwright is installed
- Check browser permissions
- Try with headless: false

## Important Notes

- Always respect rate limits
- Use for legitimate purposes only
- Consider caching to reduce requests
- Monitor for changes in their system