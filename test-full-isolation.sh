#!/bin/bash

API_URL="http://localhost:12022"

echo "=== Comprehensive User Data Isolation Test ===" echo ""

# Create users
echo "Creating user1..."
USER1=$(curl -s -X POST "$API_URL/auth/signup" -H "Content-Type: application/json" -d '{"username":"testuser1","password":"Pass123!@#"}')
TOKEN1=$(echo $USER1 | jq -r '.access_token')

echo "Creating user2..."
USER2=$(curl -s -X POST "$API_URL/auth/signup" -H "Content-Type: application/json" -d '{"username":"testuser2","password":"Pass456!@#"}')
TOKEN2=$(echo $USER2 | jq -r '.access_token')

echo ""
echo "=== Testing Data Isolation ==="
echo ""

# Test Income
echo "1. INCOME: User1 adds income..."
curl -s -X POST "$API_URL/planning/income" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" -d '{"source":"User1 Income","amount":50000,"frequency":"monthly"}' > /dev/null
USER2_INCOME=$(curl -s -X GET "$API_URL/planning/income" -H "Authorization: Bearer $TOKEN2" | jq '.data | length')
if [ "$USER2_INCOME" == "0" ]; then
  echo "✅ INCOME: Isolated"
else
  echo "❌ INCOME: NOT ISOLATED (User2 sees $USER2_INCOME items)"
fi

# Test Fixed Expenses
echo "2. FIXED EXPENSES: User1 adds fixed expense..."
curl -s -X POST "$API_URL/planning/fixed-expenses" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" -d '{"name":"User1 Rent","amount":10000,"frequency":"monthly","category":"Housing"}' > /dev/null
USER2_FIXED=$(curl -s -X GET "$API_URL/planning/fixed-expenses" -H "Authorization: Bearer $TOKEN2" | jq '.data | length')
if [ "$USER2_FIXED" == "0" ]; then
  echo "✅ FIXED EXPENSES: Isolated"
else
  echo "❌ FIXED EXPENSES: NOT ISOLATED (User2 sees $USER2_FIXED items)"
fi

# Test Variable Expenses
echo "3. VARIABLE EXPENSES: User1 adds variable plan..."
curl -s -X POST "$API_URL/planning/variable-expenses" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" -d '{"name":"User1 Entertainment","planned":5000,"category":"Fun","start_date":"2025-01-01"}' > /dev/null
USER2_VAR=$(curl -s -X GET "$API_URL/planning/variable-expenses" -H "Authorization: Bearer $TOKEN2" | jq '.data | length')
if [ "$USER2_VAR" == "0" ]; then
  echo "✅ VARIABLE EXPENSES: Isolated"
else
  echo "❌ VARIABLE EXPENSES: NOT ISOLATED (User2 sees $USER2_VAR items)"
fi

# Test Investments
echo "4. INVESTMENTS: User1 adds investment..."
curl -s -X POST "$API_URL/investments" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" -d '{"name":"User1 401k","goal":"Retirement","monthlyAmount":5000,"status":"active"}' > /dev/null
USER2_INV=$(curl -s -X GET "$API_URL/investments" -H "Authorization: Bearer $TOKEN2" | jq '.data | length')
if [ "$USER2_INV" == "0" ]; then
  echo "✅ INVESTMENTS: Isolated"
else
  echo "❌ INVESTMENTS: NOT ISOLATED (User2 sees $USER2_INV items)"
fi

# Test Future Bombs
echo "5. FUTURE BOMBS: User1 adds future bomb..."
curl -s -X POST "$API_URL/future-bombs" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" -d '{"name":"User1 Vacation","dueDate":"2025-06-01","totalAmount":50000,"savedAmount":10000}' > /dev/null
USER2_FB=$(curl -s -X GET "$API_URL/future-bombs" -H "Authorization: Bearer $TOKEN2" | jq '.data | length')
if [ "$USER2_FB" == "0" ]; then
  echo "✅ FUTURE BOMBS: Isolated"
else
  echo "❌ FUTURE BOMBS: NOT ISOLATED (User2 sees $USER2_FB items)"
fi

#Test Credit Cards
echo "6. CREDIT CARDS: User1 adds credit card..."
curl -s -X POST "$API_URL/debts/credit-cards" -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" -d '{"name":"User1 Visa","statementDate":"2025-01-15","dueDate":"2025-01-25","billAmount":15000}' > /dev/null
USER2_CC=$(curl -s -X GET "$API_URL/debts/credit-cards" -H "Authorization: Bearer $TOKEN2" | jq '.data | length')
if [ "$USER2_CC" == "0" ]; then
  echo "✅ CREDIT CARDS: Isolated"
else
  echo "❌ CREDIT CARDS: NOT ISOLATED (User2 sees $USER2_CC items)"
fi

echo ""
echo "=== Test Complete ==="
