import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "./Home/HomeScreen";
import PingMeScreen from "./Send/PingMe/PingMeScreen";
import AccountScreen from "./Account/AccountScreen";
import HomeIcon from "assets/HomeIcon";
import PingIcon from "assets/PingIcon";
import UserIcon from "assets/UserIcon";

const Tab = createBottomTabNavigator();

export default function MainTab() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarShowLabel: false,
        tabBarStyle: {
          paddingTop: 12,
        },
        animation: 'fade',
        tabBarIcon: ({ focused }) => {
          if (route.name === "Home") {
            return <HomeIcon isActive={focused} />;
          } else if (route.name === "Ping Now") {
            return <PingIcon isActive={focused} />;
          } else if (route.name === "Account") {
            return <UserIcon isActive={focused} />;
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen}/>
      <Tab.Screen name="Ping Now" component={PingMeScreen} />
      <Tab.Screen name="Account" component={AccountScreen}/>
    </Tab.Navigator>
  );
}
