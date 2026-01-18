// scripts/strip-android-audio-permissions.js
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
);

if (!fs.existsSync(manifestPath)) {
  console.error('AndroidManifest.xml not found at:', manifestPath);
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, 'utf8');
const before = xml;

// Remove unnecessary permissions according to Google Play Store policy
// - Audio permissions: App doesn't need to record audio
// - READ_MEDIA_*: Not needed because:
//   1. Upload Photo: Uses Android Photo Picker (no permission needed)
//   2. Save Recovery QR: Saves app-generated image (no permission needed on Android 10+)
// - WRITE_EXTERNAL_STORAGE: Not needed on Android 10+ (uses scoped storage)
const permissionsToRemove = [
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
];

let removedAny = false;
for (const permission of permissionsToRemove) {
  const pattern = new RegExp(
    `[ \\t]*<uses-permission[^>]*android:name="${permission.replace(/\./g, '\\.')}"[^>]*/>\\s*\\n?`,
    'g'
  );
  const removed = xml.match(pattern);
  if (removed && removed.length > 0) {
    xml = xml.replace(pattern, '');
    console.log(`✅ Removed ${permission} from AndroidManifest.xml`);
    removedAny = true;
  }
}

if (removedAny) {
  fs.writeFileSync(manifestPath, xml, 'utf8');
} else {
  console.log('ℹ️ No unnecessary permissions found; file unchanged.');
}
