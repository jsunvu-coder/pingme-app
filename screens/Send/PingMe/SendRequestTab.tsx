import { View } from "react-native";
import AnimatedSegmentedTabs from "components/AnimatedSegmentedTabs";
import ArrowUpRightIcon from "assets/ArrowUpRightIcon";
import ArrowDownLeftIcon from "assets/ArrowDownLeftIcon";

const SendIcon = ({ isActive }: { isActive: boolean }) => (
  <ArrowUpRightIcon size={32} color={isActive ? "white" : "#929393"} />
);

const RequestIcon = ({ isActive }: { isActive: boolean }) => (
  <ArrowDownLeftIcon size={32} color={isActive ? "white" : "#929393"} />
);

type Props = {
  mode: "send" | "request";
  onChange: (mode: "send" | "request") => void;
  sendContent?: React.ReactNode;
  requestContent?: React.ReactNode;
};

export default function SendRequestTab({
  mode,
  onChange,
  sendContent,
  requestContent,
}: Props) {
  return (
    <View>
      <AnimatedSegmentedTabs
        activeKey={mode}
        onChange={(key) => onChange(key as "send" | "request")}
        tabs={[
          { key: "send", label: "Send", icon: SendIcon },
          { key: "request", label: "Request", icon: RequestIcon },
        ]}
      >
        {mode === "send" ? sendContent : requestContent}
      </AnimatedSegmentedTabs>
    </View>
  );
}
