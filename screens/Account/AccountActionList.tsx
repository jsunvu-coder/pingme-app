import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as LocalAuthentication from 'expo-local-authentication';
import { push, setRootScreen } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginViewModel } from 'screens/Onboarding/Auth/LoginViewModel';

const version = Application.nativeApplicationVersion ?? '';
const build = Application.nativeBuildVersion ?? '';

type ItemProps = {
  label: string;
  action?: () => void;
  rightView?: React.ReactNode;
};

export default function AccountActionList() {
  const [biometricType, setBiometricType] = useState<'Face ID' | 'Touch ID' | null>(null);
  const [useBiometric, setUseBiometric] = useState(false);

  // === Load saved preference and detect device biometric type
  useEffect(() => {
    (async () => {
      const vm = new LoginViewModel();
      const init = await vm.initialize();
      setUseBiometric(init.useBiometric);
      setBiometricType(init.biometricType);
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await AuthService.getInstance().logout();
      await AsyncStorage.clear();
      await LoginViewModel.clearSavedCredentials();
      await LoginViewModel.setUseBiometricPreference(false);

      setRootScreen(['SplashScreen']);
    } catch (error) {
      console.error('Logout error:', error);
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
        Alert.alert('Unavailable', 'Biometric authentication not set up on this device.');
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

  const items: ItemProps[] = [
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
    {
      label: 'Rate us on App Store',
      action: () => {},
      rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
    },
    {
      label: 'About PingMe',
      action: () => {},
      rightView: (
        <Text className="text-lg text-gray-400">
          v{version} ({build})
        </Text>
      ),
    },
  ];

  return (
    <View className="mt-6 overflow-hidden rounded-2xl">
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
