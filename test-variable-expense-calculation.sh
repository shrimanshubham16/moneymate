#!/bin/bash

# Test script to verify variable expense calculation for different billing cycles
# Usage: ./test-variable-expense-calculation.sh

BASE_URL="http://localhost:12022"
USERNAME="shrimanshubham"
PASSWORD="c0nsT@nt1"

echo "🧪 Testing Variable Expense Calculation"
echo "========================================"
echo ""

# Login
echo "1. Logging in as $USERNAME..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo $LOGIN_RESPONSE | jq .
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Test different dates to simulate different billing cycle positions
echo "2. Testing with different dates (simulating different billing cycle positions)..."
echo ""

# Get current date
TODAY=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "Today: $TODAY"

# Get health details
echo ""
echo "3. Fetching health details..."
HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/health/details?today=$TODAY" \
  -H "Authorization: Bearer $TOKEN")

echo $HEALTH_RESPONSE | jq '.data.breakdown.obligations.unpaidProratedVariable' | xargs echo "Total Variable (Backend): ₹"

# Get dashboard to see individual plans
echo ""
echo "4. Fetching dashboard data..."
DASHBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/dashboard?today=$TODAY" \
  -H "Authorization: Bearer $TOKEN")

echo ""
echo "5. Variable Plans Breakdown:"
echo "----------------------------"
echo $DASHBOARD_RESPONSE | jq -r '.data.variablePlans[] | "\(.name): Planned=₹\(.planned), ActualTotal=₹\(.actualTotal // 0)"'

echo ""
echo "6. Calculating expected total (matching backend logic)..."
MONTH_PROGRESS=$(echo $HEALTH_RESPONSE | jq -r '.data.breakdown.monthProgress')
MONTH_START_DAY=$(echo $HEALTH_RESPONSE | jq -r '.data.breakdown.monthStartDay')
REMAINING_DAYS_RATIO=$(echo "1 - $MONTH_PROGRESS" | bc)

echo "Month Progress: $MONTH_PROGRESS"
echo "Month Start Day: $MONTH_START_DAY"
echo "Remaining Days Ratio: $REMAINING_DAYS_RATIO"
echo ""

# Calculate sum manually
TOTAL=0
echo "Plan-by-plan calculation:"
echo $DASHBOARD_RESPONSE | jq -r '.data.variablePlans[]' | while read -r plan; do
  PLAN_NAME=$(echo $plan | jq -r '.name')
  PLANNED=$(echo $plan | jq -r '.planned')
  ACTUALS=$(echo $plan | jq -r '.actuals[] | select(.paymentMode != "ExtraCash" and .paymentMode != "CreditCard") | .amount' | awk '{sum+=$1} END {print sum+0}')
  PRORATED=$(echo "$PLANNED * $REMAINING_DAYS_RATIO" | bc)
  AMOUNT=$(echo "if ($ACTUALS > $PRORATED) $ACTUALS else $PRORATED" | bc)
  echo "  $PLAN_NAME: max(₹$PRORATED, ₹$ACTUALS) = ₹$AMOUNT"
  TOTAL=$(echo "$TOTAL + $AMOUNT" | bc)
done

echo ""
echo "✅ Test complete!"

