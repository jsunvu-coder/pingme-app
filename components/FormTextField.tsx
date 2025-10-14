import { View, Text, TextInput } from "react-native";

type FormTextFieldProps = {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  rightElement?: React.ReactNode;
  topRightHint?: string;      // e.g. "Min 3 Days", "Max 250 characters"
  bottomHint?: string;        // e.g. "The payment link will expire..."
  bottomHintIcon?: string;    // optional icon (like "ℹ️")
  required?: boolean;
  defaultValue?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
};

export default function FormTextField({
  label,
  placeholder,
  value,
  onChangeText,
  rightElement,
  topRightHint,
  bottomHint,
  bottomHintIcon,
  required,
  defaultValue,
  keyboardType = "default",
  multiline,
}: FormTextFieldProps) {
  return (
    <View className="mb-6">
      {/* Label + top-right hint */}
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">
          {label} {required && <Text className="text-red-500">*</Text>}
        </Text>
        {topRightHint && (
          <Text className="text-gray-500 text-sm">{topRightHint}</Text>
        )}
      </View>

      {/* Input */}
      <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2">
        <TextInput
          className="flex-1 text-gray-800"
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
        />
        {rightElement}
      </View>

      {/* Bottom hint */}
      {bottomHint && (
        <View className="flex-row mt-2">
          {bottomHintIcon && <Text className="mr-1">{bottomHintIcon}</Text>}
          <Text className="text-gray-500 text-sm flex-1">{bottomHint}</Text>
        </View>
      )}
    </View>
  );
}
