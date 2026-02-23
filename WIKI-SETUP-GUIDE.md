# GitHub Wiki Setup Guide

This guide explains how to add these wiki pages to your GitHub repository.

## 📚 Wiki Pages Created

I've created the following wiki pages for you:

1. **WIKI-HOME.md** → Main wiki homepage
2. **WIKI-GETTING-STARTED.md** → User onboarding guide
3. **WIKI-FEATURES.md** → Complete feature list
4. **WIKI-FAQ.md** → Frequently asked questions
5. **WIKI-DEVELOPMENT-SETUP.md** → Developer setup guide
6. **WIKI-CONTRIBUTING.md** → Contribution guidelines
7. **WIKI-ROADMAP.md** → Future features and plans

## 🚀 How to Add to GitHub Wiki

### Option 1: Via GitHub Web Interface (Easiest)

1. **Enable Wiki** (if not already enabled):
   - Go to your repo: https://github.com/shrimanshubham16/moneymate
   - Click **Settings** → **Features**
   - Check **Wikis** → **Save**

2. **Add Pages**:
   - Click **Wiki** tab in your repo
   - Click **New Page**
   - For each file:
     - **Page name**: `Home` (for WIKI-HOME.md)
     - **Content**: Copy-paste from `WIKI-HOME.md`
     - Click **Save Page**
   - Repeat for all pages

3. **Set Home Page**:
   - Go to Wiki → **Pages** (sidebar)
   - Click **...** next to "Home"
   - Select **Set as homepage**

### Option 2: Via Git (Advanced)

GitHub Wikis are actually git repositories! You can clone and push:

```bash
# Clone the wiki repo
git clone https://github.com/shrimanshubham16/moneymate.wiki.git

# Copy wiki files
cd moneymate.wiki
cp ../WIKI-HOME.md Home.md
cp ../WIKI-GETTING-STARTED.md Getting-Started.md
cp ../WIKI-FEATURES.md Features.md
cp ../WIKI-FAQ.md FAQ.md
cp ../WIKI-DEVELOPMENT-SETUP.md Development-Setup.md
cp ../WIKI-CONTRIBUTING.md Contributing.md
cp ../WIKI-ROADMAP.md Roadmap.md

# Commit and push
git add .
git commit -m "Add wiki pages"
git push origin master
```

## 📋 Recommended Page Order

1. **Home** (main landing page)
2. **Getting-Started** (for new users)
3. **Features** (what the app does)
4. **FAQ** (common questions)
5. **Development-Setup** (for developers)
6. **Contributing** (how to contribute)
7. **Roadmap** (future plans)

## ✨ Customization Tips

### Add Sidebar

Create a file called `_Sidebar.md` in the wiki:

```markdown
## For Users
- [[Home|Home]]
- [[Getting-Started|Getting Started]]
- [[Features|Features]]
- [[FAQ|FAQ]]

## For Developers
- [[Development-Setup|Development Setup]]
- [[Contributing|Contributing]]
- [[Roadmap|Roadmap]]
```

### Add Footer

Create `_Footer.md`:

```markdown
---
**FinFlow** - Know Your Financial Health in One Number

[Live App](https://freefinflow.vercel.app/) | [GitHub](https://github.com/shrimanshubham16/moneymate) | [Report Issue](https://github.com/shrimanshubham16/moneymate/issues)
```

## 🔗 Linking from README

Update your `README.md` to link to the wiki:

```markdown
## 📚 Documentation

- **[Wiki Home](https://github.com/shrimanshubham16/moneymate/wiki)** - Complete documentation
- **[Getting Started](https://github.com/shrimanshubham16/moneymate/wiki/Getting-Started)** - Quick setup guide
- **[FAQ](https://github.com/shrimanshubham16/moneymate/wiki/FAQ)** - Common questions
```

## ✅ Checklist

- [ ] Enable Wikis in repo settings
- [ ] Add all 7 wiki pages
- [ ] Set "Home" as homepage
- [ ] Create `_Sidebar.md` (optional)
- [ ] Create `_Footer.md` (optional)
- [ ] Update README with wiki links
- [ ] Test all links work

---

**That's it!** Your GitHub Wiki is now ready for users and contributors.
