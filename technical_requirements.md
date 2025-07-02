# Technical Requirements Document (TRD)
## SwissMenu AI - Smart Weekly Menu Planner

---

## 🏗️ System Architecture

### Application Structure
```
├── Frontend (Next.js 14)
│   ├── Pages & Components
│   ├── State Management (Zustand)
│   └── UI/UX (Tailwind CSS)
├── Backend (Next.js API Routes)
│   ├── Authentication (NextAuth.js)
│   ├── Database Operations (Prisma)
│   └── External API Integration
├── Database (PostgreSQL via Neon)
│   ├── User Management
│   ├── Recipe Storage
│   └── Product Catalog
└── External Services
    ├── LLM API (OpenAI GPT-4)
    ├── Migros Product API
    └── Deployment (Vercel)
```

## 📦 Technology Stack

### Core Framework
- **Frontend/Backend**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 18+
- **Package Manager**: npm or pnpm

### Database & ORM
- **Database**: PostgreSQL 15+
- **Hosting**: Neon (serverless PostgreSQL)
- **ORM**: Prisma 5.x
- **Migrations**: Prisma Migrate

### Authentication & Security
- **Auth Provider**: NextAuth.js v5
- **Session Management**: JWT + Database sessions
- **Password Hashing**: bcrypt
- **CSRF Protection**: Built-in Next.js protection

### Frontend Technologies
- **Styling**: Tailwind CSS v3.4+
- **Components**: Headless UI + Custom components
- **Forms**: React Hook Form + Zod validation
- **State Management**: Zustand
- **Icons**: Lucide React
- **Animation**: Framer Motion (if needed)

### Backend Technologies
- **API Routes**: Next.js 14 App Router
- **Validation**: Zod schemas
- **Rate Limiting**: @upstash/ratelimit
- **Caching**: Next.js built-in + Redis (Upstash)

### External APIs
- **LLM Provider**: OpenAI GPT-4 API
- **Web Scraping**: Puppeteer or Playwright
- **HTTP Client**: Fetch API + custom wrappers

### Deployment & Infrastructure
- **Hosting**: Vercel
- **Domain**: Custom domain or Vercel subdomain
- **CDN**: Vercel Edge Network
- **Analytics**: Vercel Analytics
- **Monitoring**: Vercel Error Tracking

## 🗄️ Database Schema

### Core Tables

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  people_count INTEGER DEFAULT 2,
  meals_per_day INTEGER DEFAULT 3,
  budget_chf INTEGER,
  dietary_restrictions TEXT[],
  cuisine_preferences TEXT[],
  cooking_skill_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions JSONB,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 4,
  cuisine_type VARCHAR(100),
  difficulty_level VARCHAR(50),
  nutritional_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ingredients
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(50),
  migros_product_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recipe ingredients junction
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  quantity DECIMAL(8,2),
  unit VARCHAR(50),
  notes VARCHAR(255)
);

-- Weekly menus
CREATE TABLE weekly_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE,
  menu_data JSONB, -- Stores the complete menu structure
  total_budget_chf DECIMAL(8,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Migros products
CREATE TABLE migros_products (
  id VARCHAR(100) PRIMARY KEY, -- Migros product ID
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  price_chf DECIMAL(8,2),
  unit VARCHAR(50),
  category VARCHAR(255),
  url VARCHAR(500),
  image_url VARCHAR(500),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Shopping lists
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_menu_id UUID REFERENCES weekly_menus(id) ON DELETE CASCADE,
  items JSONB, -- Array of shopping items with quantities
  total_price_chf DECIMAL(8,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 API Specifications

### Authentication Endpoints
```typescript
// User authentication
POST /api/auth/signin
POST /api/auth/signup
POST /api/auth/signout
GET  /api/auth/session
```

### User Management
```typescript
// User preferences
GET    /api/user/preferences
PUT    /api/user/preferences
DELETE /api/user/account

// User profile
GET    /api/user/profile
PUT    /api/user/profile
```

### Menu Generation
```typescript
// Generate weekly menu
POST /api/menus/generate
{
  preferences: UserPreferences,
  weekStartDate: string,
  regenerateDay?: string[]
}

// Retrieve user menus
GET /api/menus?limit=10&offset=0

// Update specific meals
PUT /api/menus/:menuId
PATCH /api/menus/:menuId/day/:day/meal/:meal
```

### Shopping Lists
```typescript
// Generate shopping list
POST /api/shopping/generate/:menuId

// Retrieve shopping lists
GET /api/shopping/:listId

// Update shopping list
PUT /api/shopping/:listId
```

### Product Management
```typescript
// Search products
GET /api/products/search?query=pasta&category=grains

// Get product details
GET /api/products/:productId

// Sync with Migros (admin)
POST /api/admin/products/sync
```

## 🕷️ Migros Integration Specifications

### Web Scraping Strategy
```typescript
// Product extraction configuration
const MIGROS_CONFIG = {
  baseUrl: 'https://www.migros.ch',
  selectors: {
    productCard: '.product-card',
    productName: '.name',
    productPrice: '.price',
    productLink: 'a',
    productId: (element) => element.id,
    productDescription: (element) => element.getAttribute('aria-label')
  },
  categories: [
    '/fr/category/pates-condiments-conserves/pates-riz-semoules-feculents/pates-alimentaires',
    '/fr/category/viande-poisson/viande-fraiche',
    '/fr/category/fruits-legumes/legumes-frais',
    // ... additional categories
  ],
  rateLimit: {
    requestsPerSecond: 1,
    concurrent: 2
  }
};
```

### Product Sync Process
1. **Category Crawling**: Systematically crawl each product category
2. **Data Extraction**: Use confirmed selectors to extract product data
3. **Database Update**: Upsert products with price and availability updates
4. **Error Handling**: Retry failed requests with exponential backoff
5. **Rate Limiting**: Respect Migros servers with appropriate delays

## 🤖 LLM Integration

### Menu Generation Prompt Structure
```typescript
const MENU_GENERATION_PROMPT = `
You are a Swiss culinary expert creating weekly meal plans.

User Preferences:
- People: {peopleCount}
- Budget: CHF {budget} per week
- Dietary restrictions: {restrictions}
- Cuisine preferences: {cuisines}
- Cooking skill: {skill}

Available Products: {availableProducts}

Generate a 7-day meal plan with:
1. Balanced nutrition across the week
2. Variety in cuisines and cooking methods
3. Budget-conscious ingredient selection
4. Realistic portions for {peopleCount} people
5. Consideration for Swiss seasonal ingredients

Response format: JSON with day/meal structure
`;
```

### Response Processing
- Parse LLM JSON responses
- Validate meal structure
- Match ingredients to Migros products
- Calculate total costs
- Handle generation errors gracefully

## 🚦 Performance Requirements

### Response Times
- **Page Load**: < 2 seconds (First Contentful Paint)
- **Menu Generation**: < 15 seconds for complete weekly plan
- **Shopping List Creation**: < 3 seconds
- **Product Search**: < 1 second for results

### Scalability Targets
- **Concurrent Users**: 100+ simultaneous users
- **Database Queries**: < 500ms for complex joins
- **API Rate Limits**: 1000 requests/hour per user
- **Data Storage**: 10GB database capacity initially

## 🔒 Security Requirements

### Data Protection
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Input Validation**: Strict validation on all user inputs
- **SQL Injection Prevention**: Parameterized queries via Prisma
- **XSS Prevention**: Content Security Policy headers

### API Security
- **Authentication Required**: All user-specific endpoints require auth
- **Rate Limiting**: Prevent abuse with request throttling
- **CORS Configuration**: Restrict origins appropriately
- **Error Handling**: No sensitive data in error responses

## 🧪 Testing Strategy

### Unit Testing
- **Framework**: Jest + React Testing Library
- **Coverage**: > 80% code coverage for core business logic
- **Mock Strategy**: Mock external APIs and database calls

### Integration Testing
- **API Testing**: Test all endpoints with realistic data
- **Database Testing**: Test complex queries and migrations
- **External Service Testing**: Mock Migros and LLM APIs

### End-to-End Testing
- **Framework**: Playwright
- **Critical Paths**: Complete user flow from signup to shopping list
- **Browser Coverage**: Chrome, Firefox, Safari

## 📱 Mobile Responsiveness

### Breakpoints
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: 1024px+

### Mobile-First Features
- Touch-friendly interface elements
- Optimized shopping list for mobile use
- Quick menu regeneration on mobile
- Offline shopping list access

## 🚀 Deployment Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.com"

# External APIs
OPENAI_API_KEY="sk-..."
MIGROS_API_RATE_LIMIT="1000"

# App Configuration
NODE_ENV="production"
APP_ENV="production"
```

### Vercel Configuration
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["fra1"]
}
```

## 📊 Monitoring & Analytics

### Key Metrics to Track
- **User Engagement**: Menu generations per user per week
- **Performance**: API response times and error rates
- **Business**: Conversion from menu generation to shopping list creation
- **Technical**: Database query performance and external API reliability

### Error Tracking
- **Client Errors**: JavaScript errors and user experience issues
- **Server Errors**: API failures and database connection issues
- **External Service Errors**: LLM API and Migros scraping failures

---

*This technical specification serves as the definitive guide for implementation. All code should conform to these requirements and patterns.*