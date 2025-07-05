# SwissMenu AI - Testing Guide

## 🚀 Quick Start Testing

### 1. Start Development Server
```bash
npm run dev
```
Open http://localhost:3000

### 2. Test User Flow

#### A. Homepage
- Should see welcome message in French
- "Commencer" button to start

#### B. User Preferences (/preferences)
- Test form with:
  - Number of people: 2
  - Meals per day: 3
  - Budget: 150 CHF
  - Select some dietary restrictions
  - Select cuisine preferences
  - Cooking level: intermediate
- Submit form

#### C. Menu Generation (/menu)
- Click "Générer mon menu" button
- Wait for AI to generate menu (10-20 seconds)
- Should see weekly menu with Swiss dishes

#### D. Shopping List (/shopping)
- Click "Voir ma liste de courses"
- Should see ingredients matched to real Migros products
- Each product should have:
  - Name and quantity
  - Price in CHF
  - Working Migros URL (test a few)

## 🔍 Testing ScrapingBee Integration

### 1. Check Current Products
```bash
# View all pasta products with prices
npx tsx src/scripts/check-pasta-products.ts

# Check overall database stats
npx tsx src/scripts/check-scraping-progress.ts
```

### 2. Test Live Scraping
```bash
# Quick test - scrapes 10 pasta products
npm run scrape:migros -- --test --limit 10
```

Expected output:
- Should show "ScrapingBee response received"
- Products with names and CHF prices
- Creates/updates in database

### 3. Monitor Progress
In another terminal while scraping:
```bash
# Watch progress in real-time
npx tsx src/scripts/check-scraping-progress.ts
```

## 🧪 API Testing

### 1. System Health Check
```bash
curl http://localhost:3000/api/debug
```

### 2. Product Database Status
```bash
curl http://localhost:3000/api/products/enhanced-sync
```

### 3. User Preferences
```bash
# List all preferences
curl http://localhost:3000/api/preferences
```

## 📊 Database Inspection

### 1. Prisma Studio (Visual)
```bash
npx prisma studio
```
Opens at http://localhost:5555
- Check MigrosProduct table
- Verify prices and URLs

### 2. Direct Database Queries
```bash
# Count products by category
npx tsx -e "
import { db } from './src/lib/db'
const cats = await db.migrosProduct.groupBy({
  by: ['category'],
  _count: true
})
console.table(cats)
"
```

## 🐛 Common Issues & Solutions

### 1. "Environment variable not found"
```bash
# Make sure .env.local exists and contains:
DATABASE_URL="your_neon_connection_string"
ANTHROPIC_API_KEY="your_claude_api_key"
SCRAPINGBEE_API_KEY="your_scrapingbee_key"
```

### 2. Scraping Timeout
- Normal for large scraping runs
- Check progress with monitoring scripts
- Process continues in background

### 3. Price Discrepancies
- Known issue: some products show family pack prices
- Example: Macaronis showing 3.95 instead of 1.90
- Will be addressed with price validation feature

## ✅ Testing Checklist

### Basic Functionality
- [ ] Homepage loads
- [ ] Preferences form submits
- [ ] Menu generation works
- [ ] Shopping list displays
- [ ] Product URLs are clickable

### ScrapingBee Integration
- [ ] Test scraping runs without errors
- [ ] Products saved to database
- [ ] Prices are in CHF
- [ ] URLs work when clicked

### Data Quality
- [ ] Check a few product prices manually
- [ ] Verify product names are complete
- [ ] Categories are assigned correctly
- [ ] No duplicate products

## 🎯 Key Features to Test

### 1. Menu Generation Quality
- Are meals appropriate for Swiss context?
- Do they respect dietary restrictions?
- Is the budget calculation reasonable?

### 2. Product Matching
- Are ingredients matched to real products?
- Do quantities make sense?
- Are Swiss brands prioritized?

### 3. Price Accuracy
- Compare a few prices with Migros website
- Note any discrepancies for later fix

## 📱 UI/UX Testing

### Responsive Design
- Test on mobile viewport (375px)
- Test on tablet (768px)
- Test on desktop (1440px)

### French Language
- All UI text should be in French
- Currency should show CHF
- Dates in European format

### Performance
- Menu generation: < 30 seconds
- Shopping list: < 5 seconds
- Page transitions: smooth

## 🚀 Advanced Testing

### Load More Products
```bash
# Scrape 30 products per category URL
npm run scrape:migros -- --limit 30

# This will take ~1.5-2 hours
# Monitor with progress script
```

### Test Specific Categories
```bash
# Check meat products
npx tsx -e "
import { db } from './src/lib/db'
const meat = await db.migrosProduct.findMany({
  where: { category: 'meat-poultry' }
})
console.table(meat.map(p => ({
  name: p.name,
  price: p.priceChf,
  url: p.url
})))
"
```

## 📝 Notes for Production

1. **ScrapingBee Limits**: Free trial has 1000 credits
   - Each product = 10 credits
   - Monitor usage in dashboard

2. **Cron Jobs**: Not yet set up
   - Will run at 3-5 AM daily
   - Rotates through categories

3. **Price Validation**: TODO
   - Some products show wrong pack size
   - Manual verification recommended

## 🎉 Success Indicators

✅ You can generate a menu
✅ Shopping list shows real products
✅ Prices are in CHF
✅ Product URLs work
✅ ScrapingBee is scraping successfully
✅ Database growing with each scrape

---

**Remember**: This is an MVP. Some prices may be off, but the core functionality works! 🚀