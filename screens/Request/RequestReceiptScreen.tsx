import { View, Text, TouchableOpacity } from "react-native";
import ModalContainer from "components/ModalContainer";
import { push } from "navigation/Navigation";

export default function RequestReceiptScreen() {
  return (
    <ModalContainer>
      {/* Avatar */}
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center">
          <Text className="text-3xl text-gray-400">👤</Text>
        </View>
      </View>

      {/* Title + subtitle */}
      <Text className="text-2xl font-semibold text-center text-gray-900 mb-2">
        Payment Link Created
      </Text>
      <Text className="text-center text-gray-500 mb-6">
        We have created a payment request link for you to share via{" "}
        <Text className="font-medium text-gray-700">WhatsApp</Text>
      </Text>

      {/* Divider */}
      <View className="border-b border-gray-200 mb-4" />

      {/* Amount row */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-500">Amount</Text>
        <Text className="font-semibold text-gray-900">$100.00</Text>
      </View>

      {/* Note row */}
      <View className="flex-row mb-4">
        <Text className="text-gray-500 w-20">Note</Text>
        <Text className="font-medium text-gray-900 flex-1">
          Lunch share for yesterday
        </Text>
      </View>

      {/* Link row */}
      <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3 mb-8">
        <Text className="flex-1 text-gray-600" numberOfLines={1} ellipsizeMode="tail">
          https://pingme.app/pay/4f9fj39fj39fj39fj39fj
        </Text>
        <TouchableOpacity onPress={() => console.log("Copy link")}>
          <Text className="text-gray-500 ml-2">📋</Text>
        </TouchableOpacity>
      </View>

      {/* Footer actions */}
      <View className="flex-row justify-between mt-auto">
        <TouchableOpacity
          onPress={() => push("MainTab")}
          className="flex-1 mr-2 py-4 border border-gray-300 rounded-full items-center"
        >
          <Text className="text-gray-600 font-medium">Back to Homepage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => console.log("Share now")}
          className="flex-1 ml-2 py-4 bg-black rounded-full items-center"
        >
          <Text className="text-white font-semibold">Share Now</Text>
        </TouchableOpacity>
      </View>
    </ModalContainer>
  );
}
