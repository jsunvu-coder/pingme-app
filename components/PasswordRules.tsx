import CheckCircleIcon from 'assets/CheckCircleIcon';
import { View, Text } from 'react-native';
import { t } from 'i18n';
import { getPasswordRuleResults, PASSWORD_MIN_LENGTH } from 'utils/passwordPolicy';

export default function PasswordRules({ password }: { password: string }) {
  const results = getPasswordRuleResults(password);
  const rules = [
    {
      text: t('AUTH_PASSWORD_RULE_LENGTH', { min: PASSWORD_MIN_LENGTH }),
      valid: results.minLength,
    },
    { text: t('AUTH_PASSWORD_RULE_NUMBER'), valid: results.hasNumber },
    { text: t('AUTH_PASSWORD_RULE_UPPERCASE'), valid: results.hasUppercase },
    { text: t('AUTH_PASSWORD_RULE_LOWERCASE'), valid: results.hasLowercase },
  ];

  return (
    <View className="flex-row flex-wrap justify-between">
      {rules.map((rule, idx) => (
        <View key={idx} className="mr-4 mb-2 flex-row items-center">
          <CheckCircleIcon isSelected={rule.valid} />
          <Text className={`ml-2 text-sm ${rule.valid ? 'text-green-600' : 'text-gray-500'}`}>
            {rule.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
