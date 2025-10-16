import { Alert, AlertButton } from 'react-native';
import enUS from 'i18n/en-US.json';

export function showLocalizedAlert({
  message,
  title = 'Confirmation',
  buttons,
}: {
  message: string;
  title?: string;
  buttons?: AlertButton[];
}): Promise<boolean> {
  return new Promise((resolve) => {
    const displayMessage = Object.prototype.hasOwnProperty.call(enUS, message)
      ? enUS[message as keyof typeof enUS]
      : message;

    const defaultButtons: AlertButton[] = [{ text: 'OK', onPress: () => resolve(true) }];

    Alert.alert(
      title,
      displayMessage,
      buttons && buttons.length > 0
        ? buttons.map((btn) => ({
            ...btn,
            onPress: () => {
              btn.onPress?.();
              resolve(btn.text === 'OK' || btn.text === 'Confirm');
            },
          }))
        : defaultButtons
    );
  });
}
