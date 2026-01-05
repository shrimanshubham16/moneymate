# 🔧 Maintenance Mode

## ✅ Currently Active

Maintenance mode is **ENABLED** to prevent users from using the app during database migration.

## 🚀 How to Disable After Migration

Once migration to Supabase is complete and verified:

1. **Open** `web/src/App.tsx`
2. **Find** line with: `const MAINTENANCE_MODE = true;`
3. **Change to**: `const MAINTENANCE_MODE = false;`
4. **Commit and push**:
   ```bash
   git add web/src/App.tsx
   git commit -m "chore: Disable maintenance mode - migration complete"
   git push origin main
   ```

## 📋 What Users See

- **Full-screen overlay** that cannot be dismissed
- **Message**: "Maintenance in Progress"
- **Details**: Explains database migration
- **Estimated time**: 15-30 minutes
- **Spinner animation**: Shows system is working

## ✅ Features

- ✅ **Non-dismissible**: Users cannot close or bypass it
- ✅ **Covers all pages**: Shows on login, dashboard, and all routes
- ✅ **Mobile responsive**: Works on all devices
- ✅ **Professional design**: Matrix-themed to match app style
- ✅ **Prevents interaction**: All clicks/inputs are blocked

## ⚠️ Important

- **Do NOT disable** until migration is 100% complete and tested
- **Test thoroughly** after disabling to ensure everything works
- **Keep maintenance mode ON** during entire migration process

---

**Status**: 🟢 ACTIVE (Maintenance mode enabled)



