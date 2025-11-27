import '@testing-library/react-native/matchers';

// Polyfill for clearImmediate
global.clearImmediate = global.clearImmediate || ((id) => clearTimeout(id));
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));

// Mock reanimated
import 'react-native-gesture-handler/jestSetup';
jest.mock('react-native-reanimated', () => require('react-native-reanimated/jest-runtime').default);

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const mockStorage = {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  };
  return {
    __esModule: true,
    default: mockStorage,
  };
});

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
  setString: jest.fn(),
  getString: jest.fn(() => ''),
}));

// Mock expo-contacts
jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getContactsAsync: jest.fn(() => Promise.resolve({ data: [] })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      dispatch: jest.fn(),
      reset: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => false),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
    useIsFocused: jest.fn(() => true),
  };
});

jest.mock('navigation/Navigation', () => ({
  push: jest.fn(),
  setRootScreen: jest.fn(),
  goBack: jest.fn(),
}));

// Mock for react-native-flash-message
jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
  hideMessage: jest.fn(),
  FlashMessage: 'FlashMessage',
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const SafeAreaContext = React.createContext({
    insetTop: 0,
    insetRight: 0,
    insetBottom: 0,
    insetLeft: 0,
  });
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaInsetsContext: SafeAreaContext,
  };
});

jest.mock('expo-camera', () => ({
  Camera: { requestCameraPermissionsAsync: jest.fn(), scanFromURLAsync: jest.fn() },
  CameraView: 'CameraView',
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  const Mock = () => <View />;
  return new Proxy(
    {},
    {
      get: () => Mock,
    }
  );
});
