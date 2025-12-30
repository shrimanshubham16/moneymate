# 🪐 PlanetScale Deep Dive Analysis

**Date**: December 30, 2025  
**Comparison**: PlanetScale vs Supabase vs Railway  
**Goal**: Free app with minimal/no payment

---

## ⚠️ CRITICAL UPDATE: PlanetScale No Longer Free

### PlanetScale Free Tier Discontinued (March 2024)
- ❌ **Free tier removed** in March 2024
- ❌ **No free plan available** as of 2025
- ✅ **Paid plans only**: Starting at $5/month

### Current PlanetScale Pricing (2025)
- **Scaler Pro Plan**: $5/month (single-node, non-HA)
  - Suitable for development/testing
  - Non-high-availability
- **Production Plans**: $15+/month (multi-node, HA)
  - High availability
  - 99.99% SLA
  - Production-ready

**⚠️ PlanetScale is NOT free anymore!**

### Key Features
- ✅ **Serverless MySQL** (Vitess-based)
- ✅ **Branching** (like Git for databases)
- ✅ **Non-blocking schema changes**
- ✅ **Horizontal scaling**
- ✅ **No connection limits**
- ✅ **Automatic backups**

---

## 💰 Cost Analysis

### PlanetScale Free Tier Capacity

#### Storage
- **5 GB storage** = ~160,000 users (at 31 KB/user)
- **vs Supabase**: 500 MB = ~16,000 users
- **Winner**: 🏆 **PlanetScale** (10x more storage)

#### Reads
- **1 billion reads/month**
- Average user: ~100 reads/day = 3,000 reads/month
- **Capacity**: 1B ÷ 3,000 = **333,333 users** ✅
- **vs Supabase**: Unlimited (but bandwidth limited)
- **Winner**: 🏆 **PlanetScale** (clear limit, very generous)

#### Writes
- **10 million writes/month**
- Average user: ~20 writes/day = 600 writes/month
- **Capacity**: 10M ÷ 600 = **16,666 users** ✅
- **vs Supabase**: Unlimited writes
- **Winner**: ⚠️ **Supabase** (unlimited, but bandwidth limited)

### PlanetScale Cost Estimate (2025)

| Users | Plan | Monthly Cost | Notes |
|-------|------|--------------|-------|
| Any | Scaler Pro | **$5/month** | Single-node, non-HA |
| Production | Multi-node | **$15+/month** | High availability |

**❌ PlanetScale is NOT free - minimum $5/month**

---

## 🔄 PlanetScale vs Supabase Comparison

### Storage Capacity
| Platform | Free Storage | Users Supported | Winner |
|----------|-------------|-----------------|--------|
| **PlanetScale** | 5 GB | ~160,000 | 🏆 **PlanetScale** |
| **Supabase** | 500 MB | ~16,000 | |

### Read Operations
| Platform | Free Reads | Users Supported | Winner |
|----------|-----------|-----------------|--------|
| **PlanetScale** | 1B/month | ~333,000 | 🏆 **PlanetScale** |
| **Supabase** | Unlimited* | ~3,300* | *Bandwidth limited |

### Write Operations
| Platform | Free Writes | Users Supported | Winner |
|----------|------------|-----------------|--------|
| **PlanetScale** | 10M/month | ~16,666 | ⚠️ **Supabase** |
| **Supabase** | Unlimited* | ~3,300* | *Bandwidth limited |

### Database Type
| Platform | Database | Pros | Cons |
|----------|----------|------|------|
| **PlanetScale** | MySQL (Vitess) | Serverless, branching, scaling | MySQL (not PostgreSQL) |
| **Supabase** | PostgreSQL | PostgreSQL, more features | Smaller free tier |

### Additional Features
| Feature | PlanetScale | Supabase |
|---------|-------------|----------|
| **Auth** | ❌ Not included | ✅ Built-in |
| **Storage (Files)** | ❌ Not included | ✅ 1 GB free |
| **Realtime** | ❌ Not included | ✅ 200 connections |
| **Edge Functions** | ❌ Not included | ✅ 500K/month |
| **Backups** | ✅ 7 days | ✅ Daily |
| **Branching** | ✅ Yes | ❌ No |

