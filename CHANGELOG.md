# SwissMenu AI - Changelog

## [Latest] - 2025-01-05

### 🎉 Major Achievement: ScrapingBee Integration

#### Added
- **ScrapingBee proxy service integration** - Successfully bypasses Cloudflare!
- **Real-time Migros product scraping** with current CHF prices
- **27 fixed category URLs** for reliable scraping across 9 food categories
- **Multiple scraping scripts**:
  - `scrape-migros-products.ts` - Main production scraper
  - `test-scrapingbee.ts` - API testing and validation
  - `check-pasta-products.ts` - Category-specific monitoring
  - `check-scraping-progress.ts` - Real-time progress tracking
  - `continue-test-scraping.ts` - Resume interrupted scraping
- **Price analysis tools** for debugging multi-pack pricing issues
- **Comprehensive documentation**:
  - `PROXY_SERVICES.md` - Proxy service comparison
  - `SCRAPING_STATUS.md` - Current status and metrics
  - `PRICE_VALIDATION_TODO.md` - Future enhancement plan
  - `TEST_GUIDE.md` - Complete testing instructions

#### Changed
- Updated `CLAUDE.md` with new scraping commands and status
- Modified Prisma schema to support both `MigrosProduct` and `Product` models
- Enhanced package.json with new npm scripts for scraping

#### Fixed
- Database connection issues in scraping scripts
- Product URL patterns (short IDs need `/mo/` prefix)
- Environment variable loading with dotenv

#### Discovered Issues
- Some products show family pack prices instead of base unit prices
- Example: Macaronis showing CHF 3.95 instead of CHF 1.90
- Created plan for future price validation feature

#### Performance
- Successfully scraped 8 real pasta products in ~10 minutes
- 100% success rate for attempted products
- ~7 seconds per product including rate limiting
- API cost: ~$0.003 per product

### Configuration
- Added `SCRAPINGBEE_API_KEY` to environment variables
- Created `migros-categories.ts` with all 27 category URLs

### Known Issues (To Fix)
- Menu days not displayed in Monday-Sunday order
- Menu displayed in single column on desktop (should be grid)
- Recipe generation lacks variety (same recipes repeatedly)
- User preferences not strongly enforced in recipe selection
- Most ingredients not matched to products (need more scraped data)
- Some matched products still have 404 URLs

### Next Steps
- Fix menu display layout and day ordering
- Run full priority category scraping (~570 products)
- Implement price validation for multi-pack detection
- Improve ingredient to product matching algorithm
- Set up cron jobs for automated daily scraping

---

## [Previous] - 2025-01-04

### Added
- Expanded Swiss product database to 255+ items
- Playwright scraper with anti-detection features
- Scheduled scraping system with category rotation
- Session capture tools for debugging
- Migros API wrapper integration attempts

### Changed
- Removed 248 fake product URLs from database
- Updated scraping strategy from search to category-based

### Fixed
- Product URL format issues
- Database schema migrations

---

## [MVP Complete] - 2024-12-30

### Core Features Implemented
- User preferences system with Swiss context
- AI menu generation using Claude
- Shopping list with product matching
- French language interface
- Budget tracking in CHF
- Migros product integration

### Database
- Neon PostgreSQL configured
- All tables created and tested
- Sample data populated

### UI/UX
- Complete user flow from preferences to shopping list
- Responsive design with Tailwind CSS
- Loading states and error handling