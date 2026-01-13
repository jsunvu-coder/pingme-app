import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as LocalAuthentication from 'expo-local-authentication';
import { push, setRootScreen } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import { AccountDataService } from 'business/services/AccountDataService';
import { ENV_STORAGE_KEY, getEnv, loadEnvFromStorage, setEnv } from 'business/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginViewModel } from 'screens/Onboarding/Auth/LoginViewModel';
import { LOCKBOX_METADATA_STORAGE_PREFIX } from 'business/services/LockboxMetadataStorage';
import { useAppDispatch } from 'store/hooks';
import { clearHistory } from 'store/historySlice';

const version = Application.nativeApplicationVersion ?? '';
const build = Application.nativeBuildVersion ?? '';

type ItemProps = {
  label: string;
  action?: () => void;
  rightView?: React.ReactNode;
  disabled?: boolean;
};

export default function AccountActionList() {
  const dispatch = useAppDispatch();
  const [biometricType, setBiometricType] = useState<
    'Face ID' | 'Touch ID' | 'Biometric Authentication' | null
  >(null);
  const [useBiometric, setUseBiometric] = useState(false);
  const [env, setEnvState] = useState<'staging' | 'production'>(getEnv());
  const [loggingOut, setLoggingOut] = useState(false);
  const email = AccountDataService.getInstance().email ?? '';
  const canChangeEnvironment = /@hailstonelabs\.com$/i.test(email);

  // === Load saved preference and detect device biometric type
  useEffect(() => {
    (async () => {
      const vm = new LoginViewModel();
      const init = await vm.initialize();
      setUseBiometric(init.useBiometric);
      setBiometricType(init.biometricType);
      if (Platform.OS === 'android') {
        setBiometricType('Biometric Authentication');
      }
      const storedEnv = await loadEnvFromStorage();
      setEnvState(storedEnv);
    })();
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const preservedEnv = await AsyncStorage.getItem(ENV_STORAGE_KEY);
      await AuthService.getInstance().logout();
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(
        (k) => k !== ENV_STORAGE_KEY && !k.startsWith(LOCKBOX_METADATA_STORAGE_PREFIX)
      );
      if (keysToRemove.length) await AsyncStorage.multiRemove(keysToRemove);
      if (preservedEnv) {
        await AsyncStorage.setItem(ENV_STORAGE_KEY, preservedEnv);
      }
      await LoginViewModel.clearSavedCredentials();
      await LoginViewModel.setUseBiometricPreference(false);

      setRootScreen(['SplashScreen']);
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  // === Toggle biometric preference logic
  const handleToggleBiometric = async (value: boolean) => {
    if (!value) {
      // From ON → OFF
      Alert.alert(
        `Disable ${biometricType ?? 'biometric'} login`,
        'Your saved login credentials will be removed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await LoginViewModel.clearSavedCredentials();
              await LoginViewModel.setUseBiometricPreference(false);
              setUseBiometric(false);
              Alert.alert('Biometric login disabled');
            },
          },
        ]
      );
    } else {
      setUseBiometric(true);
      const capability = await LoginViewModel.ensureCapability();
      if (!capability.available) {
        const reason = capability.needsEnrollment
          ? 'Biometric authentication not set up on this device.'
          : 'Biometric authentication is not supported on this device.';
        Alert.alert('Unavailable', reason);
        setUseBiometric(false);
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${capability.type ?? biometricType ?? 'biometric'} login`,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
      });

      if (!authResult.success) {
        Alert.alert('Face ID', 'Authentication failed.');
        setUseBiometric(false);
        return;
      }

      const { email, password } = await LoginViewModel.getStoredCredentials();
      if (!email || !password) {
        Alert.alert(
          'Missing credentials',
          'Please log out and sign in again to securely store your credentials before enabling Face ID.'
        );
        setUseBiometric(false);
        return;
      }

      await LoginViewModel.saveCredentials(email, password);
      await LoginViewModel.setUseBiometricPreference(true);
      setUseBiometric(true);
      Alert.alert('Success', `${capability.type ?? biometricType ?? 'Biometric'} login enabled.`);
    }
  };

  const clearHistoryCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const historyKeys = keys.filter((k) => k.startsWith('@ping_history_cache::'));
      if (historyKeys.length) {
        await AsyncStorage.multiRemove(historyKeys);
      }
    } catch (err) {
      console.warn('⚠️ Failed to clear history cache', err);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all transaction history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Clear history for current account
            const accountEmail = AccountDataService.getInstance().email;
            if (accountEmail) {
              dispatch(clearHistory({ accountEmail }));
            }
            Alert.alert('Success', 'History cleared successfully.');
          },
        },
      ]
    );
  };

  const handleEnvSwitch = (nextEnv: 'staging' | 'production') => {
    if (nextEnv === env) return;

    Alert.alert(
      'Switch environment',
      `Change to ${nextEnv}?\nYou will be logged out and need to sign in again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setEnvState(nextEnv);
            await setEnv(nextEnv);
            await clearHistoryCache();
            await LoginViewModel.clearSavedCredentials();
            await LoginViewModel.setUseBiometricPreference(false);
            await AuthService.getInstance().logout();
            await AsyncStorage.setItem(ENV_STORAGE_KEY, nextEnv);
            setRootScreen(['SplashScreen']);
          },
        },
      ]
    );
  };

  const envSwitcher: ItemProps | null = canChangeEnvironment
    ? {
        label: 'Environment',
        action: () => {
          Alert.alert('Environment', 'Select backend environment', [
            { text: 'Production', onPress: () => handleEnvSwitch('production') },
            { text: 'Staging', onPress: () => handleEnvSwitch('staging') },
            { text: 'Cancel', style: 'cancel' },
          ]);
        },
        rightView: (
          <Text className="text-lg text-gray-400">
            {env === 'production' ? 'Production' : 'Staging'}
          </Text>
        ),
      }
    : null;

  const items: ItemProps[] = [
    {
      label: 'Withdraw',
      action: () => push('WithdrawScreen'),
      rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
    },
    {
      label: 'Password Recovery',
      action: () => push('AccountRecoveryScreen'),
      rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
    },
    {
      label: 'Change Password',
      action: () => push('ChangePasswordScreen'),
      rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
    },
    // {
    //   label: 'Clear History',
    //   action: handleClearHistory,
    //   rightView: <Ionicons name="trash-outline" size={20} color="#FD4912" />,
    // },
    // {
    //   label: 'Rate us on App Store',
    //   action: () => {},
    //   rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
    // },
    {
      label: 'About PingMe',
      action: () => {},
      rightView: (
        <Text className="text-lg text-gray-400">
          v{version} - {build}
          {env === 'staging' ? ' - staging' : ''}
        </Text>
      ),
    },
  ];

  return (
    <View className="mt-6 overflow-hidden rounded-2xl">
      {envSwitcher && <Item {...envSwitcher} />}

      {/* 🔐 Biometric Login Toggle (now FIRST) */}
      <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-white p-6">
        <Text className="text-lg text-black">Login with {biometricType ?? 'Face/Touch ID'}</Text>
        <Switch
          value={useBiometric}
          onValueChange={handleToggleBiometric}
          trackColor={{ false: '#ccc', true: '#FD4912' }}
          thumbColor={useBiometric ? '#fff' : '#f4f3f4'}
        />
      </View>

      {/* Default Items */}
      {items.map((item, index) => (
        <Item key={index} {...item} />
      ))}

      {/* Spacer */}
      <View className="h-6" />

      {/* Logout */}
      <Item
        label="Log out"
        action={handleLogout}
        rightView={<Ionicons name="log-out-outline" size={22} color="#FD4912" />}
      />
    </View>
  );
}

const Item = ({ label, action, rightView }: ItemProps) => (
  <TouchableOpacity
    onPress={action}
    activeOpacity={0.7}
    className="mt-3 flex-row items-center justify-between rounded-2xl bg-white p-6">
    <Text className="text-lg text-black">{label}</Text>
    {rightView ?? <Ionicons name="chevron-forward" size={20} color="#FD4912" />}
  </TouchableOpacity>
);
