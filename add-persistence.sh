#!/bin/bash
# Script to add scheduleSave() calls to all mutation functions in store.ts

cd "/Users/shubham.shrivastava/Documents/AntiGravity WP/Tools/MoneyMate/backend/src"

# Add scheduleSave() before every "return" in mutation functions
# This is a simple approach - add it right before the return statement

functions_to_update=(
  "addIncome"
  "updateIncome"
  "deleteIncome"
  "addFixedExpense"
  "updateFixedExpense"
  "deleteFixedExpense"
  "addVariablePlan"
  "updateVariablePlan"
  "deleteVariablePlan"
  "addVariableActual"
  "addInvestment"
  "updateInvestment"
  "deleteInvestment"
  "pauseInvestment"
  "resumeInvestment"
  "addFutureBomb"
  "updateFutureBomb"
  "deleteFutureBomb"
  "createSharingRequest"
  "approveRequest"
  "rejectRequest"
  "removeMember"
  "addCreditCard"
  "updateCreditCard"
  "deleteCreditCard"
  "addActivity"
  "updateThemeState"
  "updateUser"
  "incrementFailedLoginAttempts"
  "resetFailedLoginAttempts"
  "lockAccount"
  "unlockAccount"
)

echo "Adding scheduleSave() calls to mutation functions..."
echo "This will be done manually via search_replace for safety"

