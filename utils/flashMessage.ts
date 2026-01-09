import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showMessage, hideMessage } from 'react-native-flash-message';

type FlashMessageType = 'default' | 'info' | 'success' | 'warning' | 'danger';
type FlashMessageIcon = 'success' | 'info' | 'warning' | 'danger' | 'auto' | 'none';

type FlashMessageParams = {
  message: string;
  title?: string;
  type?: FlashMessageType;
  icon?: FlashMessageIcon;
  onHide?: () => void;
};

export function getAndroidDangerOverrides(type: FlashMessageType) {
  return Platform.OS === 'android' && type === 'danger'
    ? {
        backgroundColor: '#FB1028',
        color: '#FFFFFF',
        titleStyle: { color: '#FFFFFF' },
        textStyle: { color: '#FFFFFF' },
      }
    : {};
}

export function showFlashMessage({
  message,
  title,
  type = 'default',
  icon,
  onHide,
}: FlashMessageParams) {
  const androidDangerOverrides = getAndroidDangerOverrides(type);

  showMessage({
    message: title ?? message,
    description: title ? message : undefined,
    type,
    icon: icon ?? (type !== 'default' ? type : undefined),
    floating: true,
    duration: 2500,
    onHide,
    ...androidDangerOverrides,
  });
}

// Blocking flash message that can only be dismissed via an explicit Logout button.
export function showBlockingLogoutFlashMessage(opts?: {
  title?: string;
  message?: string;
  onLogout?: () => void;
}) {
  const type: FlashMessageType = 'danger';
  const androidDangerOverrides = getAndroidDangerOverrides(type);

  const title = opts?.title ?? 'Session invalid';
  const message = opts?.message ?? 'Your session is no longer valid. Please log out to continue.';
  const onLogout = opts?.onLogout;

  showMessage({
    message: title,
    type,
    icon: 'danger',
    floating: true,
    position: 'center',
    autoHide: false,
    hideOnPress: false,
    renderCustomContent: () =>
      React.createElement(
        View,
        { style: styles.logoutContainer },
        React.createElement(Text, { style: styles.messageText }, message),
        React.createElement(
          TouchableOpacity,
          {
            style: styles.logoutButton,
            activeOpacity: 0.8,
            onPress: () => {
              // First hide the flash message UI
              hideMessage();
              // Then perform the actual logout logic
              if (onLogout) {
                onLogout();
              }
            },
          },
          React.createElement(Text, { style: styles.logoutButtonText }, 'Logout')
        )
      ),
    ...androidDangerOverrides,
  });
}

const styles = StyleSheet.create({
  logoutContainer: {
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  logoutButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FB1028',
    fontWeight: '600',
    fontSize: 16,
  },
});
