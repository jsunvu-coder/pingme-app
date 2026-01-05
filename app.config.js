module.exports = {
  expo: {
    name: 'PingMe',
    slug: 'pingme',
    version: '1.0.0',
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
          recordAudioAndroid: true,
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
      bundleIdentifier: 'xyz.pingme.app',
      associatedDomains: ['applinks:app.pingme.xyz', 'applinks:app.staging.pingme.xyz'],
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
      appleTeamId: 'BMN9N6C39P',
    },
    android: {
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: ['android.permission.CAMERA', 'android.permission.RECORD_AUDIO'],
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
