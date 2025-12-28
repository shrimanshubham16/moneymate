#!/bin/bash

# MoneyMate Deployment Script
# This script helps deploy MoneyMate to Railway + Vercel

echo "🚀 MoneyMate Deployment Helper"
echo "================================"
echo ""

# Check if required tools are installed
check_tool() {
  if ! command -v $1 &> /dev/null; then
    echo "❌ $1 not found. Installing..."
    return 1
  else
    echo "✅ $1 is installed"
    return 0
  fi
}

echo "📋 Checking prerequisites..."
echo ""

# Check Node.js
if check_tool node; then
  echo "   Node version: $(node --version)"
fi

# Check npm
if check_tool npm; then
  echo "   npm version: $(npm --version)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Deployment Options
echo "Choose your deployment option:"
echo ""
echo "1. Railway (Backend) + Vercel (Frontend) - Recommended"
echo "2. Render (Backend) + Netlify (Frontend)"
echo "3. Manual setup instructions"
echo "4. Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
  1)
    echo ""
    echo "🚂 Railway + Vercel Deployment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Installing CLI tools..."
    echo ""
    
    # Install Railway CLI
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
    
    # Install Vercel CLI
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    
    echo ""
    echo "✅ CLI tools installed!"
    echo ""
    echo "📖 Next steps:"
    echo ""
    echo "1. Deploy Backend to Railway:"
    echo "   cd backend"
    echo "   railway login"
    echo "   railway init"
    echo "   railway up"
    echo ""
    echo "2. Deploy Frontend to Vercel:"
    echo "   cd ../web"
    echo "   vercel login"
    echo "   vercel"
    echo ""
    echo "3. Get your Railway URL and update Vercel env:"
    echo "   Add VITE_API_URL=https://your-backend.railway.app"
    echo ""
    echo "See QUICK-DEPLOY.md for detailed instructions!"
    ;;
    
  2)
    echo ""
    echo "🎨 Render + Netlify Deployment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
    
    echo ""
    echo "✅ CLI tools installed!"
    echo ""
    echo "📖 Next steps:"
    echo ""
    echo "1. Deploy Backend to Render:"
    echo "   - Go to https://render.com"
    echo "   - Connect GitHub repo"
    echo "   - Select 'backend' folder"
    echo "   - Add environment variables"
    echo ""
    echo "2. Deploy Frontend to Netlify:"
    echo "   cd web"
    echo "   netlify login"
    echo "   netlify init"
    echo "   netlify deploy --prod"
    echo ""
    ;;
    
  3)
    echo ""
    echo "📖 Manual Setup Instructions"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📄 Documentation files created:"
    echo ""
    echo "  - QUICK-DEPLOY.md         : Step-by-step deployment guide"
    echo "  - DEPLOYMENT-GUIDE.md     : Comprehensive deployment docs"
    echo "  - DEPLOYMENT-OPTIONS.md   : Compare hosting platforms"
    echo ""
    echo "📂 Configuration files created:"
    echo ""
    echo "  - backend/railway.json    : Railway configuration"
    echo "  - backend/Procfile        : Process definition"
    echo "  - web/vercel.json         : Vercel configuration"
    echo ""
    echo "Read these files for detailed instructions!"
    ;;
    
  4)
    echo "Goodbye! 👋"
    exit 0
    ;;
    
  *)
    echo "Invalid choice. Exiting..."
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "📚 Read the deployment guides for more information:"
echo "   - cat QUICK-DEPLOY.md"
echo "   - cat DEPLOYMENT-OPTIONS.md"
echo ""
echo "Good luck with your deployment! 🚀"
echo ""

