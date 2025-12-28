#!/bin/bash

# Create Test Accounts for Playwright Tests
# Run this before running the test suite

API_BASE="${API_URL:-http://localhost:12022}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🧪 Creating Test Accounts for Playwright"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test accounts
declare -a accounts=(
    "qa_individual_1:Test@123456"
    "qa_individual_2:Test@123456"
    "qa_family_owner:Test@123456"
    "qa_family_spouse:Test@123456"
    "qa_family_parent:Test@123456"
)

for account in "${accounts[@]}"; do
    IFS=':' read -r username password <<< "$account"
    
    echo "Creating: $username"
    
    response=$(curl -s -X POST "$API_BASE/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    if echo "$response" | grep -q "access_token"; then
        echo "✅ $username created successfully"
    elif echo "$response" | grep -q "already exists"; then
        echo "⚠️  $username already exists (OK)"
    else
        echo "❌ Failed to create $username"
        echo "   Response: $response"
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Test Accounts Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You can now run: cd web && npx playwright test"
echo ""

