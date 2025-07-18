# Comprehensive Priority Scraping Guide

## Overview

The Comprehensive Priority Scraper is designed to efficiently scrape ~570 products from Migros, focusing on Priority 1 categories that are essential for Swiss recipe generation.

## Target Categories

### Priority 1 Categories (Focus Areas)
1. **Pasta & Rice** - Essential carbohydrates for Swiss and international dishes
2. **Meat & Poultry** - Core proteins including Swiss specialties
3. **Vegetables** - Fresh and frozen vegetables, herbs
4. **Dairy & Eggs** - Swiss cheeses, milk products, eggs
5. **Pantry** - Oils, vinegars, spices, flour, sugar, canned goods

### Essential Missing Ingredients
The scraper specifically targets these critical missing items:
- **Dairy**: Crème fraîche, Mascarpone, Ricotta, Raclette, Fondue mix
- **Pantry**: Yeast, Baking soda, Pesto varieties
- **Meat**: Lardons, Ham, Salami, Cervelas, Dried meat
- **Swiss Specialties**: Rösti, Spätzli, Knöpfli, Bircher muesli, Aromat

## Setup

### 1. Environment Configuration
Create or update `.env.local` with your ScrapingBee API key:
```bash
SCRAPINGBEE_API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
Ensure your PostgreSQL database is running and migrations are applied:
```bash
npx prisma migrate dev
```

## Usage

### Test Mode (Recommended First)
Run a limited test to verify everything works:
```bash
npm run scrape:priority:test
```
This will:
- Scrape only 5 essential product searches
- Scrape only 3 category pages
- Use approximately 50-100 API credits

### Full Scraping
Run the complete scraping process:
```bash
npm run scrape:priority
```
This will:
- Scrape all essential missing products
- Process all priority category pages
- Target ~570 products total
- Use approximately 600 API credits

### Resume from Checkpoint
If the scraper fails or is interrupted:
```bash
npm run scrape:priority:resume
```
This will:
- Load the last checkpoint
- Skip already completed searches and categories
- Continue from where it left off

## API Credit Management

### Credit Usage Estimates
- **Product page**: 1 credit
- **Search/Category page**: 10 credits
- **Total for 570 products**: ~600 credits

### ScrapingBee Free Tier
- 1000 credits/month included
- The scraper is configured to use max 600 credits (conservative)

### Credit Optimization Tips
1. Use test mode first to verify setup
2. Run during off-peak hours for better performance
3. Use checkpoints to avoid re-scraping on failures
4. Monitor credit usage in ScrapingBee dashboard

## Features

### Rate Limiting
- 3-second delay between requests
- Sequential processing (no parallel requests)
- Prevents rate limiting and ensures stability

### Error Handling
- Comprehensive error logging
- Failed URLs tracked for retry
- Graceful handling of network issues
- Database transaction safety

### Progress Tracking
- Real-time progress updates
- Checkpoint saves every 10 products
- Detailed logging with timestamps
- Final report generation

### Resume Capability
- Automatic checkpoint creation
- Tracks completed searches and categories
- Can resume from any interruption
- Preserves credit usage tracking

## Monitoring

### During Execution
Watch the console for:
- Progress updates (products scraped/saved)
- Credit usage tracking
- Error notifications
- Category completion status

### Log Files
Check the `logs/` directory for:
- `priority-scraper-YYYY-MM-DD.log` - Detailed execution log
- `priority-scraper-checkpoint.json` - Resume checkpoint
- `priority-scraper-progress.json` - Current progress
- `scraping-report-YYYY-MM-DD.json` - Final report

### Database Monitoring
After scraping, verify results:
```bash
npm run db:monitor
```

## Troubleshooting

### Common Issues

1. **"SCRAPINGBEE_API_KEY not found"**
   - Ensure `.env.local` exists and contains the API key
   - Restart the terminal after adding environment variables

2. **"Credit limit reached"**
   - Check ScrapingBee dashboard for remaining credits
   - Wait for monthly reset or upgrade plan
   - Use test mode to minimize credit usage

3. **"Failed to scrape product"**
   - Product may be out of stock or URL changed
   - Check `logs/` for specific error details
   - Failed URLs are tracked for manual review

4. **"Database connection failed"**
   - Verify DATABASE_URL in `.env.local`
   - Ensure PostgreSQL is running
   - Check network connectivity

### Manual Recovery

If automatic resume fails:
1. Check `logs/priority-scraper-checkpoint.json`
2. Note completed searches/categories
3. Manually edit checkpoint file if needed
4. Run with `--resume` flag

## Best Practices

1. **Pre-flight Checks**
   - Verify API credits available
   - Test database connection
   - Run test mode first

2. **Optimal Timing**
   - Run during Swiss nighttime (less traffic)
   - Avoid peak shopping hours
   - Weekend mornings often work best

3. **Post-Scraping**
   - Review the final report
   - Check for failed URLs
   - Validate data quality
   - Update any missing brands/categories

## Integration with SwissMenu AI

The scraped products integrate with:
- Recipe ingredient matching
- Shopping list generation
- Price calculations
- Nutritional analysis

Ensure regular updates to maintain:
- Current prices
- Product availability
- New product additions
- Seasonal variations

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review log files for specific errors
3. Verify ScrapingBee API status
4. Check Migros website changes