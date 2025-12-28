# MoneyMate Quick Start Guide

## 🚀 Services Running

### Backend (Port 12022)
```bash
cd MoneyMate/backend
npm run dev
```
**Status**: ✅ Running in terminal 3

### Frontend (Port 5173)
```bash
cd MoneyMate/web
npm run dev
```
**Status**: ✅ Running in terminal 4

## 🌐 Access the App

**Web App**: http://localhost:5173

## 🧪 Test Account

You can create a new account or use:
- **Email**: test@test.com
- **Password**: password123
- **Username**: testuser (if creating new)

## 📝 First Time Setup

1. **Open the app**: http://localhost:5173
2. **Sign up** with your email, password, and a unique username
3. **Navigate to Settings** → **Plan Finances**
4. **Add your income** sources
5. **Add fixed expenses** (rent, loans, subscriptions, etc.)
6. **Add variable expenses** (groceries, entertainment, etc.)
7. **Add investments** for wealth tracking
8. **View your dashboard** to see your financial health

## 🎯 Key Features to Try

### 1. Health-Based Dashboard
- Your financial health is displayed with an animated indicator
- Good (🟢), OK (🟡), Not Well (🟠), Worrisome (🔴)

### 2. Variable Expenses
- Plan monthly budgets
- Track actual expenses
- Get alerts on overspending
- Add justification for red-tier overspends

### 3. Fixed Expenses
- Add recurring expenses
- Mark periodic expenses for SIP (quarterly/yearly)
- Auto-calculate monthly equivalents

### 4. SIP for Periodic Expenses
- Accumulate funds monthly for periodic payments
- Avoid large lump-sum payments
- Potential growth on accumulated funds

### 5. Credit Cards & Loans
- Track credit card bills and payments
- Monitor loan EMIs
- See due dates and overdue alerts

### 6. Future Bombs
- Plan for large upcoming expenses
- Track preparedness with visual meters
- Get monthly saving targets

### 7. Sharing
- Share your finances with a partner
- Roles: Editor (can modify) or Viewer (read-only)
- Merge finances option for couples

### 8. Activities
- Complete audit trail of all actions
- Timeline view with timestamps
- Entity-based filtering

## 🐛 Troubleshooting

### Backend Not Running
```bash
# Check if running
lsof -ti:12022

# Kill and restart
lsof -ti:12022 | xargs kill -9
cd MoneyMate/backend && npm run dev
```

### Frontend Not Running
```bash
# Check if running
lsof -ti:5173

# Kill and restart
lsof -ti:5173 | xargs kill -9
cd MoneyMate/web && npm run dev
```

### CORS Errors
- Backend has CORS enabled
- If you see CORS errors, restart the backend
- Clear browser cache and reload

### API Connection Errors
1. Ensure backend is running on port 12022
2. Check backend terminal for errors
3. Test API directly: `curl http://localhost:12022/auth/signup -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123","username":"testuser"}'`

### Build Errors
```bash
# Rebuild frontend
cd MoneyMate/web
rm -rf node_modules dist
npm install
npm run build
npm run dev
```

## 📊 Sample Data

To seed the app with test data:
```bash
cd MoneyMate/backend
npm run seed
```

This will load sample data from `testdata/` folder.

## 🧪 Running Tests

### Backend Tests
```bash
cd MoneyMate/backend
npm test
```

### Web Tests
```bash
cd MoneyMate/web
npm test
```

## 📱 Mobile App (Flutter)

```bash
cd MoneyMate/mobile
flutter run
```

**Note**: Ensure Flutter SDK is installed and configured.

## 🎨 UI Features

- **CRED-like Design**: Modern gradients and smooth animations
- **Widget-Based Dashboard**: Click any widget to navigate to details
- **Responsive**: Works on desktop, tablet, and mobile (best on desktop)
- **Dark Mode**: Health-based theme switching (coming soon)
- **Animations**: Framer Motion for smooth transitions

## 📚 Documentation

- **PRD**: `docs/prd/Finance Partner App.docx`
- **Complete Summary**: `COMPLETE-REDESIGN-SUMMARY.md`
- **Test Report**: `TEST-REPORT.md`
- **Progress Tracking**: `REDESIGN-PROGRESS.md`

## 🔥 Pro Tips

1. **Start with Income**: Add your income sources first
2. **Plan Fixed First**: Add all fixed expenses (rent, EMIs, subscriptions)
3. **Budget Variables**: Plan variable expenses realistically
4. **Mark SIP**: Mark yearly/quarterly expenses for SIP to avoid lump-sum payments
5. **Track Actuals**: Update variable actuals regularly to see real spending
6. **Check Health**: Dashboard health updates automatically based on your plans
7. **Use Alerts**: Enable notifications for overspends and missed payments
8. **Share Wisely**: Use "Merge Finances" when sharing with a partner
9. **Plan Ahead**: Add future bombs (car, wedding, etc.) to track preparedness
10. **Review Activities**: Check activity log to audit all changes

## 🎯 Success Metrics

- **Green Health**: Keep remaining balance > ₹10,000
- **Low Overspends**: Minimize red-tier variable overspends
- **High Preparedness**: Maintain > 70% preparedness for future bombs
- **Regular Tracking**: Update actuals at least weekly
- **Active Investments**: Keep all investments in "active" status

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review the test report for known issues
3. Check browser console for detailed error messages
4. Restart both backend and frontend
5. Clear browser cache and localStorage

---

**Enjoy using MoneyMate!** 🎉

Your financial health journey starts here. Plan wisely, track diligently, and achieve your financial goals!

