#!/bin/bash

# Rebrand MoneyMate to FinFlow
# This script replaces all instances of "MoneyMate" and "moneymate" with "FinFlow" and "finflow"

NEW_NAME="FinFlow"
NEW_NAME_LOWER="finflow"
OLD_NAME="MoneyMate"
OLD_NAME_LOWER="moneymate"

echo "🔄 Starting rebrand from $OLD_NAME to $NEW_NAME..."

# Find and replace in all source files
find web/src backend/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) -exec sed -i '' "s/$OLD_NAME/$NEW_NAME/g" {} \;
find web/src backend/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) -exec sed -i '' "s/$OLD_NAME_LOWER/$NEW_NAME_LOWER/g" {} \;

# Replace in HTML
find web -name "*.html" -exec sed -i '' "s/$OLD_NAME/$NEW_NAME/g" {} \;

# Replace in package.json files
find . -name "package.json" -exec sed -i '' "s/$OLD_NAME_LOWER/$NEW_NAME_LOWER/g" {} \;

# Replace in README and docs (but keep some references for context)
# find . -name "*.md" -type f ! -name "REBRAND*.md" ! -name "NAME-OPTIONS.md" -exec sed -i '' "s/$OLD_NAME/$NEW_NAME/g" {} \;

echo "✅ Rebrand complete! All instances of $OLD_NAME have been replaced with $NEW_NAME"
echo ""
echo "⚠️  Note: Documentation files (*.md) were NOT automatically updated."
echo "   Please review and update them manually if needed."



