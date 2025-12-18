module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  watchman: false,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|expo-clipboard|expo-camera|expo-file-system|expo-image-picker|expo-local-authentication|expo-media-library|expo-secure-store|expo-status-bar|expo-application|expo-contacts|expo-asset|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|@gorhom/bottom-sheet|react-native-flash-message|react-native-qrcode-svg|react-native-worklets|@noble/hashes)/)',
  ],
};
