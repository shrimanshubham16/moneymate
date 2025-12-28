#!/bin/bash

API_URL="http://localhost:12022"

echo "=== Testing User Data Isolation ==="
echo ""

# Create User 1
echo "1. Creating user1..."
USER1_SIGNUP=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"pass123"}')
echo "User 1 signup: $USER1_SIGNUP"

USER1_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"pass123"}')
USER1_TOKEN=$(echo $USER1_LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "User 1 token: ${USER1_TOKEN:0:20}..."
echo ""

# User 1 adds income
echo "2. User 1 adding income (50000)..."
curl -s -X POST "$API_URL/planning/income" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"User1 Salary","amount":50000,"frequency":"monthly"}' | jq '.'
echo ""

# User 1 gets income
echo "3. User 1 fetching their income..."
USER1_INCOME=$(curl -s -X GET "$API_URL/planning/income" \
  -H "Authorization: Bearer $USER1_TOKEN")
echo "$USER1_INCOME" | jq '.data'
echo ""

# Create User 2
echo "4. Creating user2..."
USER2_SIGNUP=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"pass456"}')
echo "User 2 signup: $USER2_SIGNUP"

USER2_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"pass456"}')
USER2_TOKEN=$(echo $USER2_LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "User 2 token: ${USER2_TOKEN:0:20}..."
echo ""

# User 2 gets income (should be empty!)
echo "5. User 2 fetching income (should be EMPTY)..."
USER2_INCOME=$(curl -s -X GET "$API_URL/planning/income" \
  -H "Authorization: Bearer $USER2_TOKEN")
echo "$USER2_INCOME" | jq '.data'
echo ""

# User 2 adds their own income
echo "6. User 2 adding their own income (30000)..."
curl -s -X POST "$API_URL/planning/income" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"User2 Freelance","amount":30000,"frequency":"monthly"}' | jq '.'
echo ""

# Verify isolation
echo "7. VERIFICATION - User 1 should see ONLY their income (50000):"
curl -s -X GET "$API_URL/planning/income" -H "Authorization: Bearer $USER1_TOKEN" | jq '.data'
echo ""

echo "8. VERIFICATION - User 2 should see ONLY their income (30000):"
curl -s -X GET "$API_URL/planning/income" -H "Authorization: Bearer $USER2_TOKEN" | jq '.data'
echo ""

echo "=== Test Complete ==="