---

## 🎯 PlanetScale Advantages

### 1. **Much Larger Free Tier** 🏆
- **5 GB storage** (vs 500 MB on Supabase)
- **1 billion reads/month** (very generous)
- **10 million writes/month** (sufficient for most apps)
- **Supports 160,000+ users** (vs 3,000 on Supabase)

### 2. **Serverless MySQL**
- Auto-scaling
- No connection pooling needed
- Pay-per-use (after free tier)

### 3. **Database Branching**
- Create branches like Git
- Test schema changes safely
- Merge branches when ready
- Great for development workflow

### 4. **Non-blocking Schema Changes**
- No downtime for migrations
- Safe schema updates
- Rollback support

### 5. **Better for High Traffic**
- Handles millions of requests
- Horizontal scaling built-in
- No connection limits

---

## ⚠️ PlanetScale Disadvantages

### 1. **MySQL (Not PostgreSQL)**
- Different SQL syntax
- Fewer advanced features
- Different ecosystem

### 2. **No Built-in Auth**
- Need separate auth solution
- Can use Supabase Auth (free) or Auth0
- Or build custom JWT (current approach)

### 3. **No File Storage**
- Need separate storage (S3, Cloudinary, etc.)
- Or use Supabase Storage (free tier)

### 4. **No Realtime/Edge Functions**
- Need separate services
- Or use Supabase for these features

### 5. **Write Limit**
- 10M writes/month = ~16,666 users
- May hit limit before storage limit
- But still much better than Supabase

---

## 🏗️ Architecture Options with PlanetScale

### Option 1: PlanetScale Only
- **Database**: PlanetScale (MySQL)
- **Auth**: Custom JWT (current approach)
- **Storage**: Railway volume or S3
- **Backend**: Railway (or Render free tier)
- **Frontend**: Vercel (free)

**Cost**: **$0/month** (up to 160,000 users)

### Option 2: PlanetScale + Supabase Auth
- **Database**: PlanetScale (MySQL)
- **Auth**: Supabase Auth (free)
- **Storage**: Supabase Storage (1 GB free)
- **Backend**: Railway (or Render free tier)
- **Frontend**: Vercel (free)

**Cost**: **$0/month** (up to 160,000 users)

### Option 3: Hybrid Approach
- **Database**: PlanetScale (MySQL) - main data
- **Auth**: Supabase Auth (free)
- **Storage**: Supabase Storage (1 GB free)
- **Realtime**: Supabase Realtime (if needed)
- **Backend**: Railway (or Render free tier)
- **Frontend**: Vercel (free)

**Cost**: **$0/month** (up to 160,000 users)

---

## 📊 Capacity Comparison

### Free Tier User Capacity

| Platform | Max Users (Free) | Limiting Factor | Winner |
|----------|-----------------|-----------------|--------|
| **PlanetScale** | **~16,000** | Writes (10M/month) | 🏆 **PlanetScale** |
| **PlanetScale** | **~160,000** | Storage (5 GB) | 🏆 **PlanetScale** |
| **Supabase** | **~3,000** | Bandwidth (5 GB/month) | |
| **Railway** | **0** | Free credits expire | |

**🏆 PlanetScale wins for capacity!**

---

## 🔄 Migration Considerations

### From JSON to PlanetScale
- **Database**: MySQL (different from PostgreSQL)
- **Schema Design**: Need to design MySQL tables
- **Migration Script**: JSON → MySQL import
- **Backend Changes**: Replace file I/O with MySQL queries
- **Connection**: Use PlanetScale serverless driver

### Migration Complexity
- **Similar to Supabase**: 3-4 days
- **MySQL vs PostgreSQL**: Slight learning curve
- **Branching Feature**: Bonus (can test safely)

