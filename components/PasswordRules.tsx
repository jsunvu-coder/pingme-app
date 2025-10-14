import CheckCircleIcon from "assets/CheckCircleIcon";
import { View, Text } from "react-native";

export default function PasswordRules({ password }: { password: string }) {
  const rules = [
    { text: "8 characters", valid: password.length >= 8 },
    { text: "1 number", valid: /\d/.test(password) },
    { text: "1 uppercase letter", valid: /[A-Z]/.test(password) },
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
            className={`ml-2 text-sm ${rule.valid ? "text-green-600" : "text-gray-500"}`}
          >
            {rule.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
