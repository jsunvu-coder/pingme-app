import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { selectAppFullyFunctional } from 'store/authSlice';

type Options = {
  /** Override alert title. Defaults to "Messaging keys required". */
  title?: string;
  /** Override alert message. Defaults to the standard hint. */
  message?: string;
};

type HookResult = {
  /** True when the user's messaging keys are known to be present. */
  fullyFunctional: boolean;
  /**
   * Returns true when the action may proceed. Shows the blocking alert and
   * returns false when keys are missing.
   *
   *   const { guard } = useRequireMessagingKeys();
   *   const onPress = () => {
   *     if (!guard()) return;
   *     // …
   *   };
   */
  guard: () => boolean;
  /**
   * Wraps a handler so it only runs when keys are present. If not, shows the
   * alert and skips the handler.
   *
   *   const { wrap } = useRequireMessagingKeys();
   *   <Button onPress={wrap(() => navigate('Send'))} />
   */
  wrap: <Args extends unknown[]>(fn: (...args: Args) => void) => (...args: Args) => void;
};

/**
 * Shared guard for the "heavily disabled" state (spec: Sign In step 2).
 * Reuses `selectAppFullyFunctional` under the hood so all gating sites stay
 * in sync with login / generate-new-key outcomes.
 */
export function useRequireMessagingKeys(options?: Options): HookResult {
  const fullyFunctional = useSelector(selectAppFullyFunctional);

  const showAlert = useCallback(() => {
    Alert.alert(
      options?.title ?? 'Email verification required',
      options?.message ??
        'Please verify your email address to use this feature. You can do it from the Account menu.'
    );
  }, [options?.title, options?.message]);

  const guard = useCallback((): boolean => {
    if (!fullyFunctional) {
      showAlert();
      return false;
    }
    return true;
  }, [fullyFunctional, showAlert]);

  const wrap = useCallback(
    <Args extends unknown[]>(fn: (...args: Args) => void) =>
      (...args: Args) => {
        if (!fullyFunctional) {
          showAlert();
          return;
        }
        fn(...args);
      },
    [fullyFunctional, showAlert]
  );

  return { fullyFunctional, guard, wrap };
}
