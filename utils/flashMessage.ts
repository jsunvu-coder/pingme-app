import { Platform } from 'react-native';
import { showMessage } from 'react-native-flash-message';

type FlashMessageType = 'default' | 'info' | 'success' | 'warning' | 'danger';
type FlashMessageIcon = 'success' | 'info' | 'warning' | 'danger' | 'auto' | 'none';

type FlashMessageParams = {
  message: string;
  title?: string;
  type?: FlashMessageType;
  icon?: FlashMessageIcon;
  onHide?: () => void;
};

export function showFlashMessage({
  message,
  title,
  type = 'default',
  icon,
  onHide,
}: FlashMessageParams) {
  const androidDangerOverrides =
    Platform.OS === 'android' && type === 'danger'
      ? {
          backgroundColor: '#FB1028',
          color: '#FFFFFF',
          titleStyle: { color: '#FFFFFF' },
          textStyle: { color: '#FFFFFF' },
        }
      : {};

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
