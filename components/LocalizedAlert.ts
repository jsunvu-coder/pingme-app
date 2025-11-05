import { Alert, AlertButton } from 'react-native';
import { t } from 'i18n';

export function showLocalizedAlert({
  message,
  title = 'CONFIRMATION_TITLE',
  buttons,
}: {
  message: string;
  title?: string;
  buttons?: AlertButton[];
}): Promise<boolean> {
  return new Promise((resolve) => {
    const displayMessage = t(message, undefined, message);
    const displayTitle = t(title, undefined, title);

    const defaultButtons: AlertButton[] = [
      { text: t('OK_BUTTON', undefined, 'OK'), onPress: () => resolve(true) },
    ];

    const candidates = buttons && buttons.length > 0 ? buttons : defaultButtons;

    Alert.alert(
      displayTitle,
      displayMessage,
      candidates.map((btn) => {
        const displayText = btn.text ? t(btn.text, undefined, btn.text) : btn.text;
        return {
          ...btn,
          text: displayText,
          onPress: () => {
            btn.onPress?.();
            const normalizedText = (displayText ?? '').toUpperCase();
            resolve(normalizedText === 'OK' || normalizedText === 'CONFIRM');
          },
        };
      })
    );
  });
}
