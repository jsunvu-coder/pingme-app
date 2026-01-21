import { Ionicons } from '@expo/vector-icons';
import MinusIcon from 'assets/MinusIcon';
import PlusOutlineIcon from 'assets/PlusOutlineIcon';
import { ReactNode } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

type CounterInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  icon?: IconName | ReactNode;
  iconSize?: number;
  iconColor?: string;
  showMaxInfo?: string;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  helperTextColor?: string;
};

export default function CounterInput({
  value,
  onValueChange,
  min = 1,
  max = 100,
  step = 1,
  label = '',
  icon,
  iconSize = 20,
  iconColor = '#1D1D1D',
  showMaxInfo,
  disabled = false,
  placeholder = '0',
  helperText,
  helperTextColor = '#FB1028',
}: CounterInputProps) {
  const numValue = parseInt(value, 10) || 0;

  const handleDecrement = () => {
    if (numValue > min && !disabled) {
      onValueChange(String(numValue - step));
    }
  };

  const handleIncrement = () => {
    if (numValue < max && !disabled) {
      onValueChange(String(numValue + step));
    }
  };

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

  const canDecrement = numValue > min && !disabled;
  const canIncrement = numValue < max && !disabled;

  const handleTextChange = (text: string) => {
    if (disabled) return;

    // Allow empty input for editing
    if (text === '') {
      onValueChange('');
      return;
    }

    // Parse and validate numeric input
    const parsedValue = parseInt(text, 10);
    if (!isNaN(parsedValue)) {
      // Clamp value between min and max
      const clampedValue = Math.max(min, Math.min(max, parsedValue));
      onValueChange(String(clampedValue));
    }
  };

  return (
    <View>
      {/* Header */}
      {(label || icon || showMaxInfo) && (
        <View
          style={{
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderIcon()}
            {label && (
              <Text style={{ marginLeft: 8, fontSize: 14, color: '#444' }}>{label}</Text>
            )}
          </View>
          {showMaxInfo && <Text style={{ fontSize: 14, color: '#444' }}>{showMaxInfo}</Text>}
        </View>
      )}

      {/* Counter */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
        {/* Decrement Button */}
        <TouchableOpacity
          onPress={handleDecrement}
          disabled={!canDecrement}
          style={{ height: 48, width: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <MinusIcon color={canDecrement ? '#3B3A3A' : '#ccc'} />
        </TouchableOpacity>

        {/* Value Input */}
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: '500',
            color: '#111827',
            minWidth: 80,
          }}
          selectTextOnFocus
        />

        {/* Increment Button */}
        <TouchableOpacity
          onPress={handleIncrement}
          disabled={!canIncrement}
          style={{ height: 48, width: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <PlusOutlineIcon width={24} height={24} color={canIncrement ? '#fff' : '#ccc'} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View
        style={{ backgroundColor: helperText ? helperTextColor : '#3B3A3A', height: 2}}
      />

      {/* Helper Text */}
      {helperText && (
        <Text style={{ marginTop: 4, fontSize: 12, color: helperTextColor }}>{helperText}</Text>
      )}
    </View>
  );
}
