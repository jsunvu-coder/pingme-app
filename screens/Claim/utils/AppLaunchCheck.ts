import { EMAIL_KEY, PASSWORD_KEY, USE_BIOMETRIC_KEY } from 'business/Constants';
import * as SecureStore from 'expo-secure-store';

const FIRST_RUN_COMPLETED_KEY = 'FIRST_RUN_COMPLETED';

/**
 * Run this early on app startup (e.g., in App.tsx)
 * Clears any leftover credentials from previous installs on first run.
 * 
 * Uses SecureStore for the first-run flag to ensure reliable persistence
 * across app restarts (unlike AsyncStorage which doesn't persist in dev).
 * 
 * This is mainly useful for:
 * - Development: Clean state when reinstalling app on simulator
 * - Preventing "ghost credentials" from previous installations
 */
export async function checkFirstRunAndClear() {
  try {
    const firstRunFlag = await SecureStore.getItemAsync(FIRST_RUN_COMPLETED_KEY);

    if (!firstRunFlag) {
      // Only clear if these keys actually exist (avoid unnecessary operations)
      const hasEmail = await SecureStore.getItemAsync(EMAIL_KEY);
      const hasPassword = await SecureStore.getItemAsync(PASSWORD_KEY);
      const hasBiometric = await SecureStore.getItemAsync(USE_BIOMETRIC_KEY);
      
      if (hasEmail || hasPassword || hasBiometric) {
        await SecureStore.deleteItemAsync(EMAIL_KEY);
        await SecureStore.deleteItemAsync(PASSWORD_KEY);
        await SecureStore.deleteItemAsync(USE_BIOMETRIC_KEY);
      }

      await SecureStore.setItemAsync(FIRST_RUN_COMPLETED_KEY, 'true');
    }
  } catch (err) {
    console.error('[AppLaunch] Failed to check first run:', err);
  }
}
