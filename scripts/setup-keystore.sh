#!/bin/bash

# Setup script for Android keystore

set -e

echo "🔐 Setting up Android keystore for GitHub Actions..."

KEYSTORE_FILE="keystore/tiptv-release-key.keystore"
KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-$(openssl rand -base64 32)}"

# Create keystore directory
mkdir -p keystore

# Check if keystore already exists
if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  Keystore already exists at $KEYSTORE_FILE"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing keystore."
        exit 0
    fi
    rm -f "$KEYSTORE_FILE"
fi

# Generate keystore
echo "🔑 Generating new keystore..."
keytool -genkey -v \
    -keystore "$KEYSTORE_FILE" \
    -alias tiptv \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storetype JKS \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEYSTORE_PASSWORD" \
    -dname "CN=TIPTV, OU=Development, O=Toprak, L=Istanbul, ST=Istanbul, C=TR"

echo "✅ Keystore created successfully!"

# Convert to base64 for GitHub Secrets
echo "📋 Converting keystore to base64 for GitHub Secrets..."
BASE64_KEYSTORE=$(base64 -i "$KEYSTORE_FILE")

echo ""
echo "🔐 GitHub Secrets Setup:"
echo "========================"
echo ""
echo "1. Go to your GitHub repository settings"
echo "2. Navigate to Secrets and variables > Actions"
echo "3. Add these secrets:"
echo ""
echo "Secret Name: ANDROID_KEYSTORE_BASE64"
echo "Secret Value:"
echo "$BASE64_KEYSTORE"
echo ""
echo "Secret Name: KEYSTORE_PASSWORD"
echo "Secret Value: $KEYSTORE_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: Save this password securely! You'll need it for local builds:"
echo "export KEYSTORE_PASSWORD=\"$KEYSTORE_PASSWORD\""
echo ""
echo "⚠️  IMPORTANT: Keep these secrets secure and never commit the keystore file to git!"
echo ""
echo "📝 The keystore file has been added to .gitignore"

# Add keystore to gitignore if not already there
if ! grep -q "keystore/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Android keystore" >> .gitignore
    echo "keystore/" >> .gitignore
    echo "*.keystore" >> .gitignore
    echo "✅ Added keystore to .gitignore"
fi

echo ""
echo "🎉 Setup complete! You can now use the GitHub Actions workflow to build signed APKs."