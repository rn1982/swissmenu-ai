# Development Setup Guide
## SwissMenu AI - Complete Day 1 Setup Instructions

---

## 🎯 Today's Objective
Set up the complete development environment and create the foundational project structure. By end of day, you'll have a working Next.js app with authentication and database connectivity.

---

## 🛠️ Tool Setup & Installation

### **1. Install Cursor with Claude Integration**

**Download & Install:**
```bash
# Download Cursor from https://cursor.sh/
# Follow installation for your OS
```

**Configure Claude Integration:**
1. Open Cursor
2. Go to Settings → Extensions
3. Enable Claude integration
4. Add your Anthropic API key (if you have one)

**Alternative: Use your preferred editor with Claude access**

### **2. Node.js & Package Manager Setup**
```bash
# Install Node.js 18+ (if not already installed)
# Download from: https://nodejs.org/

# Verify installation
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# Optional: Install pnpm for faster package management
npm install -g pnpm
```

### **3. Git Configuration**
```bash
# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Generate SSH key for GitHub (if needed)
ssh-keygen -t ed25519 -C "your.email@example.com"
```

---

## 📦 Project Initialization

### **Step 1: Create Next.js Project**
```bash
# Create new Next.js project with TypeScript
npx create-next-app@latest swissmenu-ai --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Navigate to project directory
cd swissmenu-ai

# Open in Cursor
cursor .
```

### **Step 2: Install Core Dependencies**
```bash
# Install all required packages
npm install \
  @prisma/client prisma \
  @next-auth/prisma-adapter next-auth \
  @hookform/resolvers react-hook-form \
  @headlessui/react @heroicons/react \
  zod \
  openai \
  @anthropic-ai/sdk \
  zustand \
  date-fns \
  playwright

# Install development dependencies
npm install -D \
  @types/node \
  @types/react \
  @types/react-dom \
  typescript \
  tailwindcss \
  postcss \
  autoprefixer
```

### **Step 3: Environment Setup**
```bash
# Create environment file
touch .env.local

# Add to .env.local (you'll fill these in later)
cat > .env.local << 'EOF'
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# LLM APIs (you have both options)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Next.js
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# App Config
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
```

### **Step 4: Project Structure Setup**
```bash
# Create essential directories
mkdir -p src/{components,lib,hooks,types,constants}
mkdir -p src/components/{ui,forms,layout}
mkdir -p src/app/{api,auth,dashboard,preferences,menu,shopping}
mkdir -p prisma/{migrations,seed}
mkdir -p public/{images,icons}

# Create initial configuration files
touch src/lib/{db.ts,auth.ts,openai.ts,anthropic.ts,migros.ts}
touch src/types/{index.ts,user.ts,menu.ts,product.ts}
touch src/constants/{index.ts,migros.ts}
```

---

## 🗄️ Database Setup (Neon)

### **Step 1: Create Neon Database**
1. Go to [console.neon.tech](https://console.neon.tech)
2. Sign up/login with GitHub
3. Create new project: "swissmenu-ai"
4. Select region: Europe (closest to Switzerland)
5. Copy the connection string

### **Step 2: Configure Prisma**
```bash
# Initialize Prisma
npx prisma init

# Replace prisma/schema.prisma with our schema
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Simplified schema for MVP (no authentication tables needed initially)
model UserPreferences {
  id                 String   @id @default(cuid())
  // Since it's just for you initially, we can use a single user approach
  peopleCount        Int      @default(2)
  mealsPerDay        Int      @default(3) 
  budgetChf          Int?
  dietaryRestrictions String[]
  cuisinePreferences String[]
  cookingSkillLevel  String   @default("intermediate")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("user_preferences")
}

model Recipe {
  id               String @id @default(cuid())
  title            String
  description      String?
  instructions     Json
  prepTimeMinutes  Int?
  cookTimeMinutes  Int?
  servings         Int    @default(4)
  cuisineType      String?
  difficultyLevel  String?
  nutritionalInfo  Json?
  createdAt        DateTime @default(now())

  recipeIngredients RecipeIngredient[]
  @@map("recipes")
}

model Ingredient {
  id                String @id @default(cuid())
  name              String
  category          String?
  unit              String?
  migrosProductId   String?
  createdAt         DateTime @default(now())

  recipeIngredients RecipeIngredient[]
  @@map("ingredients")
}

model RecipeIngredient {
  id           String @id @default(cuid())
  recipeId     String
  ingredientId String
  quantity     Float
  unit         String?
  notes        String?

  recipe     Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredient Ingredient @relation(fields: [ingredientId], references: [id])

  @@map("recipe_ingredients")
}

model WeeklyMenu {
  id              String   @id @default(cuid())
  weekStartDate   DateTime
  menuData        Json     // Complete menu structure
  totalBudgetChf  Float?
  createdAt       DateTime @default(now())

  shoppingLists ShoppingList[]
  @@map("weekly_menus")
}

model MigrosProduct {
  id          String   @id // Migros product ID
  name        String
  brand       String?
  priceChf    Float?
  unit        String?
  category    String?
  url         String?
  imageUrl    String?
  ariaLabel   String?  // Full product description
  lastUpdated DateTime @default(now())

  @@map("migros_products")
}

model ShoppingList {
  id             String @id @default(cuid())
  weeklyMenuId   String
  items          Json   // Array of shopping items with quantities
  totalPriceChf  Float?
  createdAt      DateTime @default(now())

  weeklyMenu WeeklyMenu @relation(fields: [weeklyMenuId], references: [id], onDelete: Cascade)
  @@map("shopping_lists")
}
EOF
```

### **Step 3: Setup Database Connection**
```bash
# Add your Neon connection strings to .env.local
# DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
# DIRECT_URL="postgresql://username:password@host/database?sslmode=require"

# Generate Prisma client and run first migration
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🔧 Core Configuration Files

### **Step 1: Database Client Setup**
```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

### **Step 2: LLM Clients Setup**
```typescript
// src/lib/openai.ts
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// src/lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

### **Step 3: Basic Types**
```typescript
// src/types/index.ts
export interface UserPreferences {
  peopleCount: number
  mealsPerDay: number
  budgetChf?: number
  dietaryRestrictions: string[]
  cuisinePreferences: string[]
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced'
}

export interface MigrosProduct {
  id: string
  name: string
  brand?: string
  priceChf?: number
  unit?: string
  category?: string
  url?: string
  imageUrl?: string
  ariaLabel?: string
}

export interface WeeklyMenu {
  id: string
  weekStartDate: Date
  menuData: {
    [day: string]: {
      [meal: string]: {
        recipeName: string
        ingredients: string[]
        instructions: string[]
        prepTime?: number
        cookTime?: number
      }
    }
  }
  totalBudgetChf?: number
}
```

### **Step 4: French Constants**
```typescript
// src/constants/index.ts
export const DIETARY_RESTRICTIONS = [
  'Végétarien',
  'Végétalien', 
  'Sans gluten',
  'Sans lactose',
  'Sans noix',
  'Halal',
  'Casher'
] as const

export const CUISINE_PREFERENCES = [
  'Suisse',
  'Française',
  'Italienne',
  'Asiatique',
  'Méditerranéenne',
  'Mexicaine',
  'Indienne'
] as const

export const COOKING_SKILL_LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' }
] as const

export const MEAL_TYPES = [
  'Petit-déjeuner',
  'Déjeuner', 
  'Dîner',
  'Collation'
] as const
```

---

## 🚀 Initial App Structure

### **Step 1: Update Layout**
```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SwissMenu AI - Planificateur de menus intelligent',
  description: 'Générez des menus hebdomadaires personnalisés avec listes de courses Migros',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
}
```

### **Step 2: Create Homepage**
```typescript
// src/app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          SwissMenu AI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Votre planificateur de menus intelligent avec intégration Migros
        </p>
        <Link 
          href="/preferences"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Commencer
        </Link>
      </div>
    </div>
  )
}
```

### **Step 3: Test Database Connection**
```typescript
// src/app/api/test/route.ts
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test database connection
    await db.$connect()
    return NextResponse.json({ 
      message: 'Database connected successfully!',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    )
  }
}
```

---

## ✅ Day 1 Verification Checklist

### **Run These Commands to Test Everything:**
```bash
# 1. Install dependencies
npm install

# 2. Run database migration
npx prisma migrate dev

# 3. Generate Prisma client
npx prisma generate

# 4. Start development server
npm run dev

# 5. Test database connection
curl http://localhost:3000/api/test
```

### **Expected Results:**
- ✅ App loads at http://localhost:3000
- ✅ Database connection test returns success
- ✅ No TypeScript errors
- ✅ Tailwind CSS styling works
- ✅ French content displays correctly

### **Tomorrow's Preparation:**
- ✅ Get your OpenAI and/or Anthropic API keys ready
- ✅ Test the Migros scraping on the confirmed pasta URL
- ✅ Verify Neon database is accessible

---

## 🆘 Troubleshooting

### **Common Issues:**
1. **Database connection fails**: Check Neon connection string format
2. **TypeScript errors**: Ensure all dependencies installed correctly
3. **Port already in use**: Kill process on port 3000 or use different port
4. **Prisma migration fails**: Check database permissions and connection

### **Getting Help:**
- Use Claude in Cursor for code issues
- Check GitHub Issues for dependency problems
- Neon docs for database troubleshooting

**Once this setup is complete, you'll have a solid foundation to build the menu generation and Migros integration!**