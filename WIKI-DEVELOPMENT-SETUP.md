# Development Setup

Complete guide to setting up FinFlow for local development.

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Git**
- **Supabase account** (free tier works)
- **PostgreSQL** (via Supabase)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/shrimanshubham16/moneymate.git
cd moneymate
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
PORT=12022
NODE_ENV=development
JWT_SECRET=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:5173
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Start the backend:

```bash
npm run dev
# Runs on http://localhost:12022
```

### 3. Frontend Setup

```bash
cd web
npm install
```

Create `.env` file:

```env
VITE_API_URL=http://localhost:12022
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Start the frontend:

```bash
npm run dev
# Runs on http://localhost:5173
```

### 4. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in order from `supabase/migrations/`:
   - Start with `001_*.sql`
   - Continue sequentially
   - Latest: `031_chat_reactions.sql`

3. Apply migrations via Supabase Dashboard → SQL Editor

## 🗄️ Database Migrations

All migrations are in `supabase/migrations/`. Apply them in order:

```bash
# Example: Apply migration 031
# Copy contents of supabase/migrations/031_chat_reactions.sql
# Paste into Supabase Dashboard → SQL Editor → Run
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd web
npm test
```

## 📁 Project Structure

```
moneymate/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── api/         # API routes
│   │   ├── db/          # Database utilities
│   │   └── utils/       # Helper functions
│   └── package.json
├── web/                 # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
│   └── package.json
├── supabase/
│   └── migrations/      # Database migrations
└── README.md
```

## 🔧 Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `12022` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing key | `your-secret` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:5173` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | `eyJ...` |

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:12022` |
| `VITE_SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |

## 🐛 Common Issues

### Port Already in Use

```bash
# Find process using port 12022
lsof -i :12022
# Kill it
kill -9 <PID>
```

### Database Connection Errors

1. Check Supabase project is active
2. Verify `SUPABASE_URL` and keys are correct
3. Ensure migrations are applied

### CORS Errors

Add your frontend URL to `ALLOWED_ORIGINS` in backend `.env`.

### Module Not Found

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Additional Resources

- [Architecture Overview](Architecture)
- [API Documentation](API-Documentation)
- [Database Schema](Database-Schema)

---

**Ready to code?** Check out [Contributing Guidelines](Contributing) next!
