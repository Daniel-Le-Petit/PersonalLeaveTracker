#!/bin/bash

# Leave Tracker - Deployment Script for Render
# This script helps prepare and deploy the application to Render

echo "🚀 Leave Tracker - Deployment Script"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not initialized. Please run 'git init' first."
    exit 1
fi

# Check if we have uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "   Please commit your changes before deploying:"
    echo "   git add ."
    echo "   git commit -m 'Prepare for deployment'"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the application
echo "📦 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found. Please create the deployment configuration."
    exit 1
fi

echo ""
echo "🎯 Deployment Configuration:"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: npm start"
echo "   - Port: 10000"
echo "   - Environment: Production"
echo ""

echo "📋 Next Steps:"
echo "1. Push your code to GitHub:"
echo "   git push origin main"
echo ""
echo "2. Deploy on Render:"
echo "   - Go to https://render.com"
echo "   - Connect your GitHub repository"
echo "   - Select 'Web Service'"
echo "   - Use the configuration from render.yaml"
echo ""
echo "3. Set Environment Variables:"
echo "   - NODE_ENV=production"
echo "   - PORT=10000"
echo ""
echo "4. Important Notes:"
echo "   - The app uses IndexedDB for local storage"
echo "   - Users should export their data regularly"
echo "   - No server-side data persistence"
echo ""

echo "🔗 Useful Links:"
echo "   - Render Dashboard: https://dashboard.render.com"
echo "   - Deployment Guide: DEPLOYMENT.md"
echo "   - GitHub Repository: https://github.com/Daniel-Le-Petit/leave-tracker"
echo ""

echo "✅ Deployment script completed!"
echo "   Your application is ready for deployment on Render."
