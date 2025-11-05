import CheckCircleIcon from 'assets/CheckCircleIcon';
import { View, Text } from 'react-native';
import { t } from 'i18n';

export default function PasswordRules({ password }: { password: string }) {
  const rules = [
    { text: t('AUTH_PASSWORD_RULE_LENGTH'), valid: password.length >= 8 },
    { text: t('AUTH_PASSWORD_RULE_NUMBER'), valid: /\d/.test(password) },
    { text: t('AUTH_PASSWORD_RULE_UPPERCASE'), valid: /[A-Z]/.test(password) },
  ];

  return (
    <View className="flex-row flex-wrap justify-between">
      {rules.map((rule, idx) => (
        <View
          key={idx}
          className="flex-row items-center mr-4 mb-2"
        >
          <CheckCircleIcon isSelected={rule.valid} />
          <Text
            className={`ml-2 text-sm ${rule.valid ? 'text-green-600' : 'text-gray-500'}`}
          >
            {rule.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
