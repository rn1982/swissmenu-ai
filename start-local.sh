#!/bin/bash

# SwissMenu AI Local Development Startup Script
# This script helps you quickly start the development environment

echo "🚀 Starting SwissMenu AI Development Environment..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "Please create .env.local with your environment variables"
    echo "You can copy from .env.local.example if it exists"
fi

# Kill any existing processes on port 3000
echo "🧹 Checking for processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Start the development server
echo "🎉 Starting Next.js development server..."
echo "📱 Your app will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev