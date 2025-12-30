# Android Build Guide

This guide explains the steps required to build the Android APK for the TIPTV application.

## Requirements

### Local Development
- **Rust** (1.77.2+)
- **Node.js** (20+)
- **Java JDK** (17+)
- **Android SDK** and **NDK**
- **Tauri CLI** (2.0+)

### GitHub Actions
GitHub Actions automatically installs all requirements.

## Local Build

### 1. Environment Setup

```bash
# Add Android targets
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

# Install Tauri CLI
cargo install tauri-cli --version "^2.0" --locked
```

### 2. Android SDK Installation

Install Android Studio or use command line tools:

```bash
# Set Android SDK path
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux

# Install NDK
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "ndk;27.1.12297006"
export NDK_HOME=$ANDROID_HOME/ndk/27.1.12297006
```

### 3. Build Process

```bash
# Automated build script (also generates icons)
npm run android:build

# Or manually
npm run generate:icons  # Generate icons
cd src-tauri
cargo tauri android init
cargo tauri android build
```

### 4. APK Signing (Required)

```bash
# Create keystore and set up GitHub Secrets
npm run android:setup

# Manual signing
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore keystore/tiptv-release-key.keystore \
  -storepass YOUR_PASSWORD \
  app-universal-release-unsigned.apk tiptv

# APK alignment
zipalign -v 4 app-universal-release-unsigned.apk TIPTV-release.apk
```

## GitHub Actions Build

### 1. Setting up Secrets

Go to Repository Settings > Secrets and variables > Actions and add these secrets:

- `ANDROID_KEYSTORE_BASE64`: Base64 encoded keystore file
- `KEYSTORE_PASSWORD`: Keystore password

### 2. Automatic Build

```bash
# Create release tag
git tag v1.0.4
git push origin v1.0.4

# Or manual trigger
# Manually run "Release" workflow in GitHub Actions tab
```

### 3. Build Outputs

GitHub Actions creates this file:
- **Signed APK**: `TIPTV-v1.0.4-signed.apk` (production ready)

⚠️ **Note**: Unsigned APK is no longer created. Keystore and password are required.

## Supported Architectures

- **arm64-v8a**: Modern ARM64 devices
- **armeabi-v7a**: Legacy ARM devices
- **x86**: Intel emulators
- **x86_64**: Intel emulators (64-bit)

## Troubleshooting

### Build Errors

```bash
# Clear cache
cd src-tauri
rm -rf gen/android/app/build
rm -rf target

# Reinstall targets
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

### NDK Issues

```bash
# Check NDK path
echo $NDK_HOME
echo $ANDROID_NDK_ROOT

# Reinstall NDK
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --uninstall "ndk;27.1.12297006"
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "ndk;27.1.12297006"
```

### Keystore Issues

```bash
# Check keystore information
keytool -list -v -keystore keystore/tiptv-release-key.keystore

# Create new keystore
npm run android:setup
```

## File Structure

```
├── scripts/
│   ├── build-android.sh      # Main build script
│   └── setup-keystore.sh     # Keystore setup script
├── src-tauri/
│   ├── gen/android/          # Android project files
│   └── tauri.conf.json       # Tauri configuration
├── keystore/                 # Keystore files (not committed to git)
└── .github/workflows/
    └── release.yml           # GitHub Actions workflow
```

## Security Notes

- **Never commit keystore files to git**
- **Keep GitHub Secrets secure**
- **Protect production keystore with different passwords**
- **Don't forget to sign release APKs**

## More Information

- [Tauri Android Guide](https://tauri.app/v1/guides/building/android)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)