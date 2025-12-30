const {
  withGradleProperties,
  withAppBuildGradle,
  withDangerousMod,
  withAndroidManifest,
  AndroidConfig,
  withInfoPlist,
  withEntitlementsPlist,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom config plugin to add Android signing configuration
 */
const withAndroidSigning = (config) => {
  console.log('🔧 Applying Android signing plugin...');

  // Add gradle properties
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults || [];

    // Remove existing signing properties if they exist
    config.modResults = config.modResults.filter(
      (item) =>
        !item.key ||
        ![
          'MYAPP_UPLOAD_STORE_FILE',
          'MYAPP_UPLOAD_KEY_ALIAS',
          'MYAPP_UPLOAD_STORE_PASSWORD',
          'MYAPP_UPLOAD_KEY_PASSWORD',
        ].includes(item.key)
    );

    // Add signing properties
    config.modResults.push(
      {
        type: 'property',
        key: 'MYAPP_UPLOAD_STORE_FILE',
        value: 'dev.jks',
      },
      {
        type: 'property',
        key: 'MYAPP_UPLOAD_KEY_ALIAS',
        value: 'dev',
      },
      {
        type: 'property',
        key: 'MYAPP_UPLOAD_STORE_PASSWORD',
        value: 'TestPassword1!',
      },
      {
        type: 'property',
        key: 'MYAPP_UPLOAD_KEY_PASSWORD',
        value: 'TestPassword1!',
      }
    );

    return config;
  });

  // Modify build.gradle to add signing configs
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    console.log('📝 Modifying build.gradle...');

    // Check if signingConfigs.release already exists
    const hasReleaseSigningConfig =
      buildGradle.includes('signingConfigs.release') ||
      buildGradle.match(/release\s*\{[\s\S]*?storeFile\s+file\(MYAPP_UPLOAD_STORE_FILE\)/);
    const hasReleaseSigningInBuildTypes = buildGradle.includes(
      'signingConfig signingConfigs.release'
    );

    console.log(`  - Has release signing config: ${hasReleaseSigningConfig}`);
    console.log(`  - Has signingConfig in buildTypes: ${hasReleaseSigningInBuildTypes}`);

    // Add release signing config if it doesn't exist
    if (!hasReleaseSigningConfig) {
      // Find signingConfigs block and add release config after debug
      // More flexible pattern to match signingConfigs block
      const signingConfigsPattern = /(signingConfigs\s*\{[\s\S]*?debug\s*\{[^}]*\}[^}]*?)(\})/;
      const signingConfigsMatch = buildGradle.match(signingConfigsPattern);
      if (signingConfigsMatch) {
        buildGradle = buildGradle.replace(
          signingConfigsPattern,
          `$1        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    $2`
        );
        console.log('  ✓ Added release signing config');
      } else {
        console.warn('  ⚠ Could not find signingConfigs block to modify');
      }
    }

    // Replace or add signingConfig to release buildType
    if (!hasReleaseSigningInBuildTypes) {
      // First, try to replace signingConfigs.debug with signingConfigs.release in release buildType
      const releaseWithDebugPattern = /(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/;
      if (releaseWithDebugPattern.test(buildGradle)) {
        buildGradle = buildGradle.replace(
          releaseWithDebugPattern,
          '$1signingConfig signingConfigs.release'
        );
        console.log(
          '  ✓ Replaced signingConfigs.debug with signingConfigs.release in release buildType'
        );
      } else {
        // If no signingConfig found, add it at the beginning of release buildType
        const releaseBuildTypePattern = /(release\s*\{)/;
        const releaseBuildTypeMatch = buildGradle.match(releaseBuildTypePattern);
        if (releaseBuildTypeMatch) {
          buildGradle = buildGradle.replace(
            releaseBuildTypePattern,
            `$1
            signingConfig signingConfigs.release`
          );
          console.log('  ✓ Added signingConfig to release buildType');
        } else {
          console.warn('  ⚠ Could not find release buildType to modify');
        }
      }
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  // Copy keystore file to android/app/ after prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      try {
        const projectRoot = config.modRequest?.projectRoot || process.cwd();
        const keystoreSource = path.join(projectRoot, 'android-keystore', 'dev.jks');
        const keystoreDest = path.join(projectRoot, 'android', 'app', 'dev.jks');

        console.log(`📦 Copying keystore from ${keystoreSource} to ${keystoreDest}`);

        // Check if source file exists
        if (fs.existsSync(keystoreSource)) {
          // Ensure destination directory exists
          const destDir = path.dirname(keystoreDest);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          // Copy the keystore file
          fs.copyFileSync(keystoreSource, keystoreDest);
          console.log(`✓ Copied keystore file to ${keystoreDest}`);
        } else {
          console.warn(`⚠ Keystore file not found at ${keystoreSource}`);
        }
      } catch (error) {
        console.error('❌ Error copying keystore:', error.message);
      }

      return config;
    },
  ]);

  // Modify AndroidManifest.xml to add special configurations
  config = withAndroidManifest(config, (config) => {
    console.log('📱 Modifying AndroidManifest.xml...');
    const manifest = config.modResults.manifest;

    // Add special permissions
    const specialPermissions = [
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ];

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    // Ensure it's an array
    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [manifest['uses-permission']];
    }

    // Add missing permissions
    specialPermissions.forEach((permission) => {
      const exists = manifest['uses-permission'].some((p) => p.$['android:name'] === permission);
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
        console.log(`  ✓ Added permission: ${permission}`);
      }
    });

    // Add queries section for Facebook and HTTPS intents
    if (!manifest.queries) {
      manifest.queries = [
        {
          package: [{ $: { 'android:name': 'com.facebook.katana' } }],
          intent: [
            {
              action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
              category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
              data: [{ $: { 'android:scheme': 'https' } }],
            },
          ],
        },
      ];
      console.log('  ✓ Added queries section');
    } else {
      // Check if Facebook package exists
      const hasFacebookPackage = manifest.queries.some(
        (q) => q.package && q.package.some((p) => p.$['android:name'] === 'com.facebook.katana')
      );
      if (!hasFacebookPackage) {
        if (!Array.isArray(manifest.queries)) {
          manifest.queries = [manifest.queries];
        }
        manifest.queries.push({
          package: [{ $: { 'android:name': 'com.facebook.katana' } }],
        });
        console.log('  ✓ Added Facebook package to queries');
      }
    }

    // Add custom intent-filter with pingme schemes to MainActivity
    if (manifest.application && manifest.application[0] && manifest.application[0].activity) {
      const activities = Array.isArray(manifest.application[0].activity)
        ? manifest.application[0].activity
        : [manifest.application[0].activity];

      const mainActivity = activities.find(
        (activity) =>
          activity.$['android:name'] === '.MainActivity' ||
          activity.$['android:name'] === 'xyz.pingme.app.MainActivity'
      );

      if (mainActivity) {
        if (!mainActivity['intent-filter']) {
          mainActivity['intent-filter'] = [];
        }

        // Ensure it's an array
        if (!Array.isArray(mainActivity['intent-filter'])) {
          mainActivity['intent-filter'] = [mainActivity['intent-filter']];
        }

        // Check if pingme scheme intent-filter exists
        const hasPingmeScheme = mainActivity['intent-filter'].some((filter) => {
          const data = filter.data;
          if (!data) return false;
          const dataArray = Array.isArray(data) ? data : [data];
          return dataArray.some(
            (d) => d.$['android:scheme'] === 'pingme' || d.$['android:scheme'] === 'exp+pingme'
          );
        });

        if (!hasPingmeScheme) {
          mainActivity['intent-filter'].push({
            action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
            category: [
              { $: { 'android:name': 'android.intent.category.DEFAULT' } },
              { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
            ],
            data: [
              { $: { 'android:scheme': 'pingme' } },
              { $: { 'android:scheme': 'exp+pingme' } },
            ],
          });
          console.log('  ✓ Added pingme scheme intent-filter');
        }
      }
    }

    return config;
  });

  console.log('✅ Android signing plugin applied');
  return config;
};

