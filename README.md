# MoneyMate

A comprehensive personal finance management application with backend API, web frontend, and mobile app.

## Project Structure

- `backend/` - Node.js/Express backend API
- `web/` - React/Vite web frontend
- `mobile/` - Flutter mobile application

## Deployment

### Backend (Railway)
The backend is deployed on Railway. Railway automatically detects the `backend/railway.json` configuration.

**Environment Variables Required:**
- `PORT` - Railway sets this automatically
- `NODE_ENV=production`

### Frontend (Vercel)
The web frontend is deployed on Vercel using the `web/vercel.json` configuration.

**Build Configuration:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Web
```bash
cd web
npm install
npm run dev
```

### Mobile
```bash
cd mobile
flutter pub get
flutter run
```

## Features

- Health Score Calculation
- Income & Expense Tracking
- Investment Management
- Credit Card & Loan Tracking
- Financial Planning
- Data Export
- Multi-user Support with Sharing

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Web**: React, Vite, TypeScript
- **Mobile**: Flutter, Dart
- **Deployment**: Railway (backend), Vercel (web)
