# Build Guide - PingMe App

Complete guide to set up the environment and build the PingMe application for iOS and Android.

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Install Required Tools](#install-required-tools)
3. [Project Configuration](#project-configuration)
4. [Firebase Configuration](#firebase-configuration)
5. [Code Signing Configuration](#code-signing-configuration)
6. [Building the Application](#building-the-application)
7. [Troubleshooting](#troubleshooting)

---

## 🖥️ System Requirements

### Required

- **macOS** (required for iOS development)
- **Node.js** >= 18.x
- **npm** or **yarn**
- **Ruby** >= 3.0 (to run fastlane)
- **Bundler** (Ruby package manager)
- **Xcode** >= 15.0 (for iOS)
- **Android Studio** (for Android) or Android SDK
- **Git**

### Optional but Recommended

- **Firebase CLI** (for Firebase App Distribution)
- **CocoaPods** (automatically installed when running fastlane)

---

## 🔧 Install Required Tools

### 1. Node.js and npm

```bash
# Check version
node --version  # Need >= 18.x
npm --version

# If not installed, install via Homebrew
brew install node
```

### 2. Ruby and Bundler

```bash
# Check Ruby version
ruby --version  # Need >= 3.0

# Install Bundler
gem install bundler
```

### 3. Xcode (for iOS)

1. Download Xcode from App Store or [developer.apple.com](https://developer.apple.com/xcode/)
2. Open Xcode and accept the license:
   ```bash
   sudo xcodebuild -license accept
   ```
3. Install Command Line Tools:
   ```bash
   xcode-select --install
   ```

### 4. Android Studio (for Android)

1. Download Android Studio from [developer.android.com](https://developer.android.com/studio)
2. Install Android SDK and required components
3. Configure `ANDROID_HOME` environment variable:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
   Add to `~/.zshrc` or `~/.bash_profile`

### 5. Firebase CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Or use curl
curl -sL https://firebase.tools | bash

# Login to Firebase
firebase login
```

### 6. Fastlane

Fastlane will be automatically installed via Bundler on first run. No need to install globally.

---

## 📦 Project Configuration

### Step 1: Clone repository

```bash
git clone <repository-url>
cd pingme-app
```

### Step 2: Install dependencies

```bash
# Install Node.js dependencies
npm install

# Or use yarn
yarn install
```

### Step 3: Prebuild native projects

```bash
# Run prebuild to create ios/ and android/ folders
npm run prebuild

# Or if you have fastlane backup, restore after prebuild:
npm run prebuild:restore
```

### Step 4: Restore Fastlane configuration

After `expo prebuild`, fastlane and .env files will be deleted. Restore from backup:

```bash
# Restore from distribute/ backup
npm run restore:fastlane

# Or run script directly
./restore-fastlane.sh
```

The script will:

- Restore `.env` files
- Restore `fastlane/` directories
- Restore `Gemfile` if present
- Ask if you want to install bundle dependencies

### Step 5: Install Ruby dependencies

```bash
# iOS
cd ios
bundle install
cd ..

# Android
cd android
bundle install
cd ..
```

---

## 🔥 Firebase Configuration

### Step 1: Login to Firebase

```bash
firebase login
```

### Step 2: Setup Firebase App ID

#### Method 1: Manual setup (recommended)

**Android:**

```bash
cd android
cat > .env << EOF
FIREBASE_APP_ID=1:YOUR_PROJECT_ID:android:YOUR_APP_ID
FIREBASE_TESTERS=tester1@example.com,tester2@example.com
FIREBASE_TESTER_GROUPS=qa
EOF
```

**iOS:**

```bash
cd ios
cat > .env << EOF
FIREBASE_APP_ID=1:YOUR_PROJECT_ID:ios:YOUR_APP_ID
FIREBASE_TESTERS=tester1@example.com,tester2@example.com
FIREBASE_TESTER_GROUPS=qa
EOF
```

### Step 3: Find Firebase App ID

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (⚙️) > **Your apps**
4. Find your app (Android or iOS)
5. Copy **App ID** (format: `1:PROJECT_ID:platform:APP_ID`)

### Step 4: Configure Testers and Groups

1. Go to Firebase Console > **App Distribution** > **Testers & Groups**
2. Create groups if needed (e.g., "qa", "developers")
3. Add testers to groups or use email directly

---

## 🔐 Code Signing Configuration

### iOS

#### Option 1: Manual Signing (Recommended)

1. Open Xcode:

   ```bash
   open ios/PingMe.xcworkspace
   ```

2. Select project → Target **PingMe** → **Signing & Capabilities**

3. Turn off **"Automatically manage signing"**

4. Configure:
   - **Team**: Select your team
   - **Signing Certificate**: Select appropriate certificate
   - **Provisioning Profile**:
     - Staging: `pingme-adhoc`
     - Production: `pingme-appstore`

5. Ensure schemes are shared:
   - Product → Scheme → Manage Schemes
   - Check "Shared" for schemes: `PingMe-Develop`, `PingMe-Production`

#### Option 2: Match (For large teams)

```bash
cd ios
fastlane match init
# Configure Matchfile with git repository
fastlane match adhoc    # For staging
fastlane match appstore # For production
```

### Android

1. Ensure keystore is configured in `gradle.properties`
2. Keystore file should be at `android/app/dev.jks` (automatically copied during prebuild)
3. If not present, run:
   ```bash
   expo prebuild
   ```

---

## 🚀 Building the Application

### Android

#### Build Staging (APK) - Upload to Firebase

```bash
npm run fastlane:android:staging
```

Output: `android/app/build/outputs/apk/release/PingMe-Android-Staging-v{version}({build}).apk`

**Automatic features:**

- ✅ Automatically increment build number based on Firebase latest release
- ✅ Automatically upload to Firebase App Distribution
- ✅ Automatically send to configured testers/groups

#### Build Production (AAB) - For Play Store

```bash
npm run fastlane:android:production
```

Output: `android/app/build/outputs/bundle/release/PingMe-Android-Production-v{version}({build}).aab`

#### Build and Upload to Play Store

```bash
npm run fastlane:android:production:upload
```

### iOS

#### Build Staging (IPA Ad-hoc) - Upload to Firebase

```bash
npm run fastlane:ios:staging
```

Output: `ios/build/PingMe-Staging-v{version}({build}).ipa`

**Automatic features:**

- ✅ Automatically increment build number based on Firebase latest release
- ✅ Automatically upload to Firebase App Distribution
- ✅ Automatically send to configured testers/groups

#### Build Production (IPA App Store)

```bash
npm run fastlane:ios:production
```

Output: `ios/build/PingMe-Production-v{version}({build}).ipa`

#### Build and Upload to App Store

```bash
npm run fastlane:ios:production:upload
```

#### Build and Upload to TestFlight

```bash
npm run fastlane:ios:production:testflight
```

---

## 📝 Common Workflows

### First-time Setup

```bash
# 1. Clone and install dependencies
git clone <repo>
cd pingme-app
npm install

# 2. Prebuild native projects
npm run prebuild

# 3. Restore fastlane configuration
npm run restore:fastlane

# 4. Setup Firebase
cd android
# Create .env manually (see Firebase config section)
cd ../ios
# Create .env manually for iOS (see Firebase config section)

# 5. Install Ruby dependencies
cd ios && bundle install
cd ../android && bundle install

# 6. Configure code signing in Xcode (iOS)
open ios/PingMe.xcworkspace

# 7. Build and test
npm run fastlane:android:staging
npm run fastlane:ios:staging
```

### When Native Code Changes

```bash
# 1. Backup fastlane before prebuild (if needed)
npm run backup:fastlane

# 2. Prebuild
npm run prebuild

# 3. Restore fastlane
npm run restore:fastlane

# 4. Install dependencies if there are changes
cd ios && bundle install
cd ../android && bundle install
```

### Regular Builds

```bash
# Just run the build command
npm run fastlane:android:staging
npm run fastlane:ios:staging
```

---

## 🔍 Troubleshooting

### Error: "Could not find action 'firebase_app_distribution'"

**Cause:** Plugin not installed

**Solution:**

```bash
cd ios  # or android
bundle add fastlane-plugin-firebase_app_distribution
bundle install
```

### Error: "Missing gem 'cocoapods'"

**Cause:** CocoaPods not installed in bundle

**Solution:**

```bash
cd ios
bundle add cocoapods
bundle install
```

### Error: "FIREBASE_APP_ID not set"

**Cause:** `.env` file not created or missing Firebase App ID

**Solution:**

```bash
# Android
cd android
# Create .env manually (see Firebase config section)

# iOS - create .env manually
cd ios
# Create .env with FIREBASE_APP_ID (see Firebase config section)
```

### Error: "Matchfile does not exist" (iOS)

**Cause:** Code requires Match but you're using manual signing

**Solution:**

- Ensure manual signing is correctly configured in Xcode
- Or setup Match if you want to use it

### Error: "Keystore not found" (Android)

**Cause:** Keystore not copied to project

**Solution:**

```bash
# Run prebuild to copy keystore
npm run prebuild
```

### Error: "Build number not incrementing correctly"

**Cause:** Firebase response missing `buildVersion` or parsing error

**Solution:**

- Check release notes in Firebase have format: `Staging build v1.0.0 (2)`
- Script will automatically use `buildVersion` from Firebase response if available

### Error: "400 Bad Request" when uploading to Firebase

**Cause:** Firebase App ID incorrect or no permission

**Solution:**

1. Check App ID in `.env` is correct
2. Ensure logged in to Firebase: `firebase login`
3. Check access permissions in Firebase Console

### Error: "No such file or directory: ios" or "android"

**Cause:** Haven't run `expo prebuild`

**Solution:**

```bash
npm run prebuild
npm run restore:fastlane
```

---

## 📚 References

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Firebase App Distribution](https://firebase.google.com/docs/app-distribution)
- [Expo Documentation](https://docs.expo.dev/)
- [iOS Code Signing Guide](https://docs.fastlane.tools/codesigning/getting-started/)
- [Android Deployment Guide](https://docs.fastlane.tools/getting-started/android/setup/)

---

## 💡 Tips

1. **Always backup fastlane before prebuild:**

   ```bash
   npm run backup:fastlane
   ```

2. **Check .env files are not committed to git:**
   - `.env` files are ignored in `.gitignore`

3. **Use .env.local for local configuration:**
   - `.env.local` has higher priority than `.env`
   - Don't commit `.env.local` to git

4. **Automatic build number sync:**
   - Script automatically gets the highest build number from Firebase
   - Automatically increments by 1 for next build
   - No manual update needed

5. **Firebase authentication:**
   - Use `firebase login` for development
   - Use Service Account JSON for CI/CD

---

## ❓ Frequently Asked Questions

**Q: Do I need to install fastlane globally?**
A: No. Fastlane is managed via Bundler in each project.

**Q: Why do I need to restore fastlane after prebuild?**
A: `expo prebuild` will delete and recreate native folders, removing fastlane config. The restore script will copy it back from backup.

**Q: How does automatic build number increment work?**
A: The script will:

1. Get latest release from Firebase
2. Get `buildVersion` from response
3. Compare with current build number
4. Choose the larger number and increment by 1

**Q: Can I build without uploading to Firebase?**
A: Yes. If `FIREBASE_APP_ID` is not set, the build will still succeed but will skip upload.

**Q: How do I add a new tester?**
A: Update `FIREBASE_TESTERS` in `.env` or add to a group in Firebase Console.

---

If you encounter issues, check the [Troubleshooting](#troubleshooting) section or contact the team lead.
