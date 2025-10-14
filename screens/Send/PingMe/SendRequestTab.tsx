import { View } from "react-native";
import ArrowUpRightIcon from "assets/ArrowUpRightIcon";
import ArrowDownLeftIcon from "assets/ArrowDownLeftIcon";
import SegmentedTab from "components/SegmentedTab";

type Props = {
  mode: "send" | "request";
  onChange: (mode: "send" | "request") => void;
};

export default function SendRequestTab({ mode, onChange }: Props) {

  return (
    <View
      className="relative flex-row rounded-full border border-[#E9E9E9] bg-white p-1 overflow-hidden mb-6 mt-6"
    >

      <SegmentedTab
        icon={<ArrowUpRightIcon color={mode === "send" ? "white" : "#929393"} />}
        label="Send"
        isActive={mode === "send"}
        onPress={() => onChange("send")}
      />

      <SegmentedTab
        icon={<ArrowDownLeftIcon color={mode === "request" ? "white" : "#929393"} />}
        label="Request"
        isActive={mode === "request"}
        onPress={() => onChange("request")}
      />
    </View>
  );
}
