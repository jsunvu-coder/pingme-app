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
      console.log('  ✓ Initialized CFBundleURLTypes array');
    }

    // Ensure it's an array
    if (!Array.isArray(modResults.CFBundleURLTypes)) {
      modResults.CFBundleURLTypes = [modResults.CFBundleURLTypes].filter(Boolean);
      console.log('  ✓ Converted CFBundleURLTypes to array');
    }

    // Add URL schemes: com.hailstonelab.pingme, exp+pingme, pingme
    const requiredSchemes = ['com.hailstonelab.pingme', 'exp+pingme', 'pingme'];
    requiredSchemes.forEach((scheme) => {
      const exists = modResults.CFBundleURLTypes.some(
        (urlType) =>
          urlType &&
          urlType.CFBundleURLSchemes &&
          Array.isArray(urlType.CFBundleURLSchemes) &&
          urlType.CFBundleURLSchemes.includes(scheme)
      );

      if (!exists) {
        modResults.CFBundleURLTypes.push({
          CFBundleURLSchemes: [scheme],
        });
        console.log(`  ✓ Added URL scheme: ${scheme}`);
      } else {
        console.log(`  - URL scheme already exists: ${scheme}`);
      }
    });

    console.log('  Final CFBundleURLTypes:', JSON.stringify(modResults.CFBundleURLTypes, null, 2));

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
    console.log('  Current entitlements:', JSON.stringify(modResults, null, 2));

    // modResults should always be an object from withEntitlementsPlist
    if (!modResults || typeof modResults !== 'object') {
      console.error('  ❌ modResults is not an object! This should not happen.');
      return config;
    }

    // Get bundle ID from config to determine which domains to use
    const bundleId = config.ios?.bundleIdentifier || 'xyz.pingme.app';
    const isStaging = bundleId === 'com.hailstonelab.pingme.demo';

    console.log(`  📦 Bundle ID: ${bundleId}`);
    console.log(`  🏷️  Environment: ${isStaging ? 'Staging' : 'Production'}`);

    // Add associated domains for Universal Links
    const associatedDomainsKey = 'com.apple.developer.associated-domains';

    if (!modResults[associatedDomainsKey]) {
      modResults[associatedDomainsKey] = [];
      console.log('  ✓ Initialized associated-domains array');
    }

    // Ensure it's an array
    if (!Array.isArray(modResults[associatedDomainsKey])) {
      modResults[associatedDomainsKey] = [modResults[associatedDomainsKey]].filter(Boolean);
      console.log('  ✓ Converted associated-domains to array');
    }

    // Determine required domains based on bundle ID
    // Staging: only staging domain
    // Production: both production and staging domains
    const requiredDomains = isStaging
      ? ['applinks:app.staging.pingme.xyz']
      : ['applinks:app.pingme.xyz', 'applinks:app.staging.pingme.xyz'];

    console.log(
      `  📋 Required domains for ${isStaging ? 'staging' : 'production'}:`,
      requiredDomains
    );

    requiredDomains.forEach((domain) => {
      if (!modResults[associatedDomainsKey].includes(domain)) {
        modResults[associatedDomainsKey].push(domain);
        console.log(`  ✓ Added associated domain: ${domain}`);
      } else {
        console.log(`  - Domain already exists: ${domain}`);
      }
    });

    // Remove domains that shouldn't be there
    const allPossibleDomains = ['applinks:app.pingme.xyz', 'applinks:app.staging.pingme.xyz'];
    allPossibleDomains.forEach((domain) => {
      if (!requiredDomains.includes(domain) && modResults[associatedDomainsKey].includes(domain)) {
        modResults[associatedDomainsKey] = modResults[associatedDomainsKey].filter(
          (d) => d !== domain
        );
        console.log(
          `  🗑️  Removed domain (not needed for ${isStaging ? 'staging' : 'production'}): ${domain}`
        );
      }
    });

    console.log('  Final associated-domains:', modResults[associatedDomainsKey]);
    return config;
  });

  // Configure iOS signing for multiple build configurations
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      try {
        const projectRoot = config.modRequest?.projectRoot || process.cwd();
        const projectPbxprojPath = path.join(
          projectRoot,
          'ios',
          'PingMe.xcodeproj',
          'project.pbxproj'
        );

        if (!fs.existsSync(projectPbxprojPath)) {
          console.warn('  ⚠ project.pbxproj not found, skipping signing configuration');
          return config;
        }

        console.log('🔐 Configuring iOS signing for multiple build configurations...');
        let projectContent = fs.readFileSync(projectPbxprojPath, 'utf8');

        // Helper function to generate UUID for Xcode project
        const generateUUID = () => {
          const crypto = require('crypto');
          return crypto.randomBytes(12).toString('hex').toUpperCase();
        };

        // Check if DevelopDebug and DevelopRelease configurations exist
        const hasDevelopDebug = projectContent.includes('/* DevelopDebug */');
        const hasDevelopRelease = projectContent.includes('/* DevelopRelease */');

        if (!hasDevelopDebug || !hasDevelopRelease) {
          console.log('📦 Creating DevelopDebug and DevelopRelease build configurations...');

          // Find Debug configuration as template
          const debugConfigMatch = projectContent.match(
            /(\t\t13B07F941A680F5B00A75B9A \/\* Debug \*\/ = \{[\s\S]*?name = Debug;[\s\S]*?\t\t\};)/
          );
          const releaseConfigMatch = projectContent.match(
            /(\t\t13B07F951A680F5B00A75B9A \/\* Release \*\/ = \{[\s\S]*?name = Release;[\s\S]*?\t\t\};)/
          );

          if (debugConfigMatch && releaseConfigMatch) {
            const developDebugUUID = generateUUID();
            const developReleaseUUID = generateUUID();

            // Create DevelopDebug based on Debug
            let developDebugConfig = debugConfigMatch[1];
            developDebugConfig = developDebugConfig.replace(
              '13B07F941A680F5B00A75B9A',
              developDebugUUID
            );
            developDebugConfig = developDebugConfig.replace(
              /\/\* Debug \*\//,
              '/* DevelopDebug */'
            );
            developDebugConfig = developDebugConfig.replace(
              /name = Debug;/,
              'name = DevelopDebug;'
            );
            // Replace baseConfigurationReference first (before other replacements)
            developDebugConfig = developDebugConfig.replace(
              /baseConfigurationReference = [^;]+;/,
              'baseConfigurationReference = 32E8FF4A68F6BB31923561F9 /* Pods-PingMe.developdebug.xcconfig */;'
            );
            // Replace DEVELOPMENT_TEAM - must be exact match
            developDebugConfig = developDebugConfig.replace(
              /DEVELOPMENT_TEAM = BMN9N6C39P;/,
              'DEVELOPMENT_TEAM = 698L9G9LDH;'
            );
            // Replace PRODUCT_BUNDLE_IDENTIFIER - must be exact match (match any value, not just xyz.pingme.app)
            developDebugConfig = developDebugConfig.replace(
              /PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/,
              'PRODUCT_BUNDLE_IDENTIFIER = com.hailstonelab.pingme.demo;'
            );

            // Add CODE_SIGN_STYLE if not present (insert after buildSettings = {)
            if (!developDebugConfig.includes('CODE_SIGN_STYLE')) {
              developDebugConfig = developDebugConfig.replace(
                /(buildSettings = \{[\s\n]*)/,
                '$1\t\t\t\tCODE_SIGN_STYLE = Automatic;\n'
              );
            }

            // Create DevelopRelease based on Release
            let developReleaseConfig = releaseConfigMatch[1];
            developReleaseConfig = developReleaseConfig.replace(
              '13B07F951A680F5B00A75B9A',
              developReleaseUUID
            );
            developReleaseConfig = developReleaseConfig.replace(
              /\/\* Release \*\//,
              '/* DevelopRelease */'
            );
            developReleaseConfig = developReleaseConfig.replace(
              /name = Release;/,
              'name = DevelopRelease;'
            );
            // Replace baseConfigurationReference first (before other replacements)
            developReleaseConfig = developReleaseConfig.replace(
              /baseConfigurationReference = [^;]+;/,
              'baseConfigurationReference = E353C6C47B8B5630FFA5BDC5 /* Pods-PingMe.developrelease.xcconfig */;'
            );
            // Replace DEVELOPMENT_TEAM - must be exact match
            developReleaseConfig = developReleaseConfig.replace(
              /DEVELOPMENT_TEAM = BMN9N6C39P;/,
              'DEVELOPMENT_TEAM = 698L9G9LDH;'
            );
            // Replace PRODUCT_BUNDLE_IDENTIFIER - must be exact match (match any value, not just xyz.pingme.app)
            developReleaseConfig = developReleaseConfig.replace(
              /PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/,
              'PRODUCT_BUNDLE_IDENTIFIER = com.hailstonelab.pingme.demo;'
            );

            // Add CODE_SIGN_STYLE if not present (insert after buildSettings = {)
            if (!developReleaseConfig.includes('CODE_SIGN_STYLE')) {
              developReleaseConfig = developReleaseConfig.replace(
                /(buildSettings = \{[\s\n]*)/,
                '$1\t\t\t\tCODE_SIGN_STYLE = Automatic;\n'
              );
            }

            // Insert before "/* End XCBuildConfiguration section */"
            const insertPoint = projectContent.indexOf('/* End XCBuildConfiguration section */');
            if (insertPoint !== -1) {
              projectContent =
                projectContent.slice(0, insertPoint) +
                developDebugConfig +
                '\n' +
                developReleaseConfig +
                '\n' +
                projectContent.slice(insertPoint);

              // Add to target's XCConfigurationList (13B07F931A680F5B00A75B9A)
              projectContent = projectContent.replace(
                /(13B07F931A680F5B00A75B9A \/\* Build configuration list for PBXNativeTarget "PingMe" \*\/ = \{[\s\S]*?buildConfigurations = \([\s\S]*?13B07F951A680F5B00A75B9A \/\* Release \*\/,)/,
                `$1\n\t\t\t${developDebugUUID} /* DevelopDebug */,\n\t\t\t${developReleaseUUID} /* DevelopRelease */,`
              );

              // Add to project's XCConfigurationList (83CBB9FA1A601CBA00E9B192)
              // First, we need to create project-level configs (simpler version based on Debug/Release)
              const projectDebugConfigMatch = projectContent.match(
                /(\t\t83CBBA201A601CBA00E9B192 \/\* Debug \*\/ = \{[\s\S]*?name = Debug;[\s\S]*?\t\t\};)/
              );
              const projectReleaseConfigMatch = projectContent.match(
                /(\t\t83CBBA211A601CBA00E9B192 \/\* Release \*\/ = \{[\s\S]*?name = Release;[\s\S]*?\t\t\};)/
              );

              if (projectDebugConfigMatch && projectReleaseConfigMatch) {
                const projectDevelopDebugUUID = generateUUID();
                const projectDevelopReleaseUUID = generateUUID();

                let projectDevelopDebug = projectDebugConfigMatch[1];
                projectDevelopDebug = projectDevelopDebug.replace(
                  '83CBBA201A601CBA00E9B192',
                  projectDevelopDebugUUID
                );
                projectDevelopDebug = projectDevelopDebug.replace(
                  /\/\* Debug \*\//,
                  '/* DevelopDebug */'
                );
                projectDevelopDebug = projectDevelopDebug.replace(
                  /name = Debug;/,
                  'name = DevelopDebug;'
                );

                let projectDevelopRelease = projectReleaseConfigMatch[1];
                projectDevelopRelease = projectDevelopRelease.replace(
                  '83CBBA211A601CBA00E9B192',
                  projectDevelopReleaseUUID
                );
                projectDevelopRelease = projectDevelopRelease.replace(
                  /\/\* Release \*\//,
                  '/* DevelopRelease */'
                );
                projectDevelopRelease = projectDevelopRelease.replace(
                  /name = Release;/,
                  'name = DevelopRelease;'
                );

                // Insert project-level configs
                projectContent = projectContent.replace(
                  /(83CBBA211A601CBA00E9B192 \/\* Release \*\/ = \{[\s\S]*?name = Release;[\s\S]*?\t\t\};)/,
                  `$1\n${projectDevelopDebug}\n${projectDevelopRelease}`
                );

                // Add to project's XCConfigurationList
                projectContent = projectContent.replace(
                  /(83CBB9FA1A601CBA00E9B192 \/\* Build configuration list for PBXProject "PingMe" \*\/ = \{[\s\S]*?buildConfigurations = \([\s\S]*?83CBBA211A601CBA00E9B192 \/\* Release \*\/,)/,
                  `$1\n\t\t\t${projectDevelopDebugUUID} /* DevelopDebug */,\n\t\t\t${projectDevelopReleaseUUID} /* DevelopRelease */,`
                );
              }

              console.log('  ✓ Created DevelopDebug and DevelopRelease configurations');
            }
          }
        }

        // Write the modified project file (configurations created, but bundle IDs/teams will be fixed by external script)
        fs.writeFileSync(projectPbxprojPath, projectContent, 'utf8');
        console.log('  ✅ iOS build configurations created');
      } catch (error) {
        console.error('❌ Error configuring iOS signing:', error.message);
        console.error(error.stack);
      }

      return config;
    },
  ]);

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

        // Create PingMe-Develop scheme (uses DevelopDebug/DevelopRelease configurations)
        const developSchemePath = path.join(schemesDir, 'PingMe-Develop.xcscheme');
        let developSchemeContent = baseSchemeContent;

        // Replace TestAction buildConfiguration from Debug to DevelopDebug
        developSchemeContent = developSchemeContent.replace(
          /(<TestAction[\s\S]*?buildConfiguration = )"Debug"/,
          '$1"DevelopDebug"'
        );

        // Replace LaunchAction buildConfiguration from Debug to DevelopRelease
        developSchemeContent = developSchemeContent.replace(
          /(<LaunchAction[\s\S]*?buildConfiguration = )"Debug"/,
          '$1"DevelopRelease"'
        );

        // Replace ProfileAction buildConfiguration from Release to DevelopRelease
        developSchemeContent = developSchemeContent.replace(
          /(<ProfileAction[\s\S]*?buildConfiguration = )"Release"/,
          '$1"DevelopRelease"'
        );

        // Replace AnalyzeAction buildConfiguration from Debug to DevelopDebug
        developSchemeContent = developSchemeContent.replace(
          /(<AnalyzeAction[\s\S]*?buildConfiguration = )"Debug"/,
          '$1"DevelopDebug"'
        );

        // Replace ArchiveAction buildConfiguration from Release to DevelopRelease
        developSchemeContent = developSchemeContent.replace(
          /(<ArchiveAction[\s\S]*?buildConfiguration = )"Release"/,
          '$1"DevelopRelease"'
        );

        // Always write/update the scheme to ensure correct configurations
        fs.writeFileSync(developSchemePath, developSchemeContent);
        console.log(
          '  ✓ Created/Updated PingMe-Develop.xcscheme with DevelopDebug/DevelopRelease configurations'
        );

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
