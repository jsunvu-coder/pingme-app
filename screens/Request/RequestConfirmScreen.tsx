import { View, Text } from "react-native";
import ModalContainer from "components/ModalContainer";
import PrimaryButton from "components/PrimaryButton";
import ConfirmHeader from "../Send/SendConfirmation/ConfirmHeader";
import ConfirmRow from "../Send/SendConfirmation/ConfirmRow";
import { push } from "navigation/Navigation";

export default function RequestConfirmScreen() {
  return (
    <ModalContainer>
      {/* Close button header */}
      <ConfirmHeader onClose={() => console.log("Close pressed")} />

      {/* Avatar */}
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center">
          <Text className="text-3xl text-gray-400">👤</Text>
        </View>
      </View>

      {/* Title */}
      <Text className="text-2xl font-semibold text-center text-gray-900 mb-6">
        You’re about to{"\n"}request a payment
      </Text>

      {/* Divider */}
      <View className="border-b border-gray-200 mb-6" />

      {/* Summary rows */}
      <View className="space-y-4 mb-6">
        <ConfirmRow label="Amount" value="$100.00" />
        <ConfirmRow label="Recipient" value="emily.chan88@gmail.com" />
        <ConfirmRow label="Note" value="Lunch share for yesterday" />
      </View>

      {/* Divider */}
      <View className="border-b border-gray-200 mb-6" />

      {/* Bottom button */}
      <PrimaryButton
        title="Send Payment Request"
        onPress={() => push("RequestReceiptScreen")}
      />
    </ModalContainer>
  );
}
