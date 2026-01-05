# 📸 Tutorial Screenshots Guide

## How to Add Screenshots to tutorial.html

### Step 1: Prepare Your Environment
1. Make sure the backend is running on port 12022
2. Make sure the frontend is running on http://localhost:5173/
3. Have your credentials ready: `shrimanshubham` / `c0nsT@nt1`

### Step 2: Take Screenshots

Use any screenshot tool (browser DevTools, Snipping Tool, or a browser extension) to capture the following screens:

#### 1. Login/Signup Page
- **Location**: http://localhost:5173/
- **Action**: Show the authentication form
- **Save as**: `screenshots/01-login-signup.png`

#### 2. Dashboard
- **Location**: After login
- **Action**: Show the full dashboard with health indicator and all widgets
- **Save as**: `screenshots/02-dashboard.png`

#### 3. Income Page
- **Location**: Settings → Plan Finances → Income
- **Action**: Show the income management page with "Add Income" form visible
- **Save as**: `screenshots/03-income.png`

#### 4. Fixed Expenses Page
- **Location**: Dashboard → Fixed Expenses
- **Action**: Show the page with at least one fixed expense card and the "Add Fixed Expense" form
- **Save as**: `screenshots/04-fixed-expenses.png`

#### 5. Fixed Expense with SIP
- **Location**: Fixed Expenses page
- **Action**: Show a fixed expense card with SIP toggle enabled
- **Save as**: `screenshots/05-fixed-expense-sip.png`

#### 6. Variable Expenses Page
- **Location**: Dashboard → Variable Expenses
- **Action**: Show the page with plans and actuals, "Add Plan" and "Add Actual" buttons visible
- **Save as**: `screenshots/06-variable-expenses.png`

#### 7. Current Month Expenses
- **Location**: Dashboard → Current Month Expenses
- **Action**: Show the page with category breakdown and charts
- **Save as**: `screenshots/07-current-month-expenses.png`

#### 8. Investments Page
- **Location**: Dashboard → Investments
- **Action**: Show the investments page with "Add Investment" form
- **Save as**: `screenshots/08-investments.png`

#### 9. Credit Cards Management
- **Location**: Settings → Credit Cards
- **Action**: Show the credit cards page with "Add Credit Card" form
- **Save as**: `screenshots/09-credit-cards.png`

#### 10. Credit Card Details
- **Location**: Credit Cards page
- **Action**: Show a credit card card with "Update Bill" and "View Usage" buttons visible
- **Save as**: `screenshots/10-credit-card-details.png`

#### 11. Health Details Page
- **Location**: Click on Health Indicator on Dashboard
- **Action**: Show the detailed health breakdown page
- **Save as**: `screenshots/11-health-details.png`

#### 12. Activities Page
- **Location**: Dashboard → Activities
- **Action**: Show the activities timeline with recent actions
- **Save as**: `screenshots/12-activities.png`

#### 13. Dues Page
- **Location**: Dashboard → Dues
- **Action**: Show the dues page with current month pending payments
- **Save as**: `screenshots/13-dues.png`

#### 14. Settings Page
- **Location**: Click Settings icon in header
- **Action**: Show the settings page with all options
- **Save as**: `screenshots/14-settings.png`

### Step 3: Add Screenshots to tutorial.html

1. Create a `screenshots` folder in the `presentation` directory
2. Place all screenshots in that folder
3. In `tutorial.html`, find each `<div class="screenshot-placeholder">` section
4. Replace it with:
```html
<img src="screenshots/XX-filename.png" alt="Description" class="screenshot">
<p class="screenshot-caption">Description of the screenshot</p>
```

### Example Replacement:

**Before:**
```html
<div class="screenshot-placeholder">
    Screenshot: Login/Signup Page
    <div style="font-size: 14px; margin-top: 10px; color: #999;">
        Show the authentication page with username and password fields
    </div>
</div>
<p class="screenshot-caption">Login/Signup Page - Enter your username and password</p>
```

**After:**
```html
<img src="screenshots/01-login-signup.png" alt="Login/Signup Page" class="screenshot">
<p class="screenshot-caption">Login/Signup Page - Enter your username and password</p>
```

### Step 4: Test the Tutorial

1. Open `tutorial.html` in a browser
2. Verify all screenshots load correctly
3. Check that the navigation links work
4. Ensure the tutorial is readable and helpful

---

## Quick Screenshot Checklist

- [ ] 01-login-signup.png
- [ ] 02-dashboard.png
- [ ] 03-income.png
- [ ] 04-fixed-expenses.png
- [ ] 05-fixed-expense-sip.png
- [ ] 06-variable-expenses.png
- [ ] 07-current-month-expenses.png
- [ ] 08-investments.png
- [ ] 09-credit-cards.png
- [ ] 10-credit-card-details.png
- [ ] 11-health-details.png
- [ ] 12-activities.png
- [ ] 13-dues.png
- [ ] 14-settings.png

---

## Tips for Good Screenshots

1. **Use Full Page Screenshots**: Capture the entire page, not just a portion
2. **Hide Sensitive Data**: Blur or hide any personal information if needed
3. **Consistent Browser**: Use the same browser and zoom level for all screenshots
4. **Clear Actions**: Make sure buttons, forms, and important elements are visible
5. **Good Lighting**: Ensure text is readable and UI elements are clear
6. **Standard Size**: Aim for 1920x1080 or similar standard resolution

---

## Alternative: Automated Screenshot Script

If you want to automate screenshot taking, you can use Playwright or Puppeteer. Here's a basic example:

```javascript
// screenshot-script.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login
  await page.goto('http://localhost:5173/');
  await page.fill('input[type="text"]', 'shrimanshubham');
  await page.fill('input[type="password"]', 'c0nsT@nt1');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // Take screenshots
  await page.screenshot({ path: 'screenshots/02-dashboard.png', fullPage: true });
  
  // Navigate and take more screenshots...
  
  await browser.close();
})();
```

---

**Note**: The tutorial.html file is ready with placeholder sections. Just add your screenshots following the guide above!




