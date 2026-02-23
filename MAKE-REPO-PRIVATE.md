# How to Make Repository Private

## Option 1: Via GitHub Web Interface (Easiest)

1. **Go to your repository**: https://github.com/shrimanshubham16/moneymate
2. Click **Settings** (top right, in the repository menu)
3. Scroll down to **Danger Zone** section (at the bottom)
4. Click **Change visibility**
5. Select **Make private**
6. Type your repository name to confirm: `shrimanshubham16/moneymate`
7. Click **I understand, change repository visibility**

## Option 2: Via GitHub CLI (if installed)

```bash
gh repo edit shrimanshubham16/moneymate --visibility private
```

## What Happens When You Make It Private?

✅ **Only collaborators can:**
- View the code
- Clone the repository
- Access the repository

❌ **Public users cannot:**
- See the repository in search
- View code, issues, or wiki
- Fork or clone the repository

## Important Notes

### Wiki Access
- **Private repos**: Wiki is also private (only collaborators)
- If you want public wiki but private code, you'll need to:
  - Keep repo public
  - Use branch protection or other access controls
  - Or manually manage wiki access

### Current Status
- Your repo is currently **PUBLIC**
- Anyone can view, clone, and fork it
- Making it private will hide everything

### After Making Private

1. **Existing clones**: Will still work but won't receive updates
2. **Public links**: Will show "404 Not Found" to non-collaborators
3. **Search**: Repository won't appear in GitHub search
4. **Collaborators**: You can add them in Settings → Collaborators

## Adding Collaborators

1. Go to **Settings** → **Collaborators**
2. Click **Add people**
3. Enter GitHub username or email
4. Choose permission level:
   - **Read**: Can view and clone
   - **Write**: Can push changes
   - **Admin**: Full access

## Alternative: Keep Public but Restrict

If you want to keep the repo public but restrict certain parts:

1. **Use `.gitignore`** to exclude sensitive files (already done)
2. **Use branch protection** to prevent direct pushes
3. **Use GitHub Actions** to review changes
4. **Keep sensitive data in environment variables**

However, **making it private is the only way to completely hide the code** from non-collaborators.

---

**Recommendation**: If you want to restrict code access, make the repository **private**. This is the simplest and most secure option.
