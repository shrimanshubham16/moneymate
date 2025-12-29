# FinFlow

**Know Your Financial Health in One Number**

FinFlow is a free, simple personal finance app that shows you your financial health at a glance. Add your income, expenses, and investments, and get a real-time health score that tells you exactly what you'll have left at month-end.

## 🌟 Features

- **Financial Health Score** - One number that shows what you'll have left at month-end
- **Free Forever** - No subscriptions, no ads, no hidden costs
- **Simple Interface** - No learning curve, just works
- **Privacy First** - Your data stays yours
- **Cross-Platform** - Works on mobile, tablet, and desktop
- **Real-Time Updates** - See your health score update as you add expenses

## 🚀 Try It Free

**Live App:** https://freefinflow.vercel.app/

No signup required to explore. No credit card. No catch.

## 📚 Documentation

- **[User Guide](USER-GUIDE.md)** - Complete guide to using FinFlow
- **[Quick Start](QUICK-START.md)** - Get started in 5 minutes
- **[Privacy Policy](PRIVACY-POLICY.md)** - How we protect your data

## 🛠️ For Developers

### Tech Stack

- **Frontend:** React, Vite, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Deployment:** Vercel (Frontend), Railway (Backend)

### Local Development

#### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:12022
```

#### Frontend
```bash
cd web
npm install
npm run dev
# Runs on http://localhost:5173
```

### Environment Variables

**Backend (.env):**
```
PORT=12022
NODE_ENV=development
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:12022
```

## 📖 Project Structure

```
FinFlow/
├── backend/          # Node.js/Express API
├── web/              # React frontend
├── presentation/     # Marketing materials
└── README.md         # This file
```

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

## 📄 License

Private project - All rights reserved

## 🔗 Links

- **Live App:** https://freefinflow.vercel.app/
- **Privacy Policy:** [PRIVACY-POLICY.md](PRIVACY-POLICY.md)

---

**Built with ❤️ for simple financial clarity**
