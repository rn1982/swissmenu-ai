# SwissMenu AI - Smart Weekly Menu Planner

## 🎯 Project Vision

An intelligent web application that generates personalized weekly meal plans and creates optimized shopping lists with direct Migros product links, eliminating the pain of meal planning and grocery shopping in Switzerland.

## 🚀 Core Value Proposition

**Problem Solved:**
- ❌ "What should I cook this week?" (decision fatigue)
- ❌ Spending 60+ minutes wandering supermarket aisles
- ❌ Forgetting ingredients, making multiple trips
- ❌ Budget overruns and food waste

**Solution Delivered:**
- ✅ Complete weekly menus in 5 minutes
- ✅ Smart shopping lists with direct product links
- ✅ 80% reduction in meal planning time
- ✅ 15-20% grocery budget savings through optimization

## 📋 MVP Feature Set

### Core Features (Phase 1)
1. **User Preferences Setup**
   - Number of people (1-10)
   - Meals per day (1-3)
   - Dietary restrictions (vegetarian, vegan, gluten-free, etc.)
   - Budget constraints (CHF/week)
   - Cuisine preferences (Swiss, Italian, Asian, etc.)
   - Cooking skill level (beginner, intermediate, advanced)

2. **AI Menu Generation**
   - LLM-powered weekly meal planning
   - Swiss-focused recipes and ingredients
   - Nutritional balance optimization
   - Seasonal ingredient preferences
   - Budget-aware recipe selection

3. **Smart Shopping Lists**
   - Automatic ingredient aggregation
   - Portion calculation for selected group size
   - Direct Migros product matching
   - Price optimization and comparison
   - One-click product page access

4. **Migros Integration**
   - Real-time product catalog access
   - Price tracking and updates
   - Product availability checking
   - Swiss-specific brand recognition

### Enhanced Features (Phase 2)
- Recipe customization and substitutions
- Shopping history and preferences learning
- Nutritional analysis and tracking
- Meal prep scheduling and timing
- Multi-store comparison (Migros + Coop)

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI + custom components
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation

### Backend Stack
- **API**: Next.js API routes
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **LLM Integration**: OpenAI GPT-4 API

### External Services
- **Deployment**: Vercel
- **Database**: Neon PostgreSQL
- **File Storage**: Vercel Blob (for images)
- **Analytics**: Vercel Analytics
- **Monitoring**: Vercel Error Tracking

### Data Sources
- **Migros Product Catalog**: Web scraping + API discovery
- **Recipe Database**: LLM-generated + curated Swiss recipes
- **Nutritional Data**: Integrated nutrition APIs or databases

## 🎨 User Experience Flow

### 1. Onboarding (First Visit)
```
Landing Page → Preferences Setup → First Menu Generation → Review & Customize → Shopping List Creation
```

### 2. Weekly Planning (Returning Users)
```
Dashboard → Generate New Week → Review Menu → Modify if Needed → Export Shopping List → Shop with Links
```

### 3. Shopping Experience
```
Receive Shopping List → Open Migros Links → Add Products to Cart → Review & Checkout
```

## 📊 Success Metrics

### User Engagement
- Time from signup to first menu generation: < 10 minutes
- Weekly menu generation completion rate: > 80%
- Shopping list click-through rate: > 60%

### Time Savings
- Menu planning time: 60 minutes → 5 minutes (92% reduction)
- Shopping planning time: 30 minutes → 5 minutes (83% reduction)
- Total weekly food planning: 90 minutes → 10 minutes (89% reduction)

### Cost Optimization
- Budget adherence: 95% of generated lists within user budget
- Food waste reduction: Precise portion calculations
- Price optimization: Always suggest best value products

## 🔒 Security & Compliance

### Data Protection
- GDPR compliance for Swiss/EU users
- Secure user data handling
- No storage of personal dietary information without consent
- Encrypted data transmission

### API Security
- Rate limiting for external API calls
- Secure credential management
- Error handling and graceful fallbacks

## 🚀 Development Phases

### Phase 1: Core MVP (4-6 weeks)
- Basic user preferences and menu generation
- Migros product integration
- Simple shopping list creation
- User authentication and data persistence

### Phase 2: Enhancement (2-3 weeks)
- Advanced filtering and customization
- Price tracking and optimization
- Mobile responsiveness improvements
- Performance optimization

### Phase 3: Scale & Polish (2 weeks)
- Analytics implementation
- User feedback integration
- SEO optimization
- Production monitoring setup

## 💰 Business Model (Future)

### Freemium Approach
- **Free Tier**: 2 menu generations per week
- **Premium Tier** (CHF 9.90/month): Unlimited generation, advanced preferences, price tracking
- **Family Tier** (CHF 14.90/month): Multiple user profiles, shared shopping lists

### Revenue Streams
- Subscription fees
- Potential affiliate partnerships with Swiss retailers
- Premium recipe collections

## 🎯 Target Audience

### Primary Users
- **Busy Professionals** (25-45): Limited time for meal planning
- **Families** (30-50): Need to feed multiple people efficiently  
- **Health-Conscious Individuals** (25-60): Want balanced, planned nutrition

### Geographic Focus
- **Primary**: German-speaking Switzerland
- **Secondary**: French-speaking Switzerland  
- **Future**: Italian-speaking Switzerland, expansion to other countries

## 🔄 Competitive Analysis

### Direct Competitors
- **Eat This Much**: Meal planning but no Swiss focus
- **PlateJoy**: Custom meal plans but expensive
- **Mealime**: Simple but limited customization

### Competitive Advantages
- Swiss-specific product integration
- Direct retailer connectivity
- Local cuisine and ingredient focus
- Price-conscious optimization
- Seamless shopping experience

## 📈 Growth Strategy

### Launch Strategy
- Personal network and Swiss expat communities
- Reddit Swiss communities
- Local Facebook groups
- Content marketing (meal planning tips)

### Expansion Plan
- Additional Swiss retailers (Coop, Manor)
- Recipe sharing and community features
- Mobile app development
- B2B partnerships with Swiss companies

---

*This document serves as the master reference for the SwissMenu AI project. All development decisions should align with these core objectives and technical specifications.*