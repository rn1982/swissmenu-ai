# Claude Development Guide for SwissMenu AI

## 🎯 Project Overview
**SwissMenu AI** is an intelligent web application that generates personalized weekly meal plans and creates optimized shopping lists with direct Migros product links, eliminating the pain of meal planning and grocery shopping in Switzerland.

## 🚀 Quick Start Commands

### Development Server
```bash
npm run dev    # Start development server at http://localhost:3000
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

### Database Commands
```bash
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev      # Run migrations
npx prisma generate        # Generate Prisma client
npx prisma db push         # Push schema to database
npx prisma db seed         # Seed database
```

## 📁 Project Structure

```
swissmenu-ai/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # User dashboard
│   │   ├── menu/           # Menu generation & display
│   │   ├── preferences/    # User preferences setup
│   │   └── shopping/       # Shopping lists
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   ├── forms/         # Form components
│   │   └── layout/        # Layout components
│   ├── lib/               # Utility libraries
│   │   ├── db.ts          # Database connection
│   │   ├── anthropic.ts   # Claude API integration
│   │   ├── openai.ts      # OpenAI API integration
│   │   └── migros.ts      # Migros scraping utilities
│   ├── types/             # TypeScript type definitions
│   ├── hooks/             # Custom React hooks
│   └── constants/         # App constants
├── prisma/                # Database schema & migrations
└── public/                # Static assets
```

## 🔧 Development Workflow with Claude

### Phase 1: Foundation Setup ✅
**Status**: Complete - Basic Next.js app with Tailwind CSS is running

**Current State**:
- ✅ Next.js 14 with TypeScript
- ✅ Tailwind CSS configured
- ✅ Basic routing structure
- ✅ Package.json with all dependencies
- ✅ Prisma schema defined
- ✅ Development server running

### Phase 2: Database & User Preferences Setup ✅
**Status**: Complete - Neon database connected and user preferences system implemented

**Current State**:
- ✅ Neon PostgreSQL database connected and configured
- ✅ Database migration completed (all tables created)
- ✅ User preferences form with comprehensive options:
  - Number of people (1-8)
  - Meals per day (1-3)
  - Weekly budget in CHF
  - Dietary restrictions (8 options)
  - Cuisine preferences (8 options)
  - Cooking skill level (beginner/intermediate/advanced)
- ✅ API endpoint `/api/preferences` with GET/POST methods
- ✅ Complete user flow: Homepage → Preferences → Menu placeholder
- ✅ French language interface with Swiss context (CHF currency)
- ✅ Database connection tested and working

**Implemented Files**:
- `src/app/preferences/page.tsx` - Comprehensive preferences form
- `src/app/api/preferences/route.ts` - API with validation
- `src/app/menu/page.tsx` - Menu placeholder page
- `.env.local` - Database connection strings configured

### Phase 3: Migros Integration ✅
**Status**: Complete - Enhanced scraper with smart fallback system implemented

**Current State**:
- ✅ Enhanced anti-detection scraper (`src/lib/migros-enhanced.ts`)
- ✅ Smart fallback product database (30 Swiss products)
- ✅ Multi-category support (pasta, meat, vegetables, dairy)
- ✅ Real Migros product URLs and CHF pricing
- ✅ API endpoint `/api/products/enhanced-sync` for product management
- ✅ Intelligent product matching algorithm
- ✅ Automatic fallback when scraping faces detection

**Implemented Files**:
- `src/lib/migros-enhanced.ts` - Enhanced scraper with fallback
- `src/app/api/products/enhanced-sync/route.ts` - Product sync management
- `src/lib/product-matching.ts` - Intelligent ingredient matching

### Phase 4: LLM Menu Generation ✅
**Status**: Complete - Claude AI integration with Swiss context and retry logic

**Current State**:
- ✅ Claude API integration with Anthropic SDK
- ✅ Swiss-focused prompt engineering in French
- ✅ Menu generation API (`/api/menu/generate`) with retry logic
- ✅ Realistic CHF pricing and Swiss specialties
- ✅ Budget-aware meal planning
- ✅ Complete menu display interface
- ✅ Database storage for generated menus
- ✅ Error handling for API overload scenarios

**Implemented Files**:
- `src/app/api/menu/generate/route.ts` - AI menu generation with retry
- `src/app/menu/page.tsx` - Complete menu display interface
- `src/lib/anthropic.ts` - Claude API configuration
- `src/app/api/debug/route.ts` - System health monitoring

### Phase 5: Shopping List Generation ✅
**Status**: Complete - Intelligent ingredient-to-product matching and organized lists

**Current State**:
- ✅ Automated ingredient extraction from AI menus
- ✅ Smart ingredient-to-product matching with fuzzy search
- ✅ Shopping list API (`/api/shopping/generate`)
- ✅ Organized by categories (Fruits & Légumes, Viande & Poisson, etc.)
- ✅ Quantity calculation based on people count
- ✅ Budget tracking and savings calculation
- ✅ Direct Migros product links for seamless shopping
- ✅ Mobile-optimized shopping interface

**Implemented Files**:
- `src/app/api/shopping/generate/route.ts` - Shopping list generation
- `src/app/shopping/page.tsx` - Shopping list display
- `src/lib/product-matching.ts` - Advanced matching algorithms

## 🎉 **MVP STATUS: PRODUCTION READY**

### Core Features Working ✅
- **User Preferences**: Complete setup with Swiss context
- **AI Menu Generation**: Claude-powered with Swiss specialties  
- **Product Database**: 30 real Swiss products with fallback system
- **Shopping Lists**: Intelligent matching with Migros integration
- **French Interface**: Complete Swiss user experience
- **Budget Management**: CHF pricing throughout

### System Health ✅
- **Database**: Neon PostgreSQL connected and operational
- **APIs**: All endpoints tested and working
- **Error Handling**: Retry logic and comprehensive error states
- **Performance**: Smart caching and optimized queries

## 🤖 Working with Claude Code

### Effective Prompts for Development

**For New Features**:
```
"Help me implement [specific feature] for the SwissMenu AI project. 
I need this to work with our existing Prisma schema and Next.js 14 setup.
Consider Swiss user context and French language support."
```

**For Bug Fixes**:
```
"I'm getting this error: [error message]
This is happening in [specific file/component].
The expected behavior is: [description]
Here's the relevant code: [code snippet]"
```

**For Code Review**:
```
"Review this implementation for the SwissMenu AI project:
[code]
Check for TypeScript errors, performance issues, and alignment with our Swiss/French user requirements."
```

### Claude Development Best Practices

1. **Always Specify Context**
   - Mention you're working on SwissMenu AI
   - Include relevant file paths
   - Reference existing code patterns

2. **Ask for Complete Solutions**
   - Request full file implementations
   - Ask for related API routes
   - Get corresponding TypeScript types

3. **Consider Swiss Requirements**
   - French language support
   - CHF currency formatting
   - Migros product integration
   - Swiss dietary preferences

## 📋 Development Status

### Week 1: Foundation ✅ COMPLETE
- [x] Neon database setup and connection
- [x] User preferences form implementation  
- [x] Basic UI components library
- [x] Prisma schema and migrations
- [x] Next.js 14 with TypeScript setup

### Week 2: Core Features ✅ COMPLETE
- [x] Enhanced Migros scraper with smart fallback
- [x] Menu generation with Claude AI integration
- [x] Recipe storage and management via JSON
- [x] User preferences persistence
- [x] Swiss context and French language

### Week 3: Shopping Lists ✅ COMPLETE
- [x] Ingredient extraction from AI menus
- [x] Advanced product matching algorithm
- [x] Shopping list generation with categories
- [x] Migros product links integration
- [x] Budget tracking and savings calculation

### Week 4: Production Polish ✅ COMPLETE
- [x] Error handling and retry logic
- [x] System health monitoring
- [x] Performance optimization
- [x] API testing and validation
- [x] Complete user flow testing

## 🚀 **NEXT PHASE: Enhancement & Scale**

### Priority 1: Enhanced Scraping ✅ MAJOR PROGRESS
**Completed (Jan 2025):**
- [x] Expanded product database to 255+ items across 9 categories
- [x] Implemented Playwright scraper with API interception
- [x] Created scheduled scraper script for 3-5 AM runs
- [x] Added category rotation system (one category per run)
- [x] Implemented proxy support configuration
- [x] Built analytics and monitoring system

**Still Needed (Manual Setup):**
- [ ] Install cron jobs for automatic 3-5 AM execution
- [ ] Create logs directory: `mkdir -p logs`
- [ ] Configure proxies if needed (see docs/PROXY_SETUP.md)
- [ ] Set up PM2 for production scheduling

### Priority 2: User Experience
- [ ] Menu editing and customization
- [ ] Meal history and favorites
- [ ] Shopping list sharing and export
- [ ] Mobile app PWA features
- [ ] User accounts and authentication

### Priority 3: Business Features
- [ ] Multi-retailer support (Coop, Denner)
- [ ] Nutrition tracking and analysis
- [ ] Seasonal menu suggestions
- [ ] Cost optimization algorithms
- [ ] API for third-party integrations

## 🔍 Debugging with Claude

### Common Issues & Solutions

**Database Connection Problems**:
```bash
# Ask Claude to help diagnose:
# 1. Check .env.local configuration
# 2. Verify Neon database status
# 3. Test connection string format
# 4. Check Prisma client generation
```

**API Route Issues**:
```typescript
// Claude can help with:
// - Next.js 14 App Router patterns
// - Request/response handling
// - Error boundary implementation
// - TypeScript type issues
```

**LLM Integration Problems**:
```typescript
// Get Claude's help for:
// - Prompt engineering optimization
// - Response parsing and validation
// - Rate limiting and error handling
// - Cost optimization strategies
```

## 🚀 Production Deployment

### Vercel Deployment with Claude
```bash
# Ask Claude to help with:
# 1. Vercel project setup
# 2. Environment variables configuration
# 3. Build optimization
# 4. Performance monitoring setup
```

### Environment Variables Checklist ✅
```bash
# Development .env.local (verified working):
DATABASE_URL=          # Neon PostgreSQL database ✅
DIRECT_URL=           # Neon direct connection ✅
ANTHROPIC_API_KEY=    # Claude API key ✅ WORKING
OPENAI_API_KEY=       # OpenAI API key (optional)
NEXTAUTH_SECRET=      # Random secret for sessions
NEXTAUTH_URL=         # Application domain

# System Status Check:
# curl http://localhost:3000/api/debug
```

## 🤖 **Enhanced Scraping System**

### Product Database Status
- **255 products** across 9 categories (pasta, meat, vegetables, dairy, bakery, beverages, frozen, pantry, snacks)
- **Swiss specialties** included: Aromat, Zweifel, Toblerone, Rivella, etc.
- **Accurate CHF pricing** with real Migros URLs

### Scheduled Scraping Setup
```bash
# 1. Create logs directory
mkdir -p logs

# 2. Test the scraper manually
npm run scrape:scheduled          # Run one category
npm run scrape:scheduled stats    # View statistics
npm run scrape:scheduled reset    # Reset stats

# 3. Set up cron jobs (run crontab -e and add):
0 3 * * * cd /path/to/swissmenu-ai && npm run scrape:scheduled >> logs/cron.log 2>&1
0 4 * * * cd /path/to/swissmenu-ai && npm run scrape:scheduled >> logs/cron.log 2>&1
0 5 * * * cd /path/to/swissmenu-ai && npm run scrape:scheduled >> logs/cron.log 2>&1

# 4. (Optional) Configure proxy
# Add to .env.local:
PROXY_URL=http://swiss-proxy.com:8080
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_password
```

### Available Scripts
```bash
npm run test:db              # Test product database (255 items)
npm run test:scraper         # Test Playwright scraper
npm run scrape:scheduled     # Run scheduled scraping
```

## 🧪 **Testing Guide**

### Quick Health Check
```bash
# 1. System health
curl http://localhost:3000/api/debug

# 2. Product database status  
curl http://localhost:3000/api/products/enhanced-sync

# 3. Available user preferences
curl http://localhost:3000/api/preferences/list
```

### Full User Flow Test
1. **Web Interface**: http://localhost:3000
2. **Set Preferences**: Configure family size, budget, dietary needs
3. **Generate Menu**: AI creates Swiss meal plan in French
4. **Shopping List**: Converts ingredients to Migros products
5. **Budget Tracking**: Shows cost breakdown and savings

### API Testing
```bash
# Generate AI menu (use real preferences ID)
curl -X POST http://localhost:3000/api/menu/generate \
  -H "Content-Type: application/json" \
  -d '{"userPreferencesId": "YOUR_ID"}'

# Generate shopping list
curl -X POST http://localhost:3000/api/shopping/generate \
  -H "Content-Type: application/json" \
  -d '{"menuData": MENU_JSON, "peopleCount": 2}'
```

## 📚 Resources & Documentation

### Key Documentation Links
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)

### Swiss-Specific Resources
- [Migros Website](https://www.migros.ch) - Product catalog
- [Swiss Dietary Guidelines](https://www.sge-ssn.ch/) - Nutrition info
- [Swiss Seasonal Produce](https://www.blw.admin.ch/) - Agriculture data

## 💡 Pro Tips for Claude Collaboration

1. **Be Specific About Swiss Context**
   - Always mention Swiss users and French language
   - Reference CHF currency and Migros integration
   - Consider Swiss dietary preferences and seasonal ingredients

2. **Ask for Progressive Enhancement**
   - Start with basic functionality
   - Ask for mobile improvements
   - Request accessibility enhancements
   - Get performance optimizations

3. **Request Testing Scenarios**
   - Ask Claude for edge case testing
   - Get user flow validation
   - Request error scenario handling
   - Validate Swiss-specific requirements

4. **Maintain Code Quality**
   - Ask for TypeScript strict mode compliance
   - Request ESLint rule adherence
   - Get code review and optimization suggestions
   - Ensure proper error handling

---

**Remember**: You're building a Swiss-focused application with French language support. Always consider the local context, currency (CHF), and Migros integration when working with Claude on this project.

Start with the database setup and user preferences, then progressively build the menu generation and shopping list features. Claude is here to help you every step of the way! 