#!/bin/bash

echo "=== Testing MoneyMate Health Score Endpoints ==="
echo ""

# Login
echo "1. Logging in..."
TOKEN=$(curl -s -X POST http://localhost:12022/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"shriman_shubham","password":"c0nsT@nt"}' | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "   ❌ Login failed!"
  exit 1
fi
echo "   ✅ Login successful"
echo ""

# Test dashboard endpoint
echo "2. Testing /dashboard endpoint..."
DASHBOARD_RESPONSE=$(curl -s http://localhost:12022/dashboard \
  -H "Authorization: Bearer $TOKEN")

DASHBOARD_HEALTH=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.health.remaining')
DASHBOARD_CATEGORY=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.health.category')

echo "   Health Remaining: $DASHBOARD_HEALTH"
echo "   Category: $DASHBOARD_CATEGORY"
echo ""

# Test health/details endpoint
echo "3. Testing /health/details endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:12022/health/details \
  -H "Authorization: Bearer $TOKEN")

HEALTH_REMAINING=$(echo "$HEALTH_RESPONSE" | jq -r '.data.health')
HEALTH_CATEGORY=$(echo "$HEALTH_RESPONSE" | jq -r '.data.category')

echo "   Health Remaining: $HEALTH_REMAINING"
echo "   Category: $HEALTH_CATEGORY"
echo ""

# Compare
echo "4. Comparison:"
echo "   Dashboard: $DASHBOARD_HEALTH"
echo "   Health Details: $HEALTH_REMAINING"
echo ""

if [ "$DASHBOARD_HEALTH" == "$HEALTH_REMAINING" ]; then
  echo "   ✅ MATCH! Both endpoints return the same value"
else
  echo "   ❌ MISMATCH! Values are different"
fi
