# Contributing to FinFlow

Thank you for your interest in contributing to FinFlow! This guide will help you get started.

## 🤝 How to Contribute

### Reporting Bugs

1. Check if the bug already exists in [Issues](https://github.com/shrimanshubham16/moneymate/issues)
2. If not, create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots (if applicable)
   - Browser/device info

### Suggesting Features

1. Check existing [Issues](https://github.com/shrimanshubham16/moneymate/issues) for similar suggestions
2. Create a new issue with:
   - Clear description
   - Use case/benefit
   - Mockups (if applicable)

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add new feature"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**

## 📝 Code Style

### TypeScript/JavaScript

- Use **TypeScript** for type safety
- Follow **ESLint** rules
- Use **meaningful variable names**
- Add **comments** for complex logic

### React Components

- Use **functional components** with hooks
- Keep components **small and focused**
- Use **TypeScript interfaces** for props
- Follow **existing patterns** in the codebase

### CSS

- Use **CSS variables** from design system
- Follow **BEM-like naming** conventions
- Keep styles **scoped to components**
- Support **dark and light themes**

## 🧪 Testing

Before submitting:

1. **Test locally**:
   ```bash
   # Backend
   cd backend && npm test
   
   # Frontend
   cd web && npm test
   ```

2. **Test manually**:
   - Test on different browsers
   - Test on mobile devices
   - Test edge cases

3. **Check for linting errors**:
   ```bash
   npm run lint
   ```

## 📋 Pull Request Guidelines

### PR Title Format

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for formatting
- `refactor:` for code restructuring
- `test:` for tests
- `chore:` for maintenance

### PR Description

Include:
- **What** changed
- **Why** it changed
- **How** to test
- **Screenshots** (for UI changes)

### Review Process

- PRs will be reviewed for:
  - Code quality
  - Test coverage
  - Documentation
  - Performance impact

## 🎯 Areas for Contribution

### High Priority

- **Bug fixes**: Check [Issues](https://github.com/shrimanshubham16/moneymate/issues) labeled `bug`
- **Documentation**: Improve wiki pages
- **Accessibility**: Improve a11y
- **Performance**: Optimize slow operations

### Feature Ideas

- **Mobile app**: Native iOS/Android
- **Export formats**: PDF, JSON
- **Charts/Graphs**: Visualize spending
- **Recurring transactions**: Auto-add expenses
- **Budget templates**: Pre-configured budgets

## 🚫 What Not to Contribute

- **Breaking changes** without discussion
- **Dependencies** without justification
- **Code** that doesn't follow existing patterns
- **Features** that compromise privacy

## 📞 Questions?

- Open an [Issue](https://github.com/shrimanshubham16/moneymate/issues)
- Visit the [Community Lounge](https://freefinflow.vercel.app/lounge)
- Check the [Development Setup](Development-Setup) guide

---

**Thank you for contributing to FinFlow!** 🎉
