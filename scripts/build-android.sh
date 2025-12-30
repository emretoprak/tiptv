#!/bin/bash

# Android APK build script for TIPTV - Modern signing approach

set -e  # Exit on any error

echo "🚀 Building Android APK for TIPTV..."

# Check if we're in the right directory
if [ ! -f "src-tauri/tauri.conf.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check for required tools
if ! command -v cargo-tauri &> /dev/null; then
    echo "📦 Installing Tauri CLI..."
    cargo install tauri-cli --version "^2.0" --locked
fi

# Check Android SDK and apksigner
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME not set! Please install Android SDK."
    exit 1
fi

APKSIGNER=$(find $ANDROID_HOME/build-tools -name "apksigner" 2>/dev/null | head -1)
if [ -z "$APKSIGNER" ]; then
    echo "❌ apksigner not found! Please install Android SDK build-tools."
    exit 1
fi

# Check keystore and password
if [ ! -f "keystore/tiptv-release-key.keystore" ]; then
    echo "❌ Keystore not found! Run 'npm run android:setup' first."
    exit 1
fi

if [ -z "$KEYSTORE_PASSWORD" ]; then
    echo "❌ KEYSTORE_PASSWORD environment variable not set!"
    echo "💡 Set it with: export KEYSTORE_PASSWORD=your_password"
    exit 1
fi

# Add Android targets
echo "🎯 Adding Android targets..."
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

# Install dependencies and generate icons
echo "📦 Installing frontend dependencies..."
npm ci

echo "🎨 Generating icons..."
npm run generate:icons

# Clean previous builds and APKs
echo "🧹 Cleaning previous builds..."
rm -f *.apk
cd src-tauri
rm -rf gen/android/app/build
rm -rf target/*/android

# Initialize and build
echo "🔧 Initializing Android project..."
cargo tauri android init || echo "Android project already initialized"

echo "📱 Building APK..."
cargo tauri android build

# Process the built APK
APK_PATH=$(find gen/android/app/build/outputs/apk -name "*.apk" -type f | head -1)

if [ -z "$APK_PATH" ]; then
    echo "❌ No APK found after build!"
    exit 1
fi

echo "📦 APK found at: $APK_PATH"

# Determine APK type and create appropriate signed version
APK_BASENAME=$(basename "$APK_PATH" .apk)
if [[ "$APK_BASENAME" == *"debug"* ]]; then
    SIGNED_APK="../TIPTV-debug-signed.apk"
    echo "🔧 Processing debug APK..."
else
    SIGNED_APK="../TIPTV-release-signed.apk"
    echo "🔧 Processing release APK..."
fi

# Copy and sign APK
echo "🔐 Signing APK with modern apksigner..."
cp "$APK_PATH" "$SIGNED_APK"

$APKSIGNER sign \
    --ks ../keystore/tiptv-release-key.keystore \
    --ks-key-alias tiptv \
    --ks-pass pass:$KEYSTORE_PASSWORD \
    --key-pass pass:$KEYSTORE_PASSWORD \
    "$SIGNED_APK"

# Verify signature
echo "🔍 Verifying APK signature..."
if $APKSIGNER verify --verbose "$SIGNED_APK"; then
    echo "✅ APK successfully signed and verified!"
    
    # Show APK info
    APK_SIZE=$(ls -lh "$SIGNED_APK" | awk '{print $5}')
    echo "📋 Final APK: $(basename "$SIGNED_APK") ($APK_SIZE)"
    
    # Copy to standard name for easy access
    if [[ "$SIGNED_APK" == *"release"* ]]; then
        cp "$SIGNED_APK" "../TIPTV.apk"
        echo "📱 Ready to install: TIPTV.apk"
    fi
else
    echo "❌ APK signature verification failed!"
    exit 1
fi

cd ..
echo "🎉 Android build completed successfully!"
echo ""
echo "📱 Installation:"
echo "   adb install TIPTV.apk"
echo "   or copy $(basename "$SIGNED_APK") to your Android device"