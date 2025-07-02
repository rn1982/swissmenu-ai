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

### Phase 3: Migros Integration

**Claude Tasks**:

1. **Product Scraping Implementation**
   ```typescript
   // Ask Claude to create:
   // - src/lib/migros.ts (scraping utilities)
   // - src/app/api/products/sync/route.ts
   // - Test with pasta category (confirmed working)
   ```

2. **Product Database Setup**
   ```bash
   # Claude can help with:
   # - MigrosProduct model updates
   # - Product sync scripts
   # - Error handling for scraping
   ```

### Phase 4: LLM Menu Generation

**Claude Integration Tasks**:

1. **Menu Generation API**
   ```typescript
   // Claude can implement:
   // - src/app/api/menu/generate/route.ts
   // - Prompt engineering for Swiss context
   // - Response validation and parsing
   ```

2. **Menu Display Components**
   ```typescript
   // Ask Claude to create:
   // - src/app/menu/page.tsx
   // - src/components/MenuDisplay.tsx
   // - Menu editing capabilities
   ```

### Phase 5: Shopping List Generation

**Claude Development Tasks**:

1. **Shopping List Logic**
   ```typescript
   // Claude can build:
   // - Ingredient extraction from recipes
   // - Product matching algorithm
   // - Price calculation and optimization
   ```

2. **Shopping Interface**
   ```typescript
   // Ask Claude for:
   // - Mobile-optimized shopping list
   // - Direct Migros product links
   // - List sharing and export features
   ```

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

## 📋 Development Checklist

### Week 1: Foundation
- [ ] Neon database setup and connection
- [ ] User preferences form implementation
- [ ] Basic UI components library
- [ ] Authentication system (optional for MVP)

### Week 2: Core Features
- [ ] Migros product scraping system
- [ ] Menu generation with LLM integration
- [ ] Recipe storage and management
- [ ] User preferences persistence

### Week 3: Shopping Lists
- [ ] Ingredient extraction from menus
- [ ] Product matching algorithm
- [ ] Shopping list generation
- [ ] Migros product links integration

### Week 4: Polish & Testing
- [ ] Mobile responsive design
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] User testing and feedback

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

### Environment Variables Checklist
```bash
# Production .env (ask Claude to verify):
DATABASE_URL=          # Neon production database
DIRECT_URL=           # Neon direct connection
OPENAI_API_KEY=       # OpenAI API key
ANTHROPIC_API_KEY=    # Claude API key
NEXTAUTH_SECRET=      # Random secret for sessions
NEXTAUTH_URL=         # Production domain
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