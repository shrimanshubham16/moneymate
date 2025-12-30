#!/bin/bash
set -e

API_BASE="http://localhost:12022"
TEST_USER="testuser_$(date +%s)_$$"
TEST_PASS="TestPass123!"
TEST_EMAIL="${TEST_USER}@test.com"

echo "🧪 COMPREHENSIVE HEALTH SCORE & ACTIVITY LOG TEST"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Create test user
echo "1️⃣  Creating fresh test user: $TEST_USER"
SIGNUP_RES=$(curl -s -X POST "$API_BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")

TOKEN=$(echo $SIGNUP_RES | jq -r '.access_token')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to create user${NC}"
  echo "Response: $SIGNUP_RES"
  exit 1
fi
echo -e "${GREEN}✅ User created successfully${NC}"
echo ""

# 2. Add significant random financial data
echo "2️⃣  Adding comprehensive financial data with random amounts..."
echo ""

# Generate random amounts for more realistic testing
INCOME1=$((50000 + RANDOM % 100000))  # 50k-150k
INCOME2=$((20000 + RANDOM % 50000))    # 20k-70k
FIXED1=$((20000 + RANDOM % 40000))     # 20k-60k (Rent)
FIXED2=$((10000 + RANDOM % 20000))     # 10k-30k (Loan)
FIXED3=$((2000 + RANDOM % 5000))       # 2k-7k (Utilities)
FIXED4=$((3000 + RANDOM % 8000))       # 3k-11k (Insurance)
FIXED5=$((1000 + RANDOM % 5000))       # 1k-6k (Other)
VAR1=$((5000 + RANDOM % 15000))        # 5k-20k
VAR2=$((3000 + RANDOM % 10000))        # 3k-13k
VAR3=$((2000 + RANDOM % 8000))         # 2k-10k
INV1=$((10000 + RANDOM % 20000))       # 10k-30k
INV2=$((5000 + RANDOM % 15000))        # 5k-20k
CC1_BILL=$((15000 + RANDOM % 25000))   # 15k-40k
CC1_PAID=$((5000 + RANDOM % 10000))    # 5k-15k
CC2_BILL=$((10000 + RANDOM % 20000))   # 10k-30k
CC2_PAID=$((3000 + RANDOM % 8000))     # 3k-11k

TOTAL_INCOME=$((INCOME1 + INCOME2))
TOTAL_FIXED=$((FIXED1 + FIXED2 + FIXED3 + FIXED4 + FIXED5))
TOTAL_VAR=$((VAR1 + VAR2 + VAR3))
TOTAL_INV=$((INV1 + INV2))
CC1_UNPAID=$((CC1_BILL - CC1_PAID))
CC2_UNPAID=$((CC2_BILL - CC2_PAID))
TOTAL_CC_UNPAID=$((CC1_UNPAID + CC2_UNPAID))

echo "   📊 Generated Random Data:"
echo "      Income 1: ₹$INCOME1"
echo "      Income 2: ₹$INCOME2"
echo "      Fixed Expenses: ₹$FIXED1, ₹$FIXED2, ₹$FIXED3, ₹$FIXED4, ₹$FIXED5"
echo "      Variable Plans: ₹$VAR1, ₹$VAR2, ₹$VAR3"
echo "      Investments: ₹$INV1, ₹$INV2"
echo "      Credit Cards: Bill ₹$CC1_BILL (Paid ₹$CC1_PAID), Bill ₹$CC2_BILL (Paid ₹$CC2_PAID)"
echo ""

# Add 2 income sources
echo "   📥 Adding income sources..."
curl -s -X POST "$API_BASE/planning/income" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"source\":\"Primary Salary\",\"amount\":$INCOME1,\"frequency\":\"monthly\"}" > /dev/null

curl -s -X POST "$API_BASE/planning/income" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"source\":\"Side Income\",\"amount\":$INCOME2,\"frequency\":\"monthly\"}" > /dev/null
echo -e "   ${GREEN}✅ 2 income sources added (Total: ₹$TOTAL_INCOME/month)${NC}"

# Add 5 fixed expenses with specific names for activity log testing
echo "   💸 Adding fixed expenses..."
curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"House Rent\",\"amount\":$FIXED1,\"frequency\":\"monthly\",\"category\":\"Housing\",\"is_sip_flag\":false}" > /dev/null

curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Car Loan EMI\",\"amount\":$FIXED2,\"frequency\":\"monthly\",\"category\":\"Loan\",\"is_sip_flag\":false}" > /dev/null

curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Wifi\",\"amount\":$FIXED3,\"frequency\":\"monthly\",\"category\":\"Utilities\",\"is_sip_flag\":false}" > /dev/null

curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Health Insurance\",\"amount\":$FIXED4,\"frequency\":\"monthly\",\"category\":\"Insurance\",\"is_sip_flag\":false}" > /dev/null

curl -s -X POST "$API_BASE/planning/fixed-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Gym Membership\",\"amount\":$FIXED5,\"frequency\":\"monthly\",\"category\":\"Health\",\"is_sip_flag\":false}" > /dev/null
echo -e "   ${GREEN}✅ 5 fixed expenses added (Total: ₹$TOTAL_FIXED/month)${NC}"

# Add 3 variable expense plans
echo "   🛒 Adding variable expense plans..."
curl -s -X POST "$API_BASE/planning/variable-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Groceries\",\"planned\":$VAR1,\"category\":\"Food\",\"start_date\":\"2025-01-01\",\"end_date\":\"2025-12-31\"}" > /dev/null

curl -s -X POST "$API_BASE/planning/variable-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Dining Out\",\"planned\":$VAR2,\"category\":\"Food\",\"start_date\":\"2025-01-01\",\"end_date\":\"2025-12-31\"}" > /dev/null

curl -s -X POST "$API_BASE/planning/variable-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Shopping\",\"planned\":$VAR3,\"category\":\"Shopping\",\"start_date\":\"2025-01-01\",\"end_date\":\"2025-12-31\"}" > /dev/null
echo -e "   ${GREEN}✅ 3 variable plans added (Total: ₹$TOTAL_VAR/month planned)${NC}"

# Add 2 investments
echo "   📈 Adding investments..."
curl -s -X POST "$API_BASE/investments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"SIP Mutual Fund\",\"goal\":\"Retirement\",\"monthlyAmount\":$INV1,\"status\":\"active\"}" > /dev/null

curl -s -X POST "$API_BASE/investments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"PPF Account\",\"goal\":\"Tax Saving\",\"monthlyAmount\":$INV2,\"status\":\"active\"}" > /dev/null
echo -e "   ${GREEN}✅ 2 investments added (Total: ₹$TOTAL_INV/month)${NC}"

# Add 2 credit cards
echo "   💳 Adding credit cards..."
curl -s -X POST "$API_BASE/debts/credit-cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"HDFC Credit Card\",\"billAmount\":$CC1_BILL,\"paidAmount\":$CC1_PAID,\"dueDate\":\"2025-12-15\"}" > /dev/null

curl -s -X POST "$API_BASE/debts/credit-cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"ICICI Credit Card\",\"billAmount\":$CC2_BILL,\"paidAmount\":$CC2_PAID,\"dueDate\":\"2025-12-20\"}" > /dev/null
echo -e "   ${GREEN}✅ 2 credit cards added (Unpaid: ₹$TOTAL_CC_UNPAID)${NC}"

echo ""
echo "3️⃣  Testing Activity Log Format..."
echo "   Fetching activity log..."
ACTIVITIES=$(curl -s -X GET "$API_BASE/activity" -H "Authorization: Bearer $TOKEN" | jq '.data')
ACTIVITY_COUNT=$(echo $ACTIVITIES | jq 'length')

echo "   📊 Total activities logged: $ACTIVITY_COUNT"
echo ""
echo "   Activity Log Entries (checking format):"
echo "   ---------------------------------------"

# Check for fixed expense activities
FIXED_EXPENSE_ACTIVITIES=$(echo $ACTIVITIES | jq '[.[] | select(.entity == "fixed_expense")]')
FIXED_COUNT=$(echo $FIXED_EXPENSE_ACTIVITIES | jq 'length')

if [ "$FIXED_COUNT" -ge 5 ]; then
  echo -e "   ${GREEN}✅ Found $FIXED_COUNT fixed expense activities${NC}"
  echo ""
  echo "   Sample fixed expense activities (should show amount and name):"
  echo $FIXED_EXPENSE_ACTIVITIES | jq -r '.[0:3] | .[] | "   - Entity: \(.entity) | Action: \(.action) | Payload: \(.payload | Name: \(.payload.name // "N/A") | Amount: \(payload.amount // "N/A")"'
  
  # Check if payload has name and amount
  HAS_NAME_AND_AMOUNT=$(echo $FIXED_EXPENSE_ACTIVITIES | jq '[.[] | select(.payload.name != null and .payload.amount != null)] | length')
  if [ "$HAS_NAME_AND_AMOUNT" -eq "$FIXED_COUNT" ]; then
    echo -e "   ${GREEN}✅ All fixed expense activities have name and amount in payload!${NC}"
  else
    echo -e "   ${RED}❌ Some fixed expense activities missing name or amount in payload${NC}"
  fi
else
  echo -e "   ${RED}❌ Expected at least 5 fixed expense activities, found $FIXED_COUNT${NC}"
fi

echo ""
echo "4️⃣  Testing Health Score Consistency (10 consecutive calls each)..."
echo ""

# Get dashboard health (10 times)
echo "   📊 Dashboard Health Scores:"
DASHBOARD_SCORES=()
for i in {1..10}; do
  DASH_HEALTH=$(curl -s -X GET "$API_BASE/dashboard" -H "Authorization: Bearer $TOKEN" | jq '.data.health.remaining')
  DASHBOARD_SCORES+=($DASH_HEALTH)
  printf "   Call %2d: ₹%s\n" $i "$DASH_HEALTH"
  sleep 0.1
done

echo ""
echo "   💚 Health Details Page Scores:"
HEALTH_SCORES=()
for i in {1..10}; do
  HEALTH_DETAIL=$(curl -s -X GET "$API_BASE/health/details" -H "Authorization: Bearer $TOKEN" | jq '.data.health.remaining')
  HEALTH_SCORES+=($HEALTH_DETAIL)
  printf "   Call %2d: ₹%s\n" $i "$HEALTH_DETAIL"
  sleep 0.1
done

echo ""
echo "5️⃣  Detailed Analysis..."
echo ""

# Calculate averages and differences
DASH_AVG=$(echo "${DASHBOARD_SCORES[@]}" | awk '{sum=0; for(i=1;i<=NF;i++) sum+=$i; print sum/NF}')
HEALTH_AVG=$(echo "${HEALTH_SCORES[@]}" | awk '{sum=0; for(i=1;i<=NF;i++) sum+=$i; print sum/NF}')

# Get final values for detailed comparison
DASHBOARD_DATA=$(curl -s -X GET "$API_BASE/dashboard" -H "Authorization: Bearer $TOKEN")
HEALTH_DATA=$(curl -s -X GET "$API_BASE/health/details" -H "Authorization: Bearer $TOKEN")

DASHBOARD_HEALTH=$(echo $DASHBOARD_DATA | jq '.data.health.remaining')
DASHBOARD_CATEGORY=$(echo $DASHBOARD_DATA | jq -r '.data.health.category')

HEALTH_REMAINING=$(echo $HEALTH_DATA | jq '.data.health.remaining')
HEALTH_CATEGORY=$(echo $HEALTH_DATA | jq -r '.data.health.category')
HEALTH_CALC=$(echo $HEALTH_DATA | jq -r '.data.calculation')
HEALTH_FORMULA=$(echo $HEALTH_DATA | jq -r '.data.formula')

# Get breakdown for verification
BREAKDOWN=$(echo $HEALTH_DATA | jq '.data.breakdown')
AVAILABLE_FUNDS=$(echo $BREAKDOWN | jq '.availableFunds')
UNPAID_FIXED=$(echo $BREAKDOWN | jq '.obligations.unpaidFixed')
UNPAID_VAR=$(echo $BREAKDOWN | jq '.obligations.unpaidProratedVariable')
UNPAID_INV=$(echo $BREAKDOWN | jq '.obligations.unpaidInvestments')
UNPAID_CC=$(echo $BREAKDOWN | jq '.obligations.unpaidCreditCards')
TOTAL_OBLIGATIONS=$(echo $BREAKDOWN | jq '.totalObligations')

echo "═══════════════════════════════════════════════════"
echo "📊 FINANCIAL SUMMARY"
echo "═══════════════════════════════════════════════════"
echo "Total Income:           ₹$TOTAL_INCOME/month"
echo "Fixed Expenses:         ₹$TOTAL_FIXED/month"
echo "Variable Plans:         ₹$TOTAL_VAR/month"
echo "Investments:            ₹$TOTAL_INV/month"
echo "Credit Card Dues:       ₹$TOTAL_CC_UNPAID (unpaid)"
echo ""
echo "═══════════════════════════════════════════════════"
echo "💚 HEALTH SCORE COMPARISON"
echo "═══════════════════════════════════════════════════"
echo "Dashboard Health:       ₹$DASHBOARD_HEALTH ($DASHBOARD_CATEGORY)"
echo "Health Page Health:     ₹$HEALTH_REMAINING ($HEALTH_CATEGORY)"
echo ""
echo "Dashboard Average (10 calls): ₹$DASH_AVG"
echo "Health Page Average (10 calls): ₹$HEALTH_AVG"
echo ""

# Calculate difference
DIFF=$(echo "$DASHBOARD_HEALTH - $HEALTH_REMAINING" | bc -l 2>/dev/null || echo "0")
ABS_DIFF=$(echo "$DIFF" | sed 's/-//' | awk '{printf "%.2f", $1}')

echo "Difference:             ₹$ABS_DIFF"
echo ""

echo "Calculation Breakdown:"
echo "  Available Funds:      ₹$AVAILABLE_FUNDS"
echo "  Unpaid Fixed:         ₹$UNPAID_FIXED"
echo "  Unpaid Variable:      ₹$UNPAID_VAR"
echo "  Unpaid Investments:   ₹$UNPAID_INV"
echo "  Unpaid Credit Cards:  ₹$UNPAID_CC"
echo "  Total Obligations:    ₹$TOTAL_OBLIGATIONS"
echo ""
echo "Calculation Formula:"
echo "  $HEALTH_FORMULA"
echo ""
echo "Detailed Calculation:"
echo "  $HEALTH_CALC"
echo ""

# Expected calculation
EXPECTED_HEALTH=$(echo "$AVAILABLE_FUNDS - $TOTAL_OBLIGATIONS" | bc -l 2>/dev/null || echo "0")
echo "Expected Health:        ₹$EXPECTED_HEALTH"
echo ""

echo "═══════════════════════════════════════════════════"
echo "📋 TEST RESULTS"
echo "═══════════════════════════════════════════════════"

# Check activity log format
if [ "$HAS_NAME_AND_AMOUNT" -eq "$FIXED_COUNT" ] && [ "$FIXED_COUNT" -ge 5 ]; then
  echo -e "${GREEN}✅ Activity Log Format: PASSED${NC}"
  echo "   All fixed expense activities include name and amount in payload"
else
  echo -e "${RED}❌ Activity Log Format: FAILED${NC}"
  echo "   Some activities missing name or amount"
fi

# Check health score consistency
THRESHOLD=0.01  # 1 paisa
if (( $(echo "$ABS_DIFF < $THRESHOLD" | bc -l) )); then
  echo -e "${GREEN}✅ Health Score Consistency: PASSED${NC}"
  echo "   Difference (₹$ABS_DIFF) is within acceptable floating-point precision"
elif (( $(echo "$ABS_DIFF < 1.0" | bc -l) )); then
  echo -e "${YELLOW}⚠️  Health Score Consistency: MINOR DIFFERENCE${NC}"
  echo "   Difference (₹$ABS_DIFF) is small but above threshold"
else
  echo -e "${RED}❌ Health Score Consistency: FAILED${NC}"
  echo "   Significant difference detected: ₹$ABS_DIFF"
  echo "   This needs investigation!"
fi

# Check credit card inclusion
if [ "$UNPAID_CC" = "$TOTAL_CC_UNPAID" ]; then
  echo -e "${GREEN}✅ Credit Card Inclusion: PASSED${NC}"
  echo "   Credit card dues correctly included in calculation"
else
  echo -e "${YELLOW}⚠️  Credit Card Inclusion: VERIFY${NC}"
  echo "   Expected ₹$TOTAL_CC_UNPAID, got ₹$UNPAID_CC"
fi

echo ""
echo "═══════════════════════════════════════════════════"
if [ "$HAS_NAME_AND_AMOUNT" -eq "$FIXED_COUNT" ] && [ "$FIXED_COUNT" -ge 5 ] && (( $(echo "$ABS_DIFF < $THRESHOLD" | bc -l) )); then
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  echo "═══════════════════════════════════════════════════"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED - INVESTIGATION NEEDED${NC}"
  echo "═══════════════════════════════════════════════════"
  exit 1
fi