/**
 * Custom config plugin to add iOS specific configurations
 */
const withIOSConfig = (config) => {
  console.log('🍎 Applying iOS configuration plugin...');

  // Modify Info.plist
  config = withInfoPlist(config, (config) => {
    const { modResults } = config;
    console.log('📱 Modifying Info.plist...');

    // Add URL Schemes if not already present
    if (!modResults.CFBundleURLTypes) {
      modResults.CFBundleURLTypes = [];
    }

    // Ensure it's an array
    if (!Array.isArray(modResults.CFBundleURLTypes)) {
      modResults.CFBundleURLTypes = [modResults.CFBundleURLTypes];
    }

    // Add URL schemes: com.hailstonelab.pingme, exp+pingme, pingme
    const requiredSchemes = ['com.hailstonelab.pingme', 'exp+pingme', 'pingme'];
    requiredSchemes.forEach((scheme) => {
      const exists = modResults.CFBundleURLTypes.some(
        (urlType) =>
          urlType.CFBundleURLSchemes &&
          Array.isArray(urlType.CFBundleURLSchemes) &&
          urlType.CFBundleURLSchemes.includes(scheme)
      );

      if (!exists) {
        modResults.CFBundleURLTypes.push({
          CFBundleURLSchemes: [scheme],
        });
        console.log(`  ✓ Added URL scheme: ${scheme}`);
      }
    });

    // Add LSApplicationQueriesSchemes for social sharing
    if (!modResults.LSApplicationQueriesSchemes) {
      modResults.LSApplicationQueriesSchemes = [];
    }

    if (!Array.isArray(modResults.LSApplicationQueriesSchemes)) {
      modResults.LSApplicationQueriesSchemes = [modResults.LSApplicationQueriesSchemes];
    }

    const requiredQuerySchemes = ['fb', 'instagram', 'twitter', 'tiktoksharesdk'];
    requiredQuerySchemes.forEach((scheme) => {
      if (!modResults.LSApplicationQueriesSchemes.includes(scheme)) {
        modResults.LSApplicationQueriesSchemes.push(scheme);
        console.log(`  ✓ Added query scheme: ${scheme}`);
      }
    });

    // Add NSAppTransportSecurity settings
    if (!modResults.NSAppTransportSecurity) {
      modResults.NSAppTransportSecurity = {};
    }

    // Ensure NSAllowsLocalNetworking is true
    if (modResults.NSAppTransportSecurity.NSAllowsLocalNetworking !== true) {
      modResults.NSAppTransportSecurity.NSAllowsLocalNetworking = true;
      console.log('  ✓ Added NSAllowsLocalNetworking: true');
    }

    // Add CADisableMinimumFrameDurationOnPhone
    if (modResults.CADisableMinimumFrameDurationOnPhone !== true) {
      modResults.CADisableMinimumFrameDurationOnPhone = true;
      console.log('  ✓ Added CADisableMinimumFrameDurationOnPhone: true');
    }

    return config;
  });

  // Modify Entitlements
  config = withEntitlementsPlist(config, (config) => {
    const { modResults } = config;
    console.log('🔐 Modifying Entitlements...');

    // Add associated domains for Universal Links
    if (!modResults['com.apple.developer.associated-domains']) {
      modResults['com.apple.developer.associated-domains'] = [];
    }

    if (!Array.isArray(modResults['com.apple.developer.associated-domains'])) {
      modResults['com.apple.developer.associated-domains'] = [
        modResults['com.apple.developer.associated-domains'],
      ];
    }

    const requiredDomains = ['applinks:app.pingme.xyz', 'applinks:app.staging.pingme.xyz'];

    requiredDomains.forEach((domain) => {
      if (!modResults['com.apple.developer.associated-domains'].includes(domain)) {
        modResults['com.apple.developer.associated-domains'].push(domain);
        console.log(`  ✓ Added associated domain: ${domain}`);
      }
    });

    return config;
  });

  // Create custom Xcode schemes
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      try {
        const projectRoot = config.modRequest?.projectRoot || process.cwd();
        const schemesDir = path.join(
          projectRoot,
          'ios',
          'PingMe.xcodeproj',
          'xcshareddata',
          'xcschemes'
        );

        // Ensure schemes directory exists
        if (!fs.existsSync(schemesDir)) {
          fs.mkdirSync(schemesDir, { recursive: true });
        }

        // Read the base PingMe scheme as template
        const baseSchemePath = path.join(schemesDir, 'PingMe.xcscheme');
        let baseSchemeContent = '';

        if (fs.existsSync(baseSchemePath)) {
          baseSchemeContent = fs.readFileSync(baseSchemePath, 'utf8');
        } else {
          console.warn('  ⚠ PingMe.xcscheme not found, skipping scheme creation');
          return config;
        }

        // Create PingMe-Develop scheme (uses Debug/Release from base scheme)
        const developSchemePath = path.join(schemesDir, 'PingMe-Develop.xcscheme');
        if (!fs.existsSync(developSchemePath)) {
          fs.writeFileSync(developSchemePath, baseSchemeContent);
          console.log('  ✓ Created PingMe-Develop.xcscheme');
        }

        // Create PingMe-Production scheme (uses Release configuration)
        const productionSchemePath = path.join(schemesDir, 'PingMe-Production.xcscheme');
        if (!fs.existsSync(productionSchemePath)) {
          // Production scheme uses Release for all build configurations
          let productionSchemeContent = baseSchemeContent;
          productionSchemeContent = productionSchemeContent.replace(
            /buildConfiguration = "Debug"/g,
            'buildConfiguration = "Release"'
          );
          fs.writeFileSync(productionSchemePath, productionSchemeContent);
          console.log('  ✓ Created PingMe-Production.xcscheme');
        }
      } catch (error) {
        console.error('❌ Error creating iOS schemes:', error.message);
      }

      return config;
    },
  ]);

  console.log('✅ iOS configuration plugin applied');
  return config;
};

/**
 * Combined plugin that applies both Android and iOS configurations
 */
const withPingMeConfig = (config) => {
  config = withAndroidSigning(config);
  config = withIOSConfig(config);
  return config;
};

module.exports = withPingMeConfig;
