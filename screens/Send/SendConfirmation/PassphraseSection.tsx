import { View, Text, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AuthInput from "components/AuthInput";

type Props = {
  usePassphrase: boolean;
  setUsePassphrase: (value: boolean) => void;
  passphrase: string;
  setPassphrase: (value: string) => void;
};

export default function PassphraseSection({
  usePassphrase,
  setUsePassphrase,
  passphrase,
  setPassphrase,
}: Props) {
  return (
    
    <View className={` rounded-2xl p-6 ${usePassphrase ? 'bg-white  border border-[#14B957]' : 'bg-[#F4F4F4] border border-transparent'}`}>
      {/* Header Row */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <Ionicons
            name="key-outline"
            size={22}
            color="#6b7280"
            style={{ marginRight: 8 }}
          />
          <Text className="text-gray-600 text-md">Enter passphrase</Text>
        </View>

        <Switch
          value={usePassphrase}
          onValueChange={setUsePassphrase}
        />
      </View>

      {/* Input Field */}
      <View className="mb-6">
        <AuthInput
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="Enter passphrase"
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
        <Text className="text-gray-600 text-sm leading-relaxed flex-1">
          Provide a passphrase if required. Share it with the recipient exactly
          as entered.
        </Text>
      </View>
    </View>
  );
}
