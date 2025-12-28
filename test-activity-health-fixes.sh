#!/bin/bash
set -e

API_BASE="http://localhost:12022"
TEST_USER="testuser_$(date +%s)"
TEST_PASS="TestPass123!"

echo "🧪 Testing Activity Logging and Health Score Fixes"
echo "=================================================="
echo ""

# 1. Create test user
echo "1️⃣ Creating test user: $TEST_USER"
SIGNUP_RES=$(curl -s -X POST "$API_BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"email\":\"$TEST_USER@test.com\",\"password\":\"$TEST_PASS\"}")

TOKEN=$(echo $SIGNUP_RES | jq -r '.access_token')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to create user"
  echo "Response: $SIGNUP_RES"
  exit 1
fi
echo "✅ User created, token: ${TOKEN:0:20}..."
echo ""

# 2. Add Income
echo "2️⃣ Adding income source..."
curl -s -X POST "$API_BASE/planning/income" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"source":"Test Salary","amount":100000,"frequency":"monthly"}' | jq -r '.data.id' > /tmp/income_id.txt
echo "✅ Income added"
echo ""

# 3. Add Fixed Expense
echo "3️⃣ Adding fixed expense..."
curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Rent","amount":25000,"frequency":"monthly","category":"Housing","is_sip_flag":false}' | jq -r '.data.id' > /tmp/fixed_id.txt
echo "✅ Fixed expense added"
echo ""

# 4. Add Variable Expense Plan
echo "4️⃣ Adding variable expense plan..."
curl -s -X POST "$API_BASE/planning/variable-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Groceries","planned":10000,"category":"Food","start_date":"2025-01-01","end_date":"2025-12-31"}' | jq -r '.data.id' > /tmp/variable_id.txt
echo "✅ Variable expense plan added"
echo ""

# 5. Add Investment
echo "5️⃣ Adding investment..."
curl -s -X POST "$API_BASE/investments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test MF","goal":"Retirement","monthlyAmount":15000,"status":"active"}' | jq -r '.data.id' > /tmp/investment_id.txt
echo "✅ Investment added"
echo ""

# 6. Check Activity Log
echo "6️⃣ Checking activity log..."
ACTIVITIES=$(curl -s -X GET "$API_BASE/activity" \
  -H "Authorization: Bearer $TOKEN")

INCOME_ACTIVITY=$(echo $ACTIVITIES | jq '.data[] | select(.entity == "income")')
FIXED_ACTIVITY=$(echo $ACTIVITIES | jq '.data[] | select(.entity == "fixed_expense")')
VARIABLE_ACTIVITY=$(echo $ACTIVITIES | jq '.data[] | select(.entity == "variable_expense_plan")')
INVESTMENT_ACTIVITY=$(echo $ACTIVITIES | jq '.data[] | select(.entity == "investment")')

echo ""
echo "📊 Activity Log Results:"
echo "------------------------"

if [ -n "$INCOME_ACTIVITY" ]; then
  echo "✅ Income activity logged: $(echo $INCOME_ACTIVITY | jq -r '.action')"
else
  echo "❌ Income activity NOT logged"
fi

if [ -n "$FIXED_ACTIVITY" ]; then
  echo "✅ Fixed expense activity logged: $(echo $FIXED_ACTIVITY | jq -r '.action')"
else
  echo "❌ Fixed expense activity NOT logged"
fi

if [ -n "$VARIABLE_ACTIVITY" ]; then
  echo "✅ Variable expense activity logged: $(echo $VARIABLE_ACTIVITY | jq -r '.action')"
else
  echo "❌ Variable expense activity NOT logged"
fi

if [ -n "$INVESTMENT_ACTIVITY" ]; then
  echo "✅ Investment activity logged: $(echo $INVESTMENT_ACTIVITY | jq -r '.action')"
else
  echo "❌ Investment activity NOT logged"
fi

echo ""
echo "7️⃣ Checking health score consistency..."

# Get dashboard health
DASHBOARD=$(curl -s -X GET "$API_BASE/dashboard" \
  -H "Authorization: Bearer $TOKEN")
DASHBOARD_HEALTH=$(echo $DASHBOARD | jq '.data.health.remaining')
DASHBOARD_CATEGORY=$(echo $DASHBOARD | jq -r '.data.health.category')

# Get health details
HEALTH_DETAILS=$(curl -s -X GET "$API_BASE/health/details" \
  -H "Authorization: Bearer $TOKEN")
HEALTH_REMAINING=$(echo $HEALTH_DETAILS | jq '.data.health.remaining')
HEALTH_CATEGORY=$(echo $HEALTH_DETAILS | jq -r '.data.health.category')

echo ""
echo "💚 Health Score Comparison:"
echo "----------------------------"
echo "Dashboard Health:      ₹$DASHBOARD_HEALTH ($DASHBOARD_CATEGORY)"
echo "Health Details Health: ₹$HEALTH_REMAINING ($HEALTH_CATEGORY)"

if [ "$DASHBOARD_HEALTH" = "$HEALTH_REMAINING" ] && [ "$DASHBOARD_CATEGORY" = "$HEALTH_CATEGORY" ]; then
  echo "✅ Health scores are IDENTICAL!"
else
  echo "❌ Health scores are DIFFERENT!"
  echo "   Difference: $(echo "$DASHBOARD_HEALTH - $HEALTH_REMAINING" | bc)"
fi

echo ""
echo "=================================================="
echo "🎉 Test Complete!"
echo "=================================================="

