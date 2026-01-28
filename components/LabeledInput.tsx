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
  placeholderTextColor?: string;
  integerOnly?: boolean;
  minValue?: number;  
  textColor?: string;
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
  minValue = 1,
  multiline = true,
  keyboardType = 'default',
  helperText,
  helperTextColor = '#FB1028',
  placeholderTextColor = '#909090',
  textColor = '#0F0F0F',
  integerOnly = false,
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

  const handleChangeText = (text: string) => {
    let processedText = text;
    // Handle integerOnly: only allow digits (0-9)
    if (integerOnly) {
      try {
        const digitsOnly = text.replace(/[^0-9]/g, '');

        // If user only typed non-digit (e.g. "."), keep input as empty
        if (digitsOnly.length === 0) {
          onChangeText('');
          return;
        }

        let processedInt = parseInt(digitsOnly, 10);

        if (isNaN(processedInt)) {
          processedInt = minValue;
        }
        if (processedInt < minValue) {
          processedInt = minValue;
        }
        const maxValue = parseInt(
          parseFloat(showMaxInfo?.replace(/[^0-9]/g, '') ?? '0').toString(),
          10
        );
        if (!isNaN(maxValue) && maxValue > 0 && processedInt > maxValue) {
          processedInt = maxValue;
        }
        processedText = processedInt.toString();
      } catch (error) {
        processedText = minValue.toString();
      }
    }

    // Apply maxLength if specified
    if (maxLength && processedText.length <= maxLength) {
      onChangeText(processedText);
    } else if (!maxLength) {
      onChangeText(processedText);
    }
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
            <Text style={{ fontSize: 14, color: '#444' }}>{showMaxInfo}</Text>
          ) : (
            showCharCount && (
              <Text style={{ fontSize: 14, color: '#444' }}>
                {value.length}/{maxLength}
              </Text>
            )
          )}
        </View>
      )}

      {/* Input */}
      <TextInput
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        style={{ padding: 8, fontSize: 16, marginVertical: 8, color: textColor }}
        maxLength={maxLength}
      />

      {/* Divider */}
      <View style={{ backgroundColor: helperText ? helperTextColor : '#3B3A3A', height: 2 }} />

      {/* Helper Text */}
      {helperText && (
        <Text style={{ marginTop: 4, fontSize: 12, color: helperTextColor }}>{helperText}</Text>
      )}
    </View>
  );
}
