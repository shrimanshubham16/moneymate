# 📦 MoneyMate Version & Build Management Guide

## Current Version: 1.2.0 (Build 15)

---

## 📋 Versioning System

MoneyMate follows **Semantic Versioning 2.0.0** (https://semver.org/)

### Version Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes, major feature releases, API changes
- **MINOR**: New features, enhancements, non-breaking changes
- **PATCH**: Bug fixes, minor improvements, UI polish

### Build Number

- Increments with **every deployment** to production
- Helps track exact deployed versions
- Format: `1.2.0 (Build 15)`

---

## 🔢 When to Increment Version

### MAJOR Version (X.0.0)

Increment when you make **breaking changes**:
- Complete UI redesign
- Major architecture changes
- Breaking API changes
- Database schema changes requiring migration
- Changes that break backward compatibility

**Examples**:
- `1.x.x` → `2.0.0`: Complete app redesign
- `2.x.x` → `3.0.0`: New authentication system

### MINOR Version (x.Y.0)

Increment when you add **new features**:
- New pages or sections
- New financial features (e.g., budgeting, forecasting)
- New integrations
- Significant enhancements
- Non-breaking API additions

**Examples**:
- `1.1.x` → `1.2.0`: Added payment tracking system
- `1.2.x` → `1.3.0`: Added budget forecasting

### PATCH Version (x.x.Z)

Increment for **bug fixes and minor improvements**:
- Bug fixes
- UI polish (icon replacements, styling)
- Performance improvements
- Minor text changes
- Security patches

**Examples**:
- `1.2.0` → `1.2.1`: Fixed missing imports
- `1.2.1` → `1.2.2`: Replaced emoji icons

### Build Number

Increment **every time** you deploy to production:
- Every `git push` that deploys
- Even if no version number changes
- Tracks deployment history

---

## 📝 How to Update Version

### 1. Edit `web/src/version.ts`

```typescript
export const VERSION = {
  major: 1,        // ← Update this for breaking changes
  minor: 2,        // ← Update this for new features
  patch: 1,        // ← Update this for bug fixes
  build: 16,       // ← Increment EVERY deployment
  
  releaseDate: "Dec 28, 2024",  // ← Update release date
  
  releaseNotes: [  // ← Add what changed
    "Fixed blank pages for variable expenses",
    "Added professional icons throughout",
    "Added BETA badge to Sharing feature"
  ]
};
```

### 2. Update Release Notes

Add bullet points describing changes in this release:
- Keep it user-friendly (no technical jargon)
- Focus on what users will notice
- 3-7 items per release is ideal

### 3. Commit with Version Tag

```bash
# Commit changes
git add web/src/version.ts
git commit -m "chore: Bump version to 1.2.1 (Build 16)"

# Optional: Create git tag
git tag -a v1.2.1 -m "Version 1.2.1 - Bug fixes and UI improvements"
git push origin v1.2.1
```

---

## 🚀 Deployment Workflow

### Before Every Push to Production

```bash
# 1. Update version.ts
# - Decide: MAJOR, MINOR, or PATCH?
# - Increment build number
# - Update release date
# - Add release notes

# 2. Test the changes
cd web && npm run build
cd ../backend && npm run build

# 3. Commit version bump
git add web/src/version.ts
git commit -m "chore: Bump version to X.Y.Z (Build N)"

# 4. Commit your actual changes
git add .
git commit -m "feat: Your feature description"

# 5. Push to production
git push

# 6. (Optional) Create release tag
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin vX.Y.Z
```

---

## 📚 Version History

### Version 1.2.0 (Build 15) - Dec 28, 2024
- Fixed missing routes and imports
- Replaced all emoji icons with professional React Icons
- Added BETA badge to Sharing feature
- Comprehensive Playwright test suite (53.8% passing)
- Health calculation improvements
- Payment tracking system
- Custom billing cycle support

### Version 1.1.0 (Build 10) - Dec 27, 2024
- Added payment tracking for fixed expenses and investments
- User-defined billing cycle (month start day)
- Improved health calculation with prorated expenses
- Added preferences page for billing settings
- Data persistence to file system
- Excel export with multiple sheets and charts

### Version 1.0.0 (Build 1) - Dec 20, 2024
- Initial release
- Core financial planning features
- Dashboard with health indicators
- Income, expenses, investments management
- Credit cards and loans tracking
- Sharing and collaboration features
- Activity log and alerts
- Mobile app (Flutter)

---

## 🎯 Quick Reference

### Current Release
```
Version: 1.2.0
Build: 15
Date: Dec 28, 2024
```

### Next Release Should Be

**If you're adding**:
- ✨ **New feature** → `1.3.0 (Build 16)`
- 🐛 **Bug fix** → `1.2.1 (Build 16)`
- 💥 **Breaking change** → `2.0.0 (Build 16)`

**Build number always increments**: `15 → 16`

---

## 🔍 Where Version Appears

1. **About Page** (`/settings/about`)
   - Version card with gradient background
   - Build number
   - Release date
   - Release notes list

2. **Browser Console** (on app load)
   ```
   MoneyMate v1.2.0 (Build 15)
   Released: Dec 28, 2024
   ```

3. **Support Tickets**
   - Users can reference version/build when reporting issues

---

## 🛠️ Automation Ideas (Future)

### Auto-increment Build Number

Create a script `bump-build.sh`:
```bash
#!/bin/bash
# Auto-increment build number

VERSION_FILE="web/src/version.ts"
CURRENT_BUILD=$(grep -oP 'build:\s*\K\d+' "$VERSION_FILE")
NEW_BUILD=$((CURRENT_BUILD + 1))

sed -i '' "s/build: $CURRENT_BUILD/build: $NEW_BUILD/" "$VERSION_FILE"
echo "Build number bumped: $CURRENT_BUILD → $NEW_BUILD"
```

### Git Hooks

Add to `.git/hooks/pre-push`:
```bash
#!/bin/bash
# Remind to update version before push

echo "⚠️  Remember to update version.ts before pushing!"
echo "Current version: $(grep -A1 'major:' web/src/version.ts)"
read -p "Continue with push? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi
```

### CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Check version updated
  run: |
    if git diff HEAD~1 web/src/version.ts | grep -q "build:"; then
      echo "✅ Version updated"
    else
      echo "❌ Please update version.ts"
      exit 1
    fi
```

---

## 📞 Questions?

**When in doubt**:
- **Bug fix** → Increment **PATCH** (1.2.0 → 1.2.1)
- **New feature** → Increment **MINOR** (1.2.0 → 1.3.0)
- **Breaking change** → Increment **MAJOR** (1.2.0 → 2.0.0)
- **Every push** → Increment **BUILD** (15 → 16)

---

## ✅ Checklist for Every Release

- [ ] Update `major`, `minor`, or `patch` in `version.ts`
- [ ] Increment `build` number
- [ ] Update `releaseDate`
- [ ] Update `releaseNotes` array
- [ ] Test build: `npm run build`
- [ ] Commit version bump
- [ ] Push to production
- [ ] (Optional) Create git tag
- [ ] Verify version shows correctly in About page

---

**Remember**: Version numbers are for humans! Make them meaningful and consistent. 🎯


