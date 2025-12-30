#!/bin/bash

# Find the Info.plist in the built app
PLIST_PATH="src-tauri/target/aarch64-apple-darwin/release/bundle/macos/TIPTV.app/Contents/Info.plist"

if [ -f "$PLIST_PATH" ]; then
    echo "Adding NSAppTransportSecurity to Info.plist..."
    /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity dict" "$PLIST_PATH" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool true" "$PLIST_PATH" 2>/dev/null || true
    echo "Done!"
else
    echo "Info.plist not found at $PLIST_PATH"
fi
