#!/usr/bin/env node

/**
 * Script to fix iOS signing configurations for DevelopDebug and DevelopRelease
 * Run this after expo prebuild
 *
 * Usage: node scripts/fix-ios-signing.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const projectPbxprojPath = path.join(projectRoot, 'ios', 'PingMe.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(projectPbxprojPath)) {
  console.error('❌ project.pbxproj not found:', projectPbxprojPath);
  process.exit(1);
}

console.log('🔧 Fixing iOS signing configurations...');

let projectContent = fs.readFileSync(projectPbxprojPath, 'utf8');

// Fix DevelopDebug configuration - replace bundle ID and team separately
// Use simpler pattern that matches any DevelopDebug with baseConfigurationReference
projectContent = projectContent.replace(
  /([A-F0-9]{24} \/\* DevelopDebug \*\/ = \{[\s\S]*?baseConfigurationReference[\s\S]*?buildSettings = \{[\s\S]*?PRODUCT_BUNDLE_IDENTIFIER = )[^;]+;/g,
  '$1com.hailstonelab.pingme.demo;'
);
projectContent = projectContent.replace(
  /([A-F0-9]{24} \/\* DevelopDebug \*\/ = \{[\s\S]*?baseConfigurationReference[\s\S]*?buildSettings = \{[\s\S]*?DEVELOPMENT_TEAM = )[^;]+;/g,
  '$1698L9G9LDH;'
);
console.log('  ✓ Fixed DevelopDebug: bundle ID = com.hailstonelab.pingme.demo, team = 698L9G9LDH');

// Fix DevelopRelease configuration - replace bundle ID and team separately
// Use simpler pattern that matches any DevelopRelease with baseConfigurationReference
projectContent = projectContent.replace(
  /([A-F0-9]{24} \/\* DevelopRelease \*\/ = \{[\s\S]*?baseConfigurationReference[\s\S]*?buildSettings = \{[\s\S]*?PRODUCT_BUNDLE_IDENTIFIER = )[^;]+;/g,
  '$1com.hailstonelab.pingme.demo;'
);
projectContent = projectContent.replace(
  /([A-F0-9]{24} \/\* DevelopRelease \*\/ = \{[\s\S]*?baseConfigurationReference[\s\S]*?buildSettings = \{[\s\S]*?DEVELOPMENT_TEAM = )[^;]+;/g,
  '$1698L9G9LDH;'
);
console.log(
  '  ✓ Fixed DevelopRelease: bundle ID = com.hailstonelab.pingme.demo, team = 698L9G9LDH'
);

// Write the modified file
fs.writeFileSync(projectPbxprojPath, projectContent, 'utf8');
console.log('✅ iOS signing configurations fixed!');
console.log('');
console.log('💡 Next steps:');
console.log('  1. Open ios/PingMe.xcworkspace in Xcode');
console.log('  2. Go to Signing & Capabilities');
console.log('  3. Check that DevelopDebug and DevelopRelease have correct bundle IDs and teams');
