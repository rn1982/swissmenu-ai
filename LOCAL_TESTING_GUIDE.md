# Local Testing Guide for SwissMenu AI

## Quick Start

To start your local development environment, simply run:

```bash
./start-local.sh
```

This script will:
- Install dependencies if needed
- Check for environment variables
- Kill any processes blocking port 3000
- Generate Prisma client
- Start the Next.js development server

## Manual Start

If you prefer to start manually:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Common Issues & Solutions

### 1. "localhost refused to connect"

**Cause**: The development server is not running.

**Solution**: 
```bash
npm run dev
```

### 2. Port 3000 is already in use

**Solution**:
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Then start the dev server
npm run dev
```

### 3. Database connection errors

**Solution**:
1. Check your `.env.local` file has the correct DATABASE_URL
2. Ensure your Neon database is active
3. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

### 4. Module not found errors

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### 5. Environment variables not loading

**Solution**:
1. Ensure `.env.local` exists with all required variables:
   - DATABASE_URL
   - DIRECT_URL
   - ANTHROPIC_API_KEY
   - SCRAPINGBEE_API_KEY
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL

2. Restart the development server after changing env variables

## Testing the Shopping List Feature

1. Start the dev server: `./start-local.sh`
2. Navigate to http://localhost:3000
3. Set your preferences
4. Generate a menu
5. Generate a shopping list

## Useful Commands

```bash
# View logs
npm run dev

# Open database GUI
npx prisma studio

# Run database migrations
npx prisma migrate dev

# Check TypeScript errors
npx tsc --noEmit

# Run linter
npm run lint
```

## Tips for Smooth Local Development

1. **Always start fresh**: If you haven't used the project in a while, run:
   ```bash
   npm install
   npx prisma generate
   ```

2. **Keep your database in sync**:
   ```bash
   npx prisma db push
   ```

3. **Monitor the console**: The terminal running `npm run dev` shows helpful error messages

4. **Use the Network URL**: If localhost doesn't work, try the network URL shown in the console (e.g., http://192.168.0.102:3000)

## Need Help?

If you continue to have issues:
1. Check the terminal for error messages
2. Ensure all environment variables are set
3. Try clearing Next.js cache: `rm -rf .next`
4. Restart your computer (sometimes helps with port issues)