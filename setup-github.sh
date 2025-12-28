#!/bin/bash

# MoneyMate GitHub Setup Script
# Prepares the project for GitHub upload in one click!

echo "🚀 MoneyMate GitHub Setup"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if git is installed
echo "📋 Step 1: Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed!${NC}"
    echo "Install git: https://git-scm.com/downloads"
    exit 1
fi
echo -e "${GREEN}✅ Git installed${NC}"
echo ""

# Step 2: Create .gitignore if missing
echo "📋 Step 2: Creating .gitignore..."
if [ ! -f .gitignore ]; then
    cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Data files
data/
*.json
!package.json
!package-lock.json
!tsconfig.json
!vercel.json
!railway.json
!pubspec.yaml

# Logs
npm-debug.log*
yarn-debug.log*
logs/
*.log

# IDE
.vscode/
.idea/
*.swp
.DS_Store

# Mobile
*.iml
.gradle/
local.properties
.dart_tool/
.flutter-plugins
.pub-cache/
.pub/
build/
*.apk
*.ipa

# Misc
temp/
tmp/
GITIGNORE
    echo -e "${GREEN}✅ .gitignore created${NC}"
else
    echo -e "${YELLOW}⚠️  .gitignore already exists${NC}"
fi
echo ""

# Step 3: Check for sensitive data
echo "📋 Step 3: Checking for sensitive data..."
echo "Searching for potential secrets..."

SECRETS_FOUND=0

if grep -r "password.*=.*['\"]" --exclude-dir={node_modules,dist,build,.git} --exclude="*.md" . 2>/dev/null | grep -v "env.example" | grep -v "placeholder"; then
    echo -e "${RED}⚠️  Found hardcoded passwords!${NC}"
    SECRETS_FOUND=1
fi

if grep -r "secret.*=.*['\"]" --exclude-dir={node_modules,dist,build,.git} --exclude="*.md" . 2>/dev/null | grep -v "env.example" | grep -v "JWT_SECRET" | grep -v "your-"; then
    echo -e "${RED}⚠️  Found hardcoded secrets!${NC}"
    SECRETS_FOUND=1
fi

if [ -f backend/.env ] || [ -f web/.env ]; then
    echo -e "${RED}⚠️  Found .env files! Make sure they're in .gitignore${NC}"
    SECRETS_FOUND=1
fi

if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No sensitive data found${NC}"
else
    echo -e "${YELLOW}⚠️  Please review and remove sensitive data before uploading${NC}"
fi
echo ""

# Step 4: Create LICENSE
echo "📋 Step 4: Creating LICENSE..."
if [ ! -f LICENSE ]; then
    cat > LICENSE << 'LICENSE'
MIT License

Copyright (c) 2025 MoneyMate Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
LICENSE
    echo -e "${GREEN}✅ LICENSE created (MIT)${NC}"
else
    echo -e "${YELLOW}⚠️  LICENSE already exists${NC}"
fi
echo ""

# Step 5: Create main README.md
echo "📋 Step 5: Creating main README.md..."
if [ ! -f README.md ]; then
    cat > README.md << 'README'
# MoneyMate 💰

**Your Personal Finance Companion**

MoneyMate is a comprehensive personal finance management application that helps you track income, expenses, investments, and maintain financial health.

## ✨ Features

- 📊 **Income & Expense Tracking** - Monitor all your finances in one place
- 💰 **Investment Management** - Track SIPs, mutual funds, and investments
- 💳 **Credit Card Management** - Never miss a payment deadline
- 🏦 **Loan Tracking** - Auto-calculate EMIs and remaining tenure
- 🎯 **Financial Health Score** - Real-time health assessment
- 🤝 **Finance Sharing** - Manage household finances together
- 📱 **Mobile Responsive** - Works on all devices
- 🔒 **Secure** - Authentication, rate limiting, data persistence

## 🛠️ Tech Stack

### Backend
- Node.js + Express + TypeScript
- JWT Authentication
- File-based storage (PostgreSQL-ready)
- Rate limiting & CORS

### Frontend
- React + Vite + TypeScript
- React Router + Framer Motion
- Professional React Icons
- Responsive design

### Mobile
- Flutter
- Go Router for navigation
- Full feature parity

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Flutter (for mobile app)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev           # Starts on port 12022
```

### Frontend Setup
```bash
cd web
npm install
cp .env.example .env  # Configure API URL
npm run dev           # Starts on port 5173
```

### Mobile Setup
```bash
cd mobile
flutter pub get
flutter run
```

## 📦 Deployment

See [QUICK-DEPLOY.md](./QUICK-DEPLOY.md) for deployment instructions.

**Recommended Platforms:**
- Backend: Railway (Free $5 credit)
- Frontend: Vercel (Free unlimited)
- Mobile: Play Store ($25) / App Store ($99/yr)

## 📖 Documentation

- **[USER-GUIDE.md](./USER-GUIDE.md)** - Complete user manual
- **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** - Deployment instructions
- **[QUICK-DEPLOY.md](./QUICK-DEPLOY.md)** - 15-minute quick deploy
- **[SECURITY-PRIVACY.md](./SECURITY-PRIVACY.md)** - Security details
- **[WHATS-NEXT.md](./WHATS-NEXT.md)** - Roadmap and future plans

## 🎯 Key Features Explained

### Financial Health Scoring
- **Good** 🟢: Surplus > ₹10,000
- **OK** 🟡: Surplus ₹1,000-9,999
- **Not Well** 🟠: Short ₹1-3,000
- **Worrisome** 🔴: Short > ₹3,000

### Payment Tracking
- Mark expenses as paid
- Monthly automatic reset
- Custom billing cycle support

### Finance Sharing
- Share with partners/family
- Merge finances option
- Collaborative budgeting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React, Express, and Flutter
- Icons by React Icons
- Deployed on Railway and Vercel

## 📧 Contact

For issues and suggestions, please create a GitHub issue.

---

**MoneyMate** - Take control of your finances today! 💪
README
    echo -e "${GREEN}✅ README.md created${NC}"
else
    echo -e "${YELLOW}⚠️  README.md already exists${NC}"
fi
echo ""

# Step 6: Initialize git if needed
echo "📋 Step 6: Initializing Git..."
if [ ! -d .git ]; then
    git init
    echo -e "${GREEN}✅ Git initialized${NC}"
else
    echo -e "${YELLOW}⚠️  Git already initialized${NC}"
fi
echo ""

# Step 7: Git add and commit
echo "📋 Step 7: Creating initial commit..."
git add .
git commit -m "Initial commit: MoneyMate v1.0 - Personal Finance Management App

Features:
- Income and expense tracking
- Investment management
- Credit card and loan tracking
- Financial health scoring
- Finance sharing for couples
- Mobile app with Flutter
- Comprehensive documentation

Tech Stack:
- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite + TypeScript
- Mobile: Flutter
- Deployment: Railway + Vercel ready

Documentation:
- User guide, deployment guide, security docs
- Quick deploy scripts
- GitHub preparation complete"

echo -e "${GREEN}✅ Initial commit created${NC}"
echo ""

# Step 8: Summary and next steps
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 GitHub Setup Complete!${NC}"
echo ""
echo "📦 Files Created:"
echo "  ✅ .gitignore"
echo "  ✅ LICENSE (MIT)"
echo "  ✅ README.md"
echo "  ✅ Git repository initialized"
echo "  ✅ Initial commit created"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Create GitHub repository:"
echo "   → Go to https://github.com/new"
echo "   → Name: moneymate"
echo "   → Description: Personal finance management app"
echo "   → Public or Private"
echo "   → DON'T initialize with README"
echo ""
echo "2. Link and push:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/moneymate.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Configure repository:"
echo "   → Add topics: personal-finance, expense-tracker, typescript, react"
echo "   → Enable Issues"
echo "   → Add description"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🚀 Your MoneyMate is ready to be shared with the world!${NC}"
echo ""