---

## 💡 Recommendation: PlanetScale vs Supabase

### Choose PlanetScale If:
- ✅ You need to support **10,000+ users** (free)
- ✅ You want **maximum free capacity** (160,000 users)
- ✅ You need **database branching** for development
- ✅ You're okay with **MySQL** (not PostgreSQL)
- ✅ You can handle **auth separately** (or use Supabase Auth)

### Choose Supabase If:
- ✅ You prefer **PostgreSQL**
- ✅ You want **built-in auth** (all-in-one)
- ✅ You need **file storage** (1 GB free)
- ✅ You need **realtime** features
- ✅ You're okay with **3,000 user limit** (free tier)

---

## 🎯 Updated Verdict: PlanetScale vs Supabase

### ⚠️ PlanetScale is NO LONGER FREE

**PlanetScale**: **$5/month minimum** (discontinued free tier in March 2024)

### For FinFlow (Free App Goal)

**Supabase is the BEST choice** ⭐⭐⭐

**Why:**
1. ✅ **$0/month** (vs $5/month on PlanetScale)
2. ✅ **3,000 users free** (vs $5/month for any users on PlanetScale)
3. ✅ **PostgreSQL** (better than MySQL for this use case)
4. ✅ **Built-in auth** (all-in-one solution)
5. ✅ **File storage included** (1 GB free)

**PlanetScale Comparison:**
- ❌ **$5/month minimum** (not free)
- ✅ Better for high-scale (if you can pay)
- ✅ Database branching (nice feature)
- ⚠️ MySQL (not PostgreSQL)

**Cost**: 
- **Supabase**: **$0/month** for up to **3,000 users** ✅
- **PlanetScale**: **$5/month** for any users ❌

---

## 📋 Migration Plan for PlanetScale

### Phase 1: Setup (1 day)
1. Create PlanetScale account (free)
2. Create database
3. Design MySQL schema (migrate from JSON structure)
4. Set up PlanetScale connection

### Phase 2: Migration (1 day)
1. Export current JSON data
2. Write migration script (JSON → MySQL)
3. Import data to PlanetScale
4. Verify data integrity

### Phase 3: Update Backend (1-2 days)
1. Install PlanetScale client (`@planetscale/database`)
2. Replace file I/O with MySQL queries
3. Update all CRUD operations
4. Test all endpoints

### Phase 4: Testing (1 day)
1. Test all features
2. Load testing
3. Performance comparison

**Total Time**: 4-5 days  
**Cost**: $0 (PlanetScale free tier)

---

## 🔍 Quick Comparison Table (Updated 2025)

| Feature | PlanetScale | Supabase | Railway |
|---------|-------------|----------|---------|
| **Free Tier** | ❌ No | ✅ Yes | ⚠️ One-time credits |
| **Free Users** | 0 (paid only) | 3,000 | 0 |
| **Storage** | Pay-per-use | 500 MB | Pay-per-use |
| **Database** | MySQL | PostgreSQL | JSON file |
| **Auth** | ❌ | ✅ | ❌ |
| **Cost** | **$5/month** | **$0** | $7-23 |
| **Scalability** | Excellent | Good | Poor |
| **Branching** | ✅ | ❌ | ❌ |
| **Recommendation** | ⭐ (if paying) | ⭐⭐⭐ | ❌ |

---

## 🚀 Action Items

1. ✅ **Read this analysis** (done)
2. ⏳ **Create PlanetScale account** (free)
3. ⏳ **Design MySQL schema**
4. ⏳ **Write migration script**
5. ⏳ **Update backend code**
6. ⏳ **Test and deploy**

---

**Conclusion**: **PlanetScale is NO LONGER FREE** (discontinued March 2024). For a free app, **Supabase is the best choice** at $0/month for 3,000 users. PlanetScale costs $5/month minimum, making it more expensive than Supabase for small-to-medium apps. Only consider PlanetScale if you're willing to pay $5/month and need MySQL-specific features or database branching.

