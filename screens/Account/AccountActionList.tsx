import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { push } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const savedPref = await AsyncStorage.getItem('useBiometric');
      if (savedPref === 'true') setUseBiometric(true);

      const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await AuthService.getInstance().logout();
      await AsyncStorage.clear();
      const secureKeys = ['lastEmail', 'lastPassword'];
      for (const key of secureKeys) {
        await SecureStore.deleteItemAsync(key);
      }

      push('SplashScreen');
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
              await AsyncStorage.setItem('useBiometric', 'false');
              await SecureStore.deleteItemAsync('lastEmail');
              await SecureStore.deleteItemAsync('lastPassword');
              setUseBiometric(false);
              Alert.alert('Biometric login disabled');
            },
          },
        ]
      );
    } else {
      // From OFF → ON
      Alert.alert(
        `Enable ${biometricType ?? 'biometric'} login`,
        'To enable biometric login, you must log out and sign in again to securely store your credentials.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log out now',
            onPress: async () => {
              await AsyncStorage.setItem('useBiometric', 'true');
              setUseBiometric(true);
              handleLogout();
            },
          },
        ]
      );
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
      action: () => {},
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
