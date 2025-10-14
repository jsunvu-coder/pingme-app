import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  active: "Email" | "Link";
  onChange: (value: "Email" | "Link") => void;
};

export default function ChannelSelectView({ active, onChange }: Props) {
  const options = [
    {
      key: "Email",
      title: "Send Email",
      description: "Recipient will receive the email to claim",
    },
    {
      key: "Link",
      title: "Share Link",
      description: "You will share payment link to the recipient",
    },
  ];

  return (
    <View className="flex-row justify-between mt-5">
      {options.map((opt, idx) => {
        const isActive = active === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key as "Email" | "Link")}
            className={`flex-1 rounded-2xl p-4 ${
              isActive ? "border border-[#FD4912]" : "border border-gray-300"
            } ${idx === 0 ? "mr-3" : ""}`}
            activeOpacity={0.9}
          >
            <Text
              className={`font-semibold text-xl mb-1 ${
                isActive ? "text-[#FD4912]" : "text-gray-900"
              }`}
            >
              {opt.title}
            </Text>
            <Text className="text-gray-600 text-base leading-snug">
              {opt.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
