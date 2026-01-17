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

// Chỉ tìm và xoá đúng 2 permissions audio, giữ nguyên các permission khác
const permissionsToRemove = [
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VIDEO',
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
  console.log('ℹ️ No audio permissions found; file unchanged.');
}
