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
  showMessage({
    message: title ?? message,
    description: title ? message : undefined,
    type,
    icon: icon ?? (type !== 'default' ? type : undefined),
    floating: true,
    duration: 2500,
    onHide,
  });
}
