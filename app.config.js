// Determine environment from EXPO_PUBLIC_ENV or default to 'production'
const env = process.env.EXPO_PUBLIC_ENV || process.env.EAS_BUILD_PROFILE || 'production';
const isStaging = env === 'staging' || env === 'preview' || env === 'development';

// Configuration based on environment
const iosConfig = isStaging
  ? {
      // Staging configuration
      bundleIdentifier: 'com.hailstonelab.pingme.demo',
      appleTeamId: '698L9G9LDH',
      associatedDomains: ['applinks:app.staging.pingme.xyz'],
    }
  : {
      // Production configuration
      bundleIdentifier: 'xyz.pingme.app',
      appleTeamId: 'BMN9N6C39P',
      associatedDomains: ['applinks:app.pingme.xyz', 'applinks:app.staging.pingme.xyz'],
    };

module.exports = {
  expo: {
    name: 'PingMe', // Always use same name, only bundle ID differs
    slug: 'pingme',
    version: '1.1.1',
    scheme: 'pingme',
    web: {
      favicon: './assets/intro_1.png',
    },
    experiments: {
      tsconfigPaths: true,
    },
    plugins: [
      './app.plugin.js',
      [
        'expo-image-picker',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera to let you upload images.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera to use feature "Scan QR".',
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
          recordAudioAndroid: false,
        },
      ],
      'expo-secure-store',
      'expo-web-browser',
    ],
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FD4912',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      buildNumber: '2',
      ...iosConfig,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationQueriesSchemes: [
          'instagram',
          'instagram-stories',
          'fb',
          'twitter',
          'x-com.twitter.android',
        ],
      },
    },
    android: {
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: ['android.permission.CAMERA'],
      package: 'xyz.pingme.app',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'app.pingme.xyz',
              pathPrefix: '/',
            },
            {
              scheme: 'https',
              host: 'app.staging.pingme.xyz',
              pathPrefix: '/',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    extra: {
      eas: {
        projectId: '27fd7c79-94a6-48d9-967b-dc7cafa7a950',
      },
    },
  },
};
