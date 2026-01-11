# 🚀 Starting the Server

## Step 1: Kill Existing Process (if port is in use)

```bash
# Kill any process on port 12022
lsof -ti:12022 | xargs kill -9 2>/dev/null || echo "Port is free"
```

## Step 2: Start the Server

```bash
cd backend
npm run dev
```

## Expected Output

You should see:
```
🚀 FinFlow backend listening on port 12022
📊 Environment: development
🔒 CORS origins: http://localhost:5173
```

**Note**: You should NOT see:
- ❌ "📂 Loading persisted data from disk..." (this means old store.ts is still being used)

## Step 3: Test the Server

In another terminal:
```bash
cd backend
npm run test-endpoints
```

Or test manually:
```bash
curl http://localhost:12022/health
```

Should return: `{"status":"ok"}`

## Troubleshooting

### Port Already in Use
```bash
# Find and kill the process
lsof -ti:12022 | xargs kill -9
```

### Still Loading from Disk
- Check that `mergedFinances.ts` doesn't import old `store.ts`
- Verify `server.ts` shutdown handler doesn't use old store
- Rebuild: `npm run build`

### Supabase Connection Issues
- Check `.env` file has correct credentials
- Run: `npm run test-supabase`


