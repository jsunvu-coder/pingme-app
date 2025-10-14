import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChannelsTabView from "components/ChannelsTabView";
import FormTextField from "components/FormTextField";
import { push } from "navigation/Navigation";

export default function RequestPaymentScreen() {
  const [activeTab, setActiveTab] = useState("Email");
  const [email, setEmail] = useState("emily.chan88@gmail.com");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-white px-6 pt-6">
      {/* Header */}
      <Text className="text-xl font-semibold text-center mb-6">
        Request Payment
      </Text>

      {/* Channels */}
      <ChannelsTabView activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Email field */}
      {activeTab === "Email" && (
        <FormTextField
          label="Recipient’s email"
          required
          placeholder="Enter email"
          value={email}
          onChangeText={setEmail}
          rightElement={<Text className="text-gray-400 ml-2">📧</Text>}
        />
      )}

      {/* Amount field */}
      <FormTextField
        label="Payment amount"
        required
        placeholder="Enter amount"
        value={amount}
        onChangeText={setAmount}
        topRightHint="Available $1,000.00"
        rightElement={<Text className="text-gray-400 ml-2">$</Text>}
      />

      {/* Note field */}
      <FormTextField
        label="Note (Optional)"
        placeholder="Enter note"
        value={note}
        onChangeText={setNote}
        topRightHint="Max 250 characters"
        multiline
      />

      {/* Bottom buttons */}
      <Footer
        onCancel={() => console.log("Cancel pressed")}
        onContinue={() => push("RequestConfirmScreen")}
      />
    </SafeAreaView>
  );
}

function Footer({
  onCancel,
  onContinue,
}: {
  onCancel?: () => void;
  onContinue?: () => void;
}) {
  return (
    <View className="flex-row justify-between mt-4 mb-6">
      <TouchableOpacity
        onPress={onCancel}
        className="flex-1 py-4 border border-gray-300 rounded-full mr-2 items-center"
      >
        <Text className="text-gray-600 font-medium">Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onContinue}
        className="flex-1 py-4 bg-black rounded-full ml-2 items-center"
      >
        <Text className="text-white font-semibold">Continue</Text>
      </TouchableOpacity>
    </View>
  );
}
