import { View, Text, TextInput, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';

type IconName = keyof typeof Ionicons.glyphMap;

type LabeledInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  editable?: boolean;
  label?: string;
  icon?: IconName | ReactNode; // Can be icon name or React component
  iconSize?: number;
  iconColor?: string;
  showCharCount?: boolean;
  showMaxInfo?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  textClassName?: string;
  helperText?: string;
  helperTextColor?: string;
};

export default function LabeledInput({
  value,
  onChangeText,
  placeholder = 'Add a message...',
  maxLength = 80,
  editable = true,
  label = '',
  icon = 'chatbubble-outline',
  iconSize = 20,
  iconColor = '#1D1D1D',
  showCharCount = true,
  showMaxInfo,
  multiline = true,
  keyboardType = 'default',
  helperText,
  helperTextColor = '#FB1028',
}: LabeledInputProps) {
  // Render icon - either Ionicons or custom component
  const renderIcon = () => {
    if (!icon) return null;
    
    // If icon is a string (Ionicons name)
    if (typeof icon === 'string') {
      return <Ionicons name={icon as IconName} size={iconSize} color={iconColor} />;
    }
    
    // If icon is a React component
    return <>{icon}</>;
  };

  return (
    <View>
      {/* Header */}
      {(label || icon || showMaxInfo || showCharCount) && (
        <View className="mb-2 flex-row items-center justify-between px-2">
          <View className="flex-row items-center">
            {renderIcon()}
            {label && <Text className="ml-2 text-base text-gray-700">{label}</Text>}
          </View>
          {showMaxInfo ? (
            <Text className="text-sm text-[#444]">{showMaxInfo}</Text>
          ) : (
            showCharCount && (
              <Text className="text-sm text-[#444]">
                {value.length}/{maxLength}
              </Text>
            )
          )}
        </View>
      )}

      {/* Input */}
      <TextInput
        value={value}
        onChangeText={(text) => {
          if (maxLength && text.length <= maxLength) {
            onChangeText(text);
          } else if (!maxLength) {
            onChangeText(text);
          }
        }}
        placeholder={placeholder}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        style={{ padding: 8, fontSize: 16, marginVertical: 8}}
        maxLength={maxLength}
      />

      {/* Divider */}
      <View
        style={{ backgroundColor: helperText ? helperTextColor : '#3B3A3A', height: 2 }}
      />

      {/* Helper Text */}
      {helperText && (
        <Text style={{ marginTop: 4, fontSize: 12, color: helperTextColor }}>{helperText}</Text>
      )}
    </View>
  );
}
