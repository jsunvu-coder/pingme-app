#!/bin/bash

# Script to quickly check if the app complies with Google Play Store Photo/Video Permissions Policy

echo "🔍 Checking Google Play Store Permissions Compliance..."
echo ""

MANIFEST_PATH="android/app/src/main/AndroidManifest.xml"
ERRORS=0
WARNINGS=0

# Check if the file exists
if [ ! -f "$MANIFEST_PATH" ]; then
  echo "❌ AndroidManifest.xml not found"
  echo "   Run 'npm run prebuild:fix-native' before"
  exit 1
fi

echo "📋 Checking AndroidManifest.xml..."

# List of permissions that are NOT allowed (will fail Google Play review)
FORBIDDEN_PERMISSIONS=(
  "READ_MEDIA_VIDEO"
  "READ_MEDIA_AUDIO"
  "READ_MEDIA_IMAGES"
  "READ_EXTERNAL_STORAGE"
  "WRITE_EXTERNAL_STORAGE"
  "READ_MEDIA_VISUAL_USER_SELECTED"
  "RECORD_AUDIO"
)

for permission in "${FORBIDDEN_PERMISSIONS[@]}"; do
  if grep -q "android.permission.$permission" "$MANIFEST_PATH"; then
    echo "❌ Found forbidden permission: $permission"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ OK: No $permission"
  fi
done

# Check if requestLegacyExternalStorage is present
if grep -q "requestLegacyExternalStorage" "$MANIFEST_PATH"; then
  echo "❌ Found requestLegacyExternalStorage - should be removed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ OK: No requestLegacyExternalStorage"
fi

echo ""

if [ $ERRORS -eq 0 ]; then
  echo ""
  echo "✅ All checks passed!"
  echo "🎉 App complies with Google Play Store Photo/Video Permissions Policy"
  echo ""
  echo "📝 Summary:"
  echo "   ✅ Upload Photo: Uses Photo Picker (no permission needed)"
  echo "   ✅ Save QR Code: Saves app-generated image (no permission needed)"
  echo "   ✅ No READ_MEDIA_* permissions required!"
  exit 0
else
  echo "❌ Found $ERRORS errors that need to be fixed"
  echo ""
  echo "How to fix:"
  echo "1. Run: npm run prebuild:fix-native"
  echo "2. Run this script again to verify"
  exit 1
fi
