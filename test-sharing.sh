#!/bin/bash

# MoneyMate Sharing Feature Test Script
# This script creates test accounts, adds financial data, and tests sharing functionality

BASE_URL="http://localhost:12022"

echo "🧪 MoneyMate Sharing Feature Test"
echo "=================================="
echo ""

# Function to create user and get token
create_user() {
    local username=$1
    local password=$2
    echo "📝 Creating user: $username"
    response=$(curl -s -X POST "$BASE_URL/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    token=$(echo $response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "✅ User created. Token: ${token:0:20}..."
    echo $token
}

# Function to add income
add_income() {
    local token=$1
    local name=$2
    local amount=$3
    echo "💰 Adding income: $name - ₹$amount"
    curl -s -X POST "$BASE_URL/planning/income" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$name\",\"amount\":$amount,\"frequency\":\"monthly\"}" > /dev/null
}

# Function to add fixed expense
add_fixed_expense() {
    local token=$1
    local name=$2
    local amount=$3
    echo "🏠 Adding fixed expense: $name - ₹$amount"
    curl -s -X POST "$BASE_URL/planning/fixed-expenses" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$name\",\"amount\":$amount,\"frequency\":\"monthly\",\"category\":\"General\",\"start_date\":\"2025-01-01\",\"end_date\":\"2030-01-01\",\"is_sip_flag\":false}" > /dev/null
}

# Function to add investment
add_investment() {
    local token=$1
    local name=$2
    local amount=$3
    echo "📈 Adding investment: $name - ₹$amount"
    curl -s -X POST "$BASE_URL/planning/investments" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$name\",\"goal\":\"Wealth Building\",\"monthlyAmount\":$amount,\"status\":\"active\"}" > /dev/null
}

# Function to send sharing request
send_sharing_request() {
    local token=$1
    local invitee=$2
    echo "🤝 Sending sharing request to: $invitee"
    response=$(curl -s -X POST "$BASE_URL/sharing/invite" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{\"inviteeIdentifier\":\"$invitee\"}")
    echo "Response: $response"
}

# Function to get sharing requests
get_sharing_requests() {
    local token=$1
    echo "📬 Fetching sharing requests..."
    curl -s -X GET "$BASE_URL/sharing/requests" \
        -H "Authorization: Bearer $token"
}

# Function to approve sharing request
approve_request() {
    local token=$1
    local request_id=$2
    echo "✅ Approving request: $request_id"
    curl -s -X POST "$BASE_URL/sharing/approve/$request_id" \
        -H "Authorization: Bearer $token"
}

# Function to reject sharing request
reject_request() {
    local token=$1
    local request_id=$2
    echo "❌ Rejecting request: $request_id"
    curl -s -X POST "$BASE_URL/sharing/reject/$request_id" \
        -H "Authorization: Bearer $token"
}

echo "Step 1: Creating test users"
echo "----------------------------"
token_alice=$(create_user "alice_test" "Test@1234")
token_bob=$(create_user "bob_test" "Test@1234")
token_charlie=$(create_user "charlie_test" "Test@1234")
token_diana=$(create_user "diana_test" "Test@1234")
token_eve=$(create_user "eve_test" "Test@1234")
echo ""

echo "Step 2: Adding financial data for Alice"
echo "----------------------------------------"
add_income "$token_alice" "Salary" 80000
add_fixed_expense "$token_alice" "Rent" 25000
add_fixed_expense "$token_alice" "Utilities" 3000
add_investment "$token_alice" "Equity SIP" 10000
echo ""

echo "Step 3: Adding financial data for Bob"
echo "--------------------------------------"
add_income "$token_bob" "Freelance" 60000
add_fixed_expense "$token_bob" "Rent" 20000
add_investment "$token_bob" "Mutual Fund" 8000
echo ""

echo "Step 4: Adding financial data for Charlie"
echo "------------------------------------------"
add_income "$token_charlie" "Business" 120000
add_fixed_expense "$token_charlie" "Office Rent" 40000
add_fixed_expense "$token_charlie" "Staff Salary" 30000
add_investment "$token_charlie" "Stocks" 15000
echo ""

echo "Step 5: Adding financial data for Diana"
echo "----------------------------------------"
add_income "$token_diana" "Part-time" 35000
add_fixed_expense "$token_diana" "Rent" 15000
add_investment "$token_diana" "Gold SIP" 5000
echo ""

echo "Step 6: Adding financial data for Eve"
echo "--------------------------------------"
add_income "$token_eve" "Consulting" 95000
add_fixed_expense "$token_eve" "Mortgage" 35000
add_investment "$token_eve" "PPF" 12000
echo ""

echo "Step 7: Sending sharing requests"
echo "---------------------------------"
send_sharing_request "$token_alice" "bob_test"
sleep 1
send_sharing_request "$token_alice" "charlie_test"
sleep 1
send_sharing_request "$token_alice" "diana_test"
sleep 1
send_sharing_request "$token_bob" "charlie_test"
sleep 1
send_sharing_request "$token_charlie" "eve_test"
echo ""

echo "Step 8: Checking requests for Bob"
echo "----------------------------------"
bob_requests=$(get_sharing_requests "$token_bob")
echo "$bob_requests" | python3 -m json.tool 2>/dev/null || echo "$bob_requests"
echo ""

echo "Step 9: Bob approves Alice's request"
echo "-------------------------------------"
bob_request_id=$(echo "$bob_requests" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$bob_request_id" ]; then
    approve_request "$token_bob" "$bob_request_id"
else
    echo "⚠️ No request ID found"
fi
echo ""

echo "Step 10: Checking requests for Charlie"
echo "---------------------------------------"
charlie_requests=$(get_sharing_requests "$token_charlie")
echo "$charlie_requests" | python3 -m json.tool 2>/dev/null || echo "$charlie_requests"
echo ""

echo "Step 11: Charlie rejects Alice's request but approves Bob's"
echo "-------------------------------------------------------------"
charlie_request_ids=$(echo "$charlie_requests" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
count=0
for req_id in $charlie_request_ids; do
    count=$((count+1))
    if [ $count -eq 1 ]; then
        echo "Rejecting first request (from Alice)"
        reject_request "$token_charlie" "$req_id"
    else
        echo "Approving second request (from Bob)"
        approve_request "$token_charlie" "$req_id"
    fi
done
echo ""

echo "Step 12: Diana leaves request pending (no action)"
echo "---------------------------------------------------"
diana_requests=$(get_sharing_requests "$token_diana")
echo "Diana's pending requests:"
echo "$diana_requests" | python3 -m json.tool 2>/dev/null || echo "$diana_requests"
echo ""

echo "Step 13: Eve rejects Charlie's request"
echo "---------------------------------------"
eve_requests=$(get_sharing_requests "$token_eve")
eve_request_id=$(echo "$eve_requests" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$eve_request_id" ]; then
    reject_request "$token_eve" "$eve_request_id"
else
    echo "⚠️ No request ID found"
fi
echo ""

echo "✅ Test Complete!"
echo "================="
echo ""
echo "📊 Test Summary:"
echo "  • Created 5 test users: alice_test, bob_test, charlie_test, diana_test, eve_test"
echo "  • Added different financial data for each user"
echo "  • Sent 5 sharing requests"
echo "  • Bob: APPROVED Alice's request"
echo "  • Charlie: REJECTED Alice's request, APPROVED Bob's request"
echo "  • Diana: LEFT request PENDING (no action)"
echo "  • Eve: REJECTED Charlie's request"
echo ""
echo "🔑 Test User Credentials:"
echo "  alice_test / Test@1234"
echo "  bob_test / Test@1234"
echo "  charlie_test / Test@1234"
echo "  diana_test / Test@1234"
echo "  eve_test / Test@1234"
echo ""
echo "🌐 Login at: http://localhost:5173"
echo ""

