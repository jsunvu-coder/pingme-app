import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import * as Application from 'expo-application';

const version = Application.nativeApplicationVersion ?? '';
const build = Application.nativeBuildVersion ?? '';

import { push } from 'navigation/Navigation';

type ItemProps = {
  label: string;
  action: () => void;
  rightView?: React.ReactNode;
};

type Props = {
  onLogout: () => void;
};

export default function AccountActionList({ onLogout }: Props) {
  const items: ItemProps[] = [
    {
      label: 'Password Recovery',
      action: () => {
        push('AccountRecoveryScreen');
      },
      rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
    },
    // {
    // 	label: "Change Password",
    // 	action: () => {},
    // 	rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
    // },
    // {
    // 	label: "Rate us on App Store",
    // 	action: () => {},
    // 	rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
    // },
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
      {items.map((item, index) => (
        <Item key={index} {...item} />
      ))}

      {/* Spacer */}
      <View className="h-6" />

      <Item
        label="Log out"
        action={onLogout}
        rightView={<Ionicons name="log-out-outline" size={22} color="#FD4912" />}
      />
    </View>
  );
}

const Item = ({ label, action, rightView }: ItemProps) => {
  return (
    <TouchableOpacity
      onPress={action}
      activeOpacity={0.7}
      className="mt-3 flex-row items-center justify-between rounded-2xl bg-white p-6">
      <Text className="text-lg text-black">{label}</Text>
      {rightView ?? <Ionicons name="chevron-forward" size={20} color="#FD4912" />}
    </TouchableOpacity>
  );
};
