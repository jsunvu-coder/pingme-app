# Build Environments Configuration

## Overview

The app is configured to support 2 environments with different bundle IDs:

### Production

- **Bundle ID**: `xyz.pingme.app`
- **Team ID**: `BMN9N6C39P`
- **App ID**: `BMN9N6C39P.xyz.pingme.app`
- **Associated Domains**:
  - `applinks:app.pingme.xyz`
  - `applinks:app.staging.pingme.xyz`
- **Scheme**: `PingMe-Production`

### Staging

- **Bundle ID**: `com.hailstonelab.pingme.demo`
- **Team ID**: `698L9G9LDH`
- **App ID**: `698L9G9LDH.com.hailstonelab.pingme.demo`
- **Associated Domains**:
  - `applinks:app.staging.pingme.xyz`
- **Scheme**: `PingMe-Develop`

## How to Build

### Build Staging (Development/Preview)

**Option 1: Using environment variable**

```bash
EXPO_PUBLIC_ENV=staging npx expo prebuild --clean
npm run ios
```

**Option 2: Using EAS Build**

```bash
eas build --profile staging --platform ios
```

**Option 3: Using Xcode scheme**

```bash
npm run ios  # Uses PingMe-Develop scheme (staging)
```

### Build Production

**Option 1: Using environment variable**

```bash
EXPO_PUBLIC_ENV=production npx expo prebuild --clean
npm run ios:prod
```

**Option 2: Using EAS Build**

```bash
eas build --profile production --platform ios
```

**Option 3: Using Xcode scheme**

```bash
npm run ios:prod  # Uses PingMe-Production scheme
```

## Automatic Configuration

The app config automatically detects the environment from:

1. `EXPO_PUBLIC_ENV` environment variable
2. `EAS_BUILD_PROFILE` (when building with EAS)
3. Default: `production`

### Logic in app.config.js

```javascript
const env = process.env.EXPO_PUBLIC_ENV || process.env.EAS_BUILD_PROFILE || 'production';
const isStaging = env === 'staging' || env === 'preview' || env === 'development';
```

## Automatic Plugin

The plugin (`app.plugin.js`) automatically:

- Detects bundle ID from config
- Sets appropriate associated domains:
  - Staging: only `applinks:app.staging.pingme.xyz`
  - Production: both `applinks:app.pingme.xyz` and `applinks:app.staging.pingme.xyz`
- Sets appropriate team ID
- Sets app name (PingMeDev for staging, PingMe for production)

## Verify Configuration

### 1. Verify plugin

```bash
npm run verify:plugin
```

### 2. Verify universal links

```bash
npm run check:universal-links
```

### 3. Verify in Xcode

**Staging:**

1. Open `ios/PingMe.xcworkspace`
2. Select scheme `PingMe-Develop`
3. Go to **Signing & Capabilities** tab
4. Verify:
   - Bundle Identifier: `com.hailstonelab.pingme.demo`
   - Team: `698L9G9LDH`
   - Associated Domains: `applinks:app.staging.pingme.xyz`

**Production:**

1. Select scheme `PingMe-Production`
2. Go to **Signing & Capabilities** tab
3. Verify:
   - Bundle Identifier: `xyz.pingme.app`
   - Team: `BMN9N6C39P`
   - Associated Domains:
     - `applinks:app.pingme.xyz`
     - `applinks:app.staging.pingme.xyz`

## Apple App Site Association

The `apple-app-site-association` file has been updated to support both App IDs:

- `BMN9N6C39P.xyz.pingme.app` (Production)
- `698L9G9LDH.com.hailstonelab.pingme.demo` (Staging)

This file needs to be deployed to the server at:

- `https://app.pingme.xyz/.well-known/apple-app-site-association`
- `https://app.staging.pingme.xyz/.well-known/apple-app-site-association`

## Troubleshooting

### Issue: Building staging but still using production bundle ID

**Cause**: Environment variable not set

**Fix**:

```bash
# Delete ios folder and rebuild with env variable
rm -rf ios
EXPO_PUBLIC_ENV=staging npx expo prebuild --clean
```

### Issue: Associated domains are incorrect

**Cause**: Plugin didn't detect the correct bundle ID

**Fix**:

1. Check if `app.config.js` has the correct logic
2. Run `npm run verify:plugin` to verify
3. Check logs during prebuild to verify the plugin ran correctly

### Issue: Universal links not working

**See**: `UNIVERSAL_LINKS_TROUBLESHOOTING.md`

## Recommended Workflow

### Development/Testing (Staging)

```bash
# 1. Set environment
export EXPO_PUBLIC_ENV=staging

# 2. Prebuild
npx expo prebuild --clean

# 3. Build and run
npm run ios
```

### Production Build

```bash
# 1. Set environment
export EXPO_PUBLIC_ENV=production

# 2. Prebuild
npx expo prebuild --clean

# 3. Build
npm run ios:prod
# or
eas build --profile production --platform ios
```

## Important Notes

1. **Always run prebuild after changing environment**
2. **Delete ios folder before prebuild** if you want a clean build
3. **Check bundle ID in Xcode** after prebuild
4. **Verify associated domains** in Xcode Signing & Capabilities
5. **Reinstall app** after changing bundle ID/certificate
