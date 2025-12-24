/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependencies: {
    // Keep existing iOS implementation; avoid pulling this native module into the iOS build.
    'react-native-qr-image-reader': {
      platforms: {
        ios: null,
      },
    },
  },
};

