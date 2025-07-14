# Vercel Deployment Guide for SwissMenu AI

## Environment Variables Setup

When deploying to Vercel, you need to configure the following environment variables in your Vercel project settings:

### Required Environment Variables

1. **DATABASE_URL** (Required)
   - Description: PostgreSQL connection string for your Neon database
   - Format: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`
   - Example: `postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`

2. **DIRECT_URL** (Required)
   - Description: Direct connection URL for Neon (used for migrations)
   - Format: Same as DATABASE_URL but with direct connection endpoint
   - Note: Neon provides both pooled and direct URLs - use the direct one here

3. **ANTHROPIC_API_KEY** (Required)
   - Description: API key for Claude AI integration
   - Get it from: https://console.anthropic.com/
   - Used for: Menu generation with AI

4. **OPENAI_API_KEY** (Optional)
   - Description: OpenAI API key for fallback AI services
   - Get it from: https://platform.openai.com/
   - Note: Currently optional, used as fallback

5. **NEXTAUTH_SECRET** (Required)
   - Description: Random secret for NextAuth.js session encryption
   - Generate with: `openssl rand -base64 32`
   - Security: Keep this secret and never commit to code

6. **NEXTAUTH_URL** (Required)
   - Description: Your application's base URL
   - Production: `https://your-app.vercel.app`
   - Preview: Vercel automatically sets this for preview deployments

7. **SCRAPINGBEE_API_KEY** (Required)
   - Description: API key for ScrapingBee web scraping service
   - Get it from: https://www.scrapingbee.com/
   - Used for: Real-time Migros product scraping

## Deployment Steps

### 1. Fork or Clone Repository
```bash
git clone https://github.com/your-username/swissmenu-ai.git
cd swissmenu-ai
```

### 2. Create Vercel Project
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login to Vercel
vercel login

# Create new project
vercel
```

### 3. Configure Environment Variables

#### Option A: Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add each variable listed above

#### Option B: Via Vercel CLI
```bash
# Add each environment variable
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add ANTHROPIC_API_KEY production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add SCRAPINGBEE_API_KEY production

# Optional
vercel env add OPENAI_API_KEY production
```

### 4. Deploy
```bash
# Deploy to production
vercel --prod

# Or push to your connected Git repository
git push origin main
```

## Post-Deployment Setup

### 1. Run Database Migrations
After deployment, you need to run Prisma migrations:

```bash
# Connect to your project
vercel env pull

# Run migrations
npx prisma migrate deploy
```

### 2. Verify Deployment
1. Visit your deployed URL
2. Check the system health endpoint: `https://your-app.vercel.app/api/debug`
3. Test the user flow:
   - Set preferences
   - Generate a menu
   - Create shopping list

### 3. Set Up Database Seeding (Optional)
If you want to populate your database with initial products:

```bash
# SSH into Vercel function or run locally with production env
npm run scrape:migros -- --test --limit 10
```

## Troubleshooting

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify Node.js version compatibility (18.x or higher)

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check if Neon database is active
- Ensure SSL mode is set to 'require'

### API Key Issues
- Verify all API keys are valid and have sufficient credits
- Check rate limits for each service
- Monitor usage in respective dashboards

### TypeScript Errors
The project uses custom build scripts to handle TypeScript issues:
- `build:vercel` script runs Prisma generation before Next.js build
- Utility scripts in `/src/scripts/` are excluded from build

## Environment Variables Reference

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| DATABASE_URL | ✅ | PostgreSQL connection string | Neon Dashboard |
| DIRECT_URL | ✅ | Direct database connection | Neon Dashboard |
| ANTHROPIC_API_KEY | ✅ | Claude AI API key | Anthropic Console |
| OPENAI_API_KEY | ❌ | OpenAI API key | OpenAI Platform |
| NEXTAUTH_SECRET | ✅ | Session encryption secret | Generate with openssl |
| NEXTAUTH_URL | ✅ | Application base URL | Your Vercel domain |
| SCRAPINGBEE_API_KEY | ✅ | Web scraping API key | ScrapingBee Dashboard |

## Security Notes

- Never commit `.env` files to version control
- Use Vercel's environment variable UI for sensitive data
- Rotate API keys regularly
- Monitor API usage to prevent unexpected charges

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Neon Database Docs](https://neon.tech/docs/introduction)