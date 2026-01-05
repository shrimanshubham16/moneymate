#!/bin/bash
set -e

API_BASE="http://localhost:12022"
TEST_USER="healthtest_$(date +%s)"
TEST_PASS="TestPass123!"

echo "🧪 COMPREHENSIVE HEALTH SCORE TEST"
echo "====================================="
echo ""

# 1. Create test user
echo "1️⃣  Creating fresh test user: $TEST_USER"
SIGNUP_RES=$(curl -s -X POST "$API_BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"email\":\"$TEST_USER@test.com\",\"password\":\"$TEST_PASS\"}")

TOKEN=$(echo $SIGNUP_RES | jq -r '.access_token')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to create user"
  exit 1
fi
echo "✅ User created"
echo ""

# 2. Add realistic financial data
echo "2️⃣  Adding comprehensive financial data..."
echo ""

# Add 2 income sources
echo "   📥 Adding income sources..."
curl -s -X POST "$API_BASE/planning/income" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"source":"Software Engineer Salary","amount":125000,"frequency":"monthly"}' > /dev/null

curl -s -X POST "$API_BASE/planning/income" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"source":"Freelance Projects","amount":35000,"frequency":"monthly"}' > /dev/null
echo "   ✅ 2 income sources added (Total: ₹1,60,000/month)"

# Add 5 fixed expenses
echo "   💸 Adding fixed expenses..."
curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"House Rent","amount":35000,"frequency":"monthly","category":"Housing","is_sip_flag":false}' > /dev/null

curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Car EMI","amount":18000,"frequency":"monthly","category":"Loan","is_sip_flag":false}' > /dev/null

curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Internet & Mobile","amount":2500,"frequency":"monthly","category":"Utilities","is_sip_flag":false}' > /dev/null

curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Insurance Premium","amount":5000,"frequency":"monthly","category":"Insurance","is_sip_flag":false}' > /dev/null

curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Gym Membership","amount":3000,"frequency":"monthly","category":"Health","is_sip_flag":false}' > /dev/null
echo "   ✅ 5 fixed expenses added (Total: ₹63,500/month)"

# Add 3 variable expense plans
echo "   🛒 Adding variable expense plans..."
curl -s -X POST "$API_BASE/planning/variable-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Groceries","planned":12000,"category":"Food","start_date":"2025-01-01","end_date":"2025-12-31"}' > /dev/null

curl -s -X POST "$API_BASE/planning/variable-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Dining Out","planned":8000,"category":"Food","start_date":"2025-01-01","end_date":"2025-12-31"}' > /dev/null

curl -s -X POST "$API_BASE/planning/variable-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Shopping","planned":10000,"category":"Shopping","start_date":"2025-01-01","end_date":"2025-12-31"}' > /dev/null
echo "   ✅ 3 variable plans added (Total: ₹30,000/month planned)"

# Add 2 investments
echo "   📈 Adding investments..."
curl -s -X POST "$API_BASE/investments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"SIP - Mutual Fund","goal":"Retirement","monthlyAmount":15000,"status":"active"}' > /dev/null

curl -s -X POST "$API_BASE/investments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"PPF","goal":"Tax Saving","monthlyAmount":12500,"status":"active"}' > /dev/null
echo "   ✅ 2 investments added (Total: ₹27,500/month)"

# Add 2 credit cards
echo "   💳 Adding credit cards..."
curl -s -X POST "$API_BASE/debts/credit-cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"HDFC Credit Card","billAmount":25000,"paidAmount":10000,"dueDate":"2025-12-15"}' > /dev/null

curl -s -X POST "$API_BASE/debts/credit-cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"ICICI Credit Card","billAmount":18000,"paidAmount":5000,"dueDate":"2025-12-20"}' > /dev/null
echo "   ✅ 2 credit cards added (Unpaid: ₹28,000)"

echo ""
echo "3️⃣  Checking activity log..."
ACTIVITIES=$(curl -s -X GET "$API_BASE/activity" -H "Authorization: Bearer $TOKEN" | jq '.data')
ACTIVITY_COUNT=$(echo $ACTIVITIES | jq 'length')

echo "   📊 Total activities logged: $ACTIVITY_COUNT"
echo "   Activity breakdown:"
echo $ACTIVITIES | jq -r '.[] | "   - \(.entity): \(.action) (Amount: \(.payload.amount // .payload.planned // .payload.monthlyAmount // "N/A"))"'

echo ""
echo "4️⃣  Testing health score consistency..."
sleep 1  # Small delay to ensure all data is processed

# Get dashboard health (5 times to ensure no caching issues)
echo "   Fetching dashboard health (5 consecutive calls)..."
for i in {1..5}; do
  DASH_HEALTH=$(curl -s -X GET "$API_BASE/dashboard" -H "Authorization: Bearer $TOKEN" | jq '.data.health.remaining')
  echo "   Dashboard call $i: ₹$DASH_HEALTH"
  sleep 0.2
done

echo ""
echo "   Fetching /health/details (5 consecutive calls)..."
for i in {1..5}; do
  HEALTH_DETAIL=$(curl -s -X GET "$API_BASE/health/details" -H "Authorization: Bearer $TOKEN" | jq '.data.health.remaining')
  echo "   Health page call $i: ₹$HEALTH_DETAIL"
  sleep 0.2
done

echo ""
echo "5️⃣  Final detailed comparison..."
DASHBOARD_DATA=$(curl -s -X GET "$API_BASE/dashboard" -H "Authorization: Bearer $TOKEN")
HEALTH_DATA=$(curl -s -X GET "$API_BASE/health/details" -H "Authorization: Bearer $TOKEN")

DASHBOARD_HEALTH=$(echo $DASHBOARD_DATA | jq '.data.health.remaining')
DASHBOARD_CATEGORY=$(echo $DASHBOARD_DATA | jq -r '.data.health.category')

HEALTH_REMAINING=$(echo $HEALTH_DATA | jq '.data.health.remaining')
HEALTH_CATEGORY=$(echo $HEALTH_DATA | jq -r '.data.health.category')
HEALTH_CALC=$(echo $HEALTH_DATA | jq -r '.data.calculation')
HEALTH_FORMULA=$(echo $HEALTH_DATA | jq -r '.data.formula')

echo ""
echo "═══════════════════════════════════════════════════"
echo "📊 FINANCIAL SUMMARY"
echo "═══════════════════════════════════════════════════"
echo "Total Income:           ₹1,60,000/month"
echo "Fixed Expenses:         ₹63,500/month"
echo "Variable Plans:         ₹30,000/month"
echo "Investments:            ₹27,500/month"
echo "Credit Card Dues:       ₹28,000 (unpaid this month)"
echo ""
echo "═══════════════════════════════════════════════════"
echo "💚 HEALTH SCORE COMPARISON"
echo "═══════════════════════════════════════════════════"
echo "Dashboard Health:       ₹$DASHBOARD_HEALTH ($DASHBOARD_CATEGORY)"
echo "Health Page Health:     ₹$HEALTH_REMAINING ($HEALTH_CATEGORY)"
echo ""
echo "Calculation Formula:"
echo "$HEALTH_FORMULA"
echo ""
echo "Detailed Calculation:"
echo "$HEALTH_CALC"
echo ""

DIFF=$(echo "$DASHBOARD_HEALTH - $HEALTH_REMAINING" | bc -l 2>/dev/null || echo "0")
ABS_DIFF=$(echo "$DIFF" | sed 's/-//')

if [ "$DASHBOARD_HEALTH" = "$HEALTH_REMAINING" ]; then
  echo "✅ PERFECT MATCH! Health scores are IDENTICAL!"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "🎉 ALL TESTS PASSED!"
  echo "═══════════════════════════════════════════════════"
elif (( $(echo "$ABS_DIFF < 0.01" | bc -l) )); then
  echo "✅ ACCEPTABLE! Difference is ₹$ABS_DIFF (< 1 paisa - floating point precision)"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "🎉 ALL TESTS PASSED!"
  echo "═══════════════════════════════════════════════════"
else
  echo "❌ MISMATCH! Difference is ₹$ABS_DIFF"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "⚠️  NEEDS INVESTIGATION"
  echo "═══════════════════════════════════════════════════"
fi

echo ""
echo "6️⃣  Verifying credit card inclusion in health calculation..."
CC_DUES=$(echo $HEALTH_DATA | jq '.data.breakdown.obligations.unpaidCreditCards')
echo "   Unpaid Credit Card Dues in calculation: ₹$CC_DUES"
if [ "$CC_DUES" = "28000" ]; then
  echo "   ✅ Credit card dues correctly included in health calculation!"
else
  echo "   ❌ Credit card dues mismatch! Expected ₹28,000, got ₹$CC_DUES"
fi

echo ""
echo "Test completed for user: $TEST_USER"




