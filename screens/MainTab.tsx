import { useEffect } from 'react';
import { BottomTabBarProps, BottomTabNavigationProp, createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from './Home/HomeScreen';
import PingMeScreen from './Send/PingMe/PingMeScreen';
import AccountScreen from './Account/AccountScreen';
import AirdropScreen from './Airdrop/AirdropScreen';
import HomeIcon from 'assets/HomeIcon';
import PingIcon from 'assets/PingIcon';
import UserIcon from 'assets/UserIcon';
import { shareFlowService } from 'business/services/ShareFlowService';
import { push } from 'navigation/Navigation';
import AirdropIcon from 'assets/AirdropIcon';
import HongBaoIcon from 'assets/HongBaoIcon';
import HongBaoScreen from './HongBao/HongBaoScreen';
import { RootState } from 'store';
import { useSelector } from 'react-redux';
import { RouteProp } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';

const Tab = createBottomTabNavigator();

export default function MainTab() {
  const preventTouch = useSelector((state: RootState) => state.mainTab.preventTouch);
  
  useEffect(() => {
    let claimTimer: ReturnType<typeof setTimeout> | null = null;
    let shareTimer: ReturnType<typeof setTimeout> | null = null;

    const timer = setTimeout(() => {
      const pending = shareFlowService.consumePendingClaim();
      if (pending) {
        // Wait ~1s on MainTab before showing ClaimSuccessScreen, then show ShareScreen 2s later.
        claimTimer = setTimeout(() => {
          push('ClaimSuccessScreen', {
            amountUsdStr: pending.amountUsdStr,
            from: pending.from,
            disableAutoShare: true,
            tokenName: pending.tokenName,
          });
        }, 1000);

        // shareTimer = setTimeout(() => {
        //   push('ShareScreen', {
        //     mode: 'claimed',
        //     amountUsdStr: pending.amountUsdStr,
        //     from: pending.from,
        //     action: 'claim',
        //   });
        // }, 3000);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      if (claimTimer) clearTimeout(claimTimer);
      if (shareTimer) clearTimeout(shareTimer);
    };
  }, []);

  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarShowLabel: false,
        tabBarStyle: {
          paddingTop: 6,
        },
        animation: 'none',
        tabBarButton(props) {
          return <TouchableOpacity disabled={preventTouch} onPress={props.onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 50 }}>{props.children}</TouchableOpacity>
        },
        tabBarIcon: ({ focused }) => {
          if (route.name === 'Ping Now') {
            return <PingIcon isActive={focused} />;
          } else if (route.name === 'Airdrop') {
            return <AirdropIcon isActive={focused} />;
          } else if (route.name === 'Account') {
            return <UserIcon isActive={focused} />;
          } else if (route.name === 'HongBao') {
            return <HongBaoIcon isActive={focused} />;
          } else {
            return <HomeIcon isActive={focused} />;
          }
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Ping Now" component={PingMeScreen} />
      <Tab.Screen name="HongBao" component={HongBaoScreen} />
      <Tab.Screen name="Airdrop" component={AirdropScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
