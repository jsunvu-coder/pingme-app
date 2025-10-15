import { View } from "react-native";
import AnimatedSegmentedTabs from "components/AnimatedSegmentedTabs";
import LoginIcon from "assets/LoginIcon";
import AddUserIcon from "assets/AddUserIcon";

const SignUpIcon = ({ isActive }: { isActive: boolean }) => (
  <AddUserIcon isActive={isActive} />
);

const LogInIcon = ({ isActive }: { isActive: boolean }) => (
  <LoginIcon isActive={isActive} />
);

type Props = {
  activeTab: "signup" | "login";
  onChange: (tab: "signup" | "login") => void;
};

export default function AuthTabs({ activeTab, onChange }: Props) {
  return (
    <View className="mx-6 mb-8">
      <AnimatedSegmentedTabs
        activeKey={activeTab}
        onChange={(key) => onChange(key as "signup" | "login")}
        tabs={[
          { key: "signup", label: "Sign Up", icon: SignUpIcon },
          { key: "login", label: "Log In", icon: LogInIcon },
        ]}
        activeColor="black"
        inactiveColor="#929393"
      />
    </View>
  );
}
