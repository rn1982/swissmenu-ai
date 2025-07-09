# SwissMenu AI - Strategic Scraping Plan

## 📊 Current Database Status (Jan 2025)

**Total Products**: 373
- **With URLs**: 100%
- **With Prices**: 100%
- **Recently Scraped**: 90% (within 7 days)
- **Source**: 336 from ScrapingBee, 37 fallback

## 🎯 Identified Gaps & Strategic Plan

### 1. Essential Missing Ingredients (High Priority)

These are critical ingredients commonly used in Swiss recipes that are missing:

#### Dairy Products ❌
- Crème fraîche
- Mascarpone
- Ricotta
- Parmesan râpé
- Raclette cheese
- Fondue mix
- Crème à café

#### Pantry Essentials ❌
- Levure (yeast)
- Bicarbonate de soude
- Pesto (various types)

#### Meat Products ❌
- Lardons
- Jambon cuit
- Salami
- Cervelas
- Viande séchée

#### Swiss Specialties ❌
- Rösti (ready-made)
- Spätzli
- Knöpfli
- Bircher muesli
- Aromat

### 2. Categories Needing Expansion

| Category | Current Count | Target | Gap |
|----------|--------------|--------|-----|
| Dairy | 29 | 50+ | 21 |
| Fish | 14 | 30+ | 16 |
| Bakery | 16 | 30+ | 14 |
| Herbs | 27 | 40+ | 13 |
| Rice/Grains | 17 | 30+ | 13 |

## 🚀 Scraping Commands

### Quick Analysis
```bash
# Check current gaps
npm run analyze:gaps

# Monitor database health
npm run db:monitor

# Check scraping progress
npx tsx src/scripts/check-scraping-progress.ts
```

### Strategic Gap Scraping
```bash
# Test mode (2 queries per category)
npm run scrape:gaps:test

# Full scraping of all gaps
npm run scrape:gaps

# Target specific categories
npm run scrape:gaps dairy fish bakery

# Custom categories
npx tsx src/scripts/strategic-gap-scraper.ts dairy pantry meat
```

### Manual Product Search
```bash
# Search for specific products
npx tsx -e "
const scraper = new (require('./src/lib/proxy-scraper').ProxyScraper)({
  service: 'scrapingbee',
  apiKey: process.env.SCRAPINGBEE_API_KEY
});
scraper.scrapeUrl('https://www.migros.ch/fr/search?query=crème+fraîche')
  .then(console.log)
  .catch(console.error);
"
```

## 📈 Expansion Strategy

### Phase 1: Essential Ingredients (Week 1)
1. Run `npm run scrape:gaps:test` to verify ScrapingBee is working
2. Run `npm run scrape:gaps` to fill essential gaps
3. Monitor with `npm run db:monitor`

### Phase 2: Category Expansion (Week 2)
1. Focus on underrepresented categories:
   ```bash
   npm run scrape:gaps dairy fish bakery
   ```
2. Add seasonal products for better variety

### Phase 3: Quality Enhancement (Week 3)
1. Fix missing brand information (245 products)
2. Add nutritional data where available
3. Update product images

## 🔄 Automated Maintenance

### Daily Cron Job
```bash
# Add to crontab
0 3 * * * cd /path/to/swissmenu-ai && npm run scrape:gaps dairy fish >> logs/daily-scrape.log 2>&1
```

### Weekly Full Scan
```bash
# Sunday night full category refresh
0 2 * * 0 cd /path/to/swissmenu-ai && npm run scrape:gaps >> logs/weekly-scrape.log 2>&1
```

## 📊 Success Metrics

### Target Database State
- **500+ products** across all categories
- **All essential ingredients** available
- **30+ products** per major category
- **95%+ price accuracy**
- **100% valid URLs**

### Current Progress
- ✅ ScrapingBee integration working
- ✅ 373 products with valid URLs
- ✅ Strategic gap identification
- ❌ Essential ingredients missing
- ❌ Some categories under-represented

## 🛠️ Troubleshooting

### If Scraping Fails
1. Check ScrapingBee credits: `echo $SCRAPINGBEE_API_KEY`
2. Test single product: `npm run scrape:gaps:test`
3. Check logs: `tail -f logs/scrapingbee.log`
4. Verify Migros site structure hasn't changed

### Common Issues
- **Rate limiting**: Increase delay in config
- **Missing products**: Try alternative search terms
- **Price extraction**: Check for multi-pack pricing

## 📝 Notes

- ScrapingBee provides 1000 free API credits/month
- Each product page costs ~1 credit
- Category pages cost ~10 credits
- Optimize by batching similar products
- Use test mode to preserve credits during development