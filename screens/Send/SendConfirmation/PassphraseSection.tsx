import { View, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import AuthInput from 'components/AuthInput';

type Props = {
  usePassphrase: boolean;
  setUsePassphrase: (value: boolean) => void;
  passphrase: string;
  setPassphrase: (value: string) => void;
  disabled?: boolean;
};

export default function PassphraseSection({
  usePassphrase,
  setUsePassphrase,
  passphrase,
  setPassphrase,
  disabled,
}: Props) {
  const inputRef = useRef<any>(null);

  // 👇 Auto-focus input when enabled
  useEffect(() => {
    if (usePassphrase && inputRef.current) {
      inputRef.current.focus();
    }
  }, [usePassphrase]);

  return (
    <View
      className={`rounded-2xl p-6 ${
        usePassphrase
          ? 'border border-[#14B957] bg-white'
          : 'border border-transparent bg-[#F4F4F4]'
      }`}>
      {/* Header Row */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="key-outline" size={22} color="#6b7280" style={{ marginRight: 8 }} />
          <Text className="text-md text-gray-600">Enter passphrase</Text>
        </View>

        <Switch
          value={usePassphrase}
          disabled={disabled}
          onValueChange={(val) => {
            if (disabled) return;
            setUsePassphrase(val);
            if (val) {
              setTimeout(() => inputRef.current?.focus(), 150);
            } else {
              setPassphrase('');
              inputRef.current?.blur();
            }
          }}
        />
      </View>

      {/* Input Field */}
      <View className="mb-6">
        <AuthInput
          ref={inputRef}
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="Enter passphrase"
          editable={usePassphrase} // disable when switch off
        />
      </View>

      {/* Info Text */}
      <View className="flex-row items-start">
        <Ionicons
          name="information-circle-sharp"
          size={18}
          color="#3B82F6"
          style={{ marginRight: 6, marginTop: 2 }}
        />
        <Text className="flex-1 text-sm leading-relaxed text-gray-600">
          Provide a passphrase if required. Share it with the recipient exactly as entered.
        </Text>
      </View>
    </View>
  );
}
