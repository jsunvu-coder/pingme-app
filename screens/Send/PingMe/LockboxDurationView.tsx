import { View, Text } from 'react-native';
import AuthInput from 'components/AuthInput';
import PasswordIcon from 'assets/PasswordIcon';

type Props = {
  value: string;
  onChange: (text: string) => void;
};

export default function LockboxDurationView({ value, onChange }: Props) {
  return (
    <View className="mt-6">
      <View>
        <AuthInput
          icon={<PasswordIcon />}
          value={value}
          onChangeText={onChange}
          placeholder="Lockbox Duration (in days)"
          keyboardType="decimal-pad"
        />
        <Text className="absolute right-0 bottom-10 text-lg">Days</Text>
      </View>
    </View>
  );
}
