import { View, Text } from 'react-native';
import AuthInput from 'components/AuthInput';
import ClockIcon from 'assets/ClockIcon';

type Props = {
  value: string;
  onChange: (text: string) => void;
};

export default function LockboxDurationView({ value, onChange }: Props) {
  return (
    <View className="mt-6">
      <View className="mb-2 flex-row items-center justify-between">
        <ClockIcon />
      </View>

      <View>
        <AuthInput
          icon={<View />}
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
