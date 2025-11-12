import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMAIL_KEY, PASSWORD_KEY, USE_BIOMETRIC_KEY } from 'business/Constants';
import * as SecureStore from 'expo-secure-store';

const FIRST_RUN_KEY = 'isFirstRun';

/**
 * Run this early on app startup (e.g., in App.tsx)
 * If this is the first run after install, clear SecureStore credentials.
 */
export async function checkFirstRunAndClear() {
  try {
    const firstRunFlag = await AsyncStorage.getItem(FIRST_RUN_KEY);

    if (!firstRunFlag) {
      await SecureStore.deleteItemAsync(EMAIL_KEY);
      await SecureStore.deleteItemAsync(PASSWORD_KEY);
      await SecureStore.deleteItemAsync(USE_BIOMETRIC_KEY);

      await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
    }
  } catch (err) {
    console.error('❌ Failed to check first run:', err);
  }
}
