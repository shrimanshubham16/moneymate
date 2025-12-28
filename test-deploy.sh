#!/bin/bash
# MoneyMate Pre-Deployment Test Suite
# Run this before every production deploy

set -e

echo "🧪 MoneyMate Pre-Deployment Test Suite"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

FAILED_TESTS=0

# Test 1: Backend Build
echo "
[1/6] Testing Backend Build..."
cd backend
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend builds successfully${NC}"
else
    echo -e "${RED}✗ Backend build FAILED${NC}"
    ((FAILED_TESTS++))
fi
cd ..

# Test 2: Frontend Build  
echo "
[2/6] Testing Frontend Build..."
cd web
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend builds successfully${NC}"
else
    echo -e "${RED}✗ Frontend build FAILED${NC}"
    ((FAILED_TESTS++))
fi
cd ..

# Test 3: Check Critical Routes
echo "
[3/6] Checking Critical Routes..."
ROUTES=(
    "/dashboard"
    "/fixed-expenses"
    "/variable-expenses"
    "/settings"
    "/health"
)

for route in "${ROUTES[@]}"; do
    if grep -q "path=\"$route\"" web/src/App.tsx; then
        echo -e "${GREEN}✓ Route $route exists${NC}"
    else
        echo -e "${RED}✗ Route $route MISSING${NC}"
        ((FAILED_TESTS++))
    fi
done

# Test 4: Check scheduleSave() in Critical Functions
echo "
[4/6] Checking Data Persistence (scheduleSave calls)..."
FUNCS=("addVariablePlan" "updateVariablePlan" "deleteVariablePlan")

for func in "${FUNCS[@]}"; do
    # Look within the function body (next 10 lines after function declaration)
    if grep -A 10 "export function $func" backend/src/store.ts | grep -q "scheduleSave"; then
        echo -e "${GREEN}✓ $func has scheduleSave()${NC}"
    else
        echo -e "${RED}✗ $func MISSING scheduleSave()${NC}"
        ((FAILED_TESTS++))
    fi
done

# Test 5: Check Viewport Meta Tag
echo "
[5/6] Checking Mobile Viewport Fix..."
if grep -q "user-scalable=no" web/index.html; then
    echo -e "${GREEN}✓ Viewport meta tag prevents zoom${NC}"
else
    echo -e "${RED}✗ Viewport zoom prevention MISSING${NC}"
    ((FAILED_TESTS++))
fi

# Test 6: Check Version Number
echo "
[6/6] Checking Version Display..."
if grep -q "v1\.1\." web/src/pages/AboutPage.tsx; then
    echo -e "${GREEN}✓ Version number present${NC}"
else
    echo -e "${RED}✗ Version number MISSING${NC}"
    ((FAILED_TESTS++))
fi

# Summary
echo "
======================================"
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - Safe to deploy!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED_TESTS TEST(S) FAILED - DO NOT DEPLOY!${NC}"
    exit 1
fi
