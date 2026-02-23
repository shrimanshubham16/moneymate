# Frequently Asked Questions (FAQ)

Common questions about FinFlow.

## 🚀 Getting Started

### Q: Is FinFlow really free?
**A:** Yes! FinFlow is completely free forever. No subscriptions, no ads, no hidden costs.

### Q: Do I need to provide my email?
**A:** No. FinFlow doesn't require or use email. You sign up with a username and password, and save a recovery key for password reset.

### Q: Can I change my username?
**A:** No, usernames are permanent. Choose wisely when signing up!

### Q: What if I forget my password?
**A:** You can reset it using your recovery key. Make sure to save it when you create your account. Without the recovery key, there's no way to reset the password.

### Q: How do I get my recovery key?
**A:** The recovery key is shown once when you create your account. Copy it and save it somewhere safe. You won't see it again.

## 💰 Financial Health Score

### Q: How is the Health Score calculated?
**A:** 
```
Health = Total Income - (Fixed Expenses + Variable Expenses + Investments + Dues + Future Bomb SIPs)
```

### Q: Why is my health score negative?
**A:** A negative score means you're spending more than you earn. Review your expenses and consider:
- Reducing variable expenses
- Pausing non-critical investments
- Adjusting your budget

### Q: Can I exclude certain incomes from health calculation?
**A:** Yes! When adding/editing income, you can toggle "Include in Health Calculation" to exclude it.

### Q: Why doesn't my health score match the breakdown?
**A:** Make sure you're looking at the same time period. The score should match exactly. If it doesn't, try refreshing the page.

## 📊 Expenses & Investments

### Q: What's the difference between Fixed and Variable expenses?
**A:** 
- **Fixed**: Predictable, recurring costs (rent, subscriptions, EMIs)
- **Variable**: Flexible spending with budget limits (groceries, entertainment)

### Q: Should I mark my SIP as a Fixed Expense or Investment?
**A:** Use the **Investment** section for SIPs. You can also mark Fixed Expenses as "SIP" if they're investments.

### Q: What does "Critical Investment" mean?
**A:** Critical investments are protected from being suggested for pausing in Future Bombs. They're treated as important as fixed expenses.

### Q: Can I pause an investment?
**A:** Yes, but only if it's not marked as Critical. Critical investments cannot be paused.

### Q: What happens when I pause an investment?
**A:** Paused investments are excluded from health calculations and won't appear in dues.

## 💣 Future Bombs

### Q: What is a Future Bomb?
**A:** A Future Bomb is a large upcoming expense you need to plan for (e.g., vacation, down payment, medical bill).

### Q: How do defusal strategies work?
**A:** FinFlow suggests multiple ways to cover the bomb:
1. **Pause investments**: Temporarily stop non-critical investments
2. **Sell RSU stocks**: Calculate how many shares to sell (with tax)
3. **Withdraw from investments**: Use accumulated funds
4. **Custom mix**: Combine all strategies

### Q: Can I use multiple strategies at once?
**A:** Yes! The custom mix option lets you combine pausing investments, selling stocks, and withdrawing funds.

## 🤝 Sharing & Privacy

### Q: Can I share my account with someone?
**A:** Yes! Go to Settings → Sharing to invite someone. They'll have view-only access.

### Q: Can shared users modify my data?
**A:** No, shared users can only view your finances. They cannot add, edit, or delete anything.

### Q: Is my data encrypted?
**A:** Yes! Sensitive data is encrypted client-side before sending to the server. The server cannot read encrypted fields.

### Q: Can the developer see my financial data?
**A:** Technically, the developer could access the database, but:
- Encrypted fields are unreadable
- Numeric fields are plaintext (for calculations)
- The developer follows ethical practices and doesn't access user data

### Q: What happens if I delete my account?
**A:** All your data is permanently deleted. This cannot be undone.

## 💬 Community Lounge

### Q: What is the Community Lounge?
**A:** A real-time chatroom where users can share tips, ask questions, and connect with others.

### Q: Are messages private?
**A:** No, the Lounge is public. All users can see all messages.

### Q: How long are messages kept?
**A:** Messages are automatically cleared daily.

### Q: How do I report a bug or suggest a feature?
**A:** Use the tag buttons in the Lounge:
- `:BUG:` for bug reports
- `:Feature:` for feature suggestions

## 🔧 Technical

### Q: Does FinFlow work offline?
**A:** Partially. You can view cached data, but you need internet to sync changes.

### Q: Can I export my data?
**A:** Yes! Go to Settings → Export to download your data as Excel/CSV.

### Q: Is there a mobile app?
**A:** The web app is mobile-responsive and works great on phones. A native mobile app may come in the future.

### Q: What browsers are supported?
**A:** Modern browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile.

## 🐛 Troubleshooting

### Q: I can't log in. What should I do?
**A:** 
1. Check your username and password
2. Make sure your account isn't locked (after 3 failed attempts)
3. Try clearing browser cache
4. Contact support if issues persist

### Q: My data isn't syncing. What's wrong?
**A:** 
1. Check your internet connection
2. Refresh the page
3. Clear browser cache
4. Try logging out and back in

### Q: The health score seems wrong. How do I fix it?
**A:** 
1. Check that all expenses are marked as paid/unpaid correctly
2. Verify variable expense actuals are recorded
3. Make sure investments are marked as paid
4. Review the breakdown to see what's affecting the score

---

**Still have questions?** Visit the [Community Lounge](https://freefinflow.vercel.app/lounge) or [open an issue](https://github.com/shrimanshubham16/moneymate/issues) on GitHub.
