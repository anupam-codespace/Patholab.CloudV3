#!/bin/bash
set -e

echo "=== Patholab Cloud iOS Deployment Assistant ==="
echo "Bundle ID: com.patholab.cloud"
echo ""

# 1. Sync Capacitor
echo "Step 1: Syncing Capacitor configuration..."
npx cap sync ios

# 2. Open project in Xcode or build via command-line
echo ""
echo "Step 2: How would you like to build?"
echo "1) Archive and compile via Command Line (Requires provisioning/signing setup)"
echo "2) Open in Xcode to select Team ID and sign manually (Recommended)"
read -p "Select option (1 or 2): " build_option

if [ "$build_option" = "1" ]; then
    echo "Archiving iOS Release build..."
    cd ios/App
    xcodebuild archive \
      -project App.xcodeproj \
      -scheme App \
      -configuration Release \
      -archivePath App.xcarchive
    /usr/libexec/PlistBuddy -c "Set :ApplicationProperties:Team 3T35CAJ6B2" "App.xcarchive/Info.plist" 2>/dev/null || /usr/libexec/PlistBuddy -c "Add :ApplicationProperties:Team string 3T35CAJ6B2" "App.xcarchive/Info.plist"
    
    echo ""
    echo "=== ARCHIVE CREATED SUCCESSFULLY WITH TEAM ID 3T35CAJ6B2 ==="
    echo "Archive Path: ios/App/App.xcarchive"
    echo ""
    echo "Next steps:"
    echo "1. Open Xcode -> Window -> Organizer."
    echo "2. Select 'App' from the list."
    echo "3. Click 'Distribute App' on the right."
    echo "4. Choose 'App Store Connect' -> 'Upload' and follow the prompts."
else
    echo "Opening project in Xcode..."
    open ios/App/App.xcodeproj
    
    echo ""
    echo "=== XCODE IS NOW OPENING ==="
    echo "Follow these steps to deploy to App Store Connect:"
    echo "1. In Xcode, click the top-level 'App' project node in the left sidebar."
    echo "2. Select the 'App' target, then go to the 'Signing & Capabilities' tab."
    echo "3. Under 'Team', select your Apple Developer Account/Team."
    echo "4. Set the active build scheme to 'Any iOS Device (arm64)' in the top bar."
    echo "5. Select 'Product' (from the Mac menu bar) -> 'Archive'."
    echo "6. When the Organizer window appears, select your build and click 'Distribute App'."
fi
