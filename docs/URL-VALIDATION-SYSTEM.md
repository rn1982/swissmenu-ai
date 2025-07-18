# URL Validation System Documentation

## Overview

The URL validation system ensures all product URLs in the swiss-menu database are valid, up-to-date, and properly formatted. It includes tools for diagnosing issues, fixing broken URLs, monitoring health, and preventing future problems.

## Components

### 1. URL Validator (`src/lib/url-validator.ts`)
Core validation library with enhanced features:
- **URL validation with redirect detection**
- **Format checking and normalization**
- **Product page content verification**
- **Batch validation with rate limiting**
- **URL fixing utilities**

Key functions:
- `validateUrl()` - Validate single URL with optional content checking
- `validateUrls()` - Batch validate with rate limiting
- `normalizeProductUrl()` - Clean and standardize URLs
- `validateScrapedUrl()` - Validate URLs during scraping
- `generateUrlVariations()` - Generate possible URL patterns

### 2. URL Diagnosis Script (`src/scripts/diagnose-url-issues.ts`)
Analyzes URL issues by:
- Testing with/without JavaScript rendering
- Checking product page indicators
- Identifying redirect patterns
- Generating diagnosis reports

Usage:
```bash
npm run url:diagnose
```

### 3. URL Fix Script (`src/scripts/fix-product-urls.ts`)
Comprehensive URL fixing with:
- Multiple fix strategies (redirect following, format correction, API search)
- Batch processing with rate limiting
- Detailed fix reports
- Unfixable products tracking

Usage:
```bash
npm run url:fix
```

### 4. URL Health Check (`src/scripts/url-health-check.ts`)
Regular health monitoring:
- Sample or full database scans
- Category-specific checks
- Performance metrics
- Email alerts for threshold breaches
- Markdown reports

Usage:
```bash
# Sample check (100 products)
npm run url:health

# Full database check
npm run url:health:full

# Category-specific check
npm run url:health:category -- --categories=pasta,dairy,meat

# Custom threshold
npm run url:health -- --threshold=95
```

### 5. Validated Scraper (`src/lib/migros-scraper-validated.ts`)
Enhanced scraper with built-in URL validation:
- Validates URLs before saving
- Attempts to fix invalid URLs
- Tracks validation statistics
- Prevents broken URLs from entering database

Usage:
```bash
npm run scrape:validated
```

### 6. Scheduled Maintenance (`src/scripts/scheduled-url-maintenance.ts`)
Automated maintenance tasks:
- **Daily**: Quick health check (2 AM)
- **Weekly**: URL fixing (Sunday 3 AM)
- **Monthly**: Full audit (1st of month, 4 AM)

Usage:
```bash
# Start scheduler
npm run url:maintenance

# Run specific task manually
npm run url:maintenance:health
npm run url:maintenance:fix
npm run url:maintenance:audit
```

## URL Fix Strategies

1. **Missing Protocol**: Add `https://` prefix
2. **Missing Subdomain**: Add `www.` for migros.ch
3. **URL Encoding**: Fix encoding issues
4. **Query Parameters**: Remove unnecessary parameters
5. **Redirect Following**: Update to final destination
6. **Pattern Matching**: Try common URL patterns
7. **API Search**: Search by product name as fallback

## Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://...

# Email Alerts (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@example.com
ALERT_EMAIL=admin@example.com

# ScrapingBee (for diagnosis)
SCRAPINGBEE_API_KEY=your_api_key
```

## Best Practices

### During Scraping
1. Always validate URLs before saving
2. Use the validated scraper for new products
3. Store both original and fixed URLs for audit trail

### Maintenance
1. Run health checks regularly
2. Fix URLs promptly when issues detected
3. Monitor unfixable products for patterns
4. Keep logs of all maintenance activities

### Performance
1. Use batch processing for large operations
2. Implement rate limiting to avoid overwhelming servers
3. Cache validation results when possible
4. Run intensive operations during off-peak hours

## Troubleshooting

### Common Issues

1. **High Invalid URL Rate**
   - Check if Migros changed URL structure
   - Verify scraping logic is up-to-date
   - Review recent product additions

2. **Validation Timeouts**
   - Increase timeout in validator
   - Check network connectivity
   - Reduce batch size

3. **False Positives**
   - Update product page indicators
   - Check for new page layouts
   - Verify user agent string

## Monitoring

### Key Metrics
- **Health Score**: Percentage of valid URLs
- **Response Time**: Average validation time
- **Error Types**: Distribution of error types
- **Fix Rate**: Percentage of successfully fixed URLs

### Reports
Reports are saved to the `reports/` directory:
- Health check reports (Markdown)
- Fix operation reports (JSON)
- Unfixable products lists (JSON)

## API Reference

See individual component files for detailed API documentation.

## Future Improvements

1. **Machine Learning**: Predict URL patterns from product data
2. **Visual Validation**: Screenshot comparison for product pages
3. **A/B Testing**: Test multiple fix strategies simultaneously
4. **CDN Integration**: Cache validated URLs for faster checks
5. **Real-time Monitoring**: WebSocket-based live URL monitoring