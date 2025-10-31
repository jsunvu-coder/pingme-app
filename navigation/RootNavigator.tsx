import { Fragment, type ComponentType } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { StackNavigationOptions } from '@react-navigation/stack';
import { goBack } from 'navigation/Navigation';
import BackIcon from 'assets/BackIcon';
import { TouchableOpacity } from 'react-native';

import MainTab from 'screens/MainTab';
import SendPaymentScreen from 'screens/Send/PingMe/PingMeScreen';
import PaymentSuccessScreen from 'screens/Send/SentSuccess/PaymentSuccessScreen';
import RequestConfirmationScreen from 'screens/Request/RequestConfirmationScreen';
import SplashScreen from 'screens/SplashScreen';
import OnboardingPager from 'screens/Onboarding/OnboardingPager';
import SendConfirmationScreen from 'screens/Send/SendConfirmation/SendConfirmationScreen';
import ClaimPaymentScreen from 'screens/Claim/ClaimPaymentScreen';
import PaymentLinkCreatedScreen from 'screens/Send/PaymentLinkCreated/PaymentLinkCreatedScreen';
import PingHistoryScreen from 'screens/Home/History/List/PingHistoryScreen';
import DepositScreen from 'screens/Home/Deposit/DepositScreen';
import QRCodeScreen from 'screens/Pay/QrCode/QRCodeScreen';
import PayQrScreen from 'screens/Pay/QrPayment/PayQrScreen';
import ShareScreen from 'screens/Share/ShareScreen';
import AuthScreen from 'screens/Onboarding/Auth/AuthScreen';
import ChangePasswordScreen from 'screens/Onboarding/Auth/ChangePasswordScreen';
import RequestSuccessScreen from 'screens/Request/RequestSuccess/RequestSuccessScreen';
import AccountRecoveryScreen from 'screens/Recovery/AccountRecoveryScreen';
import ScanRecoveryScreen from 'screens/Recovery/ScanRecoveryScreen';
import RecoveryPasswordScreen from 'screens/Recovery/RecoveryPasswordScreen';
import TransactionDetailsScreen from 'screens/Home/History/Detail/TransactionDetailsScreen';

const Stack = createStackNavigator();

const transparentModalOptions: StackNavigationOptions = {
  presentation: 'transparentModal',
  animation: 'slide_from_bottom',
};

const SCREEN_GROUPS: Array<{
  label: string;
  screens: Array<{
    name: string;
    component: ComponentType<any>;
    options?:
      | StackNavigationOptions
      | ((props: { route: any; navigation: any }) => StackNavigationOptions);
  }>;
}> = [
  {
    label: 'Onboarding & Auth',
    screens: [
      { name: 'SplashScreen', component: SplashScreen },
      {
        name: 'OnboardingPager',
        component: OnboardingPager,
        options: { presentation: 'card', animation: 'fade' },
      },
      {
        name: 'AuthScreen',
        component: AuthScreen,
        options: {
          presentation: 'card',
          animation: 'slide_from_right',
        },
      },
    ],
  },
  {
    label: 'Main App',
    screens: [
      {
        name: 'MainTab',
        component: MainTab,
        options: ({ route }) => {
          const entryAnimation = (route?.params as { entryAnimation?: string } | undefined)
            ?.entryAnimation;

          return {
            presentation: 'card',
            animation:
              entryAnimation === 'slide_from_right' ? 'slide_from_right' : 'slide_from_left',
          };
        },
      },
    ],
  },
  {
    label: 'Payments',
    screens: [
      { name: 'SendPaymentScreen', component: SendPaymentScreen },
      {
        name: 'SendConfirmationScreen',
        component: SendConfirmationScreen,
        options: transparentModalOptions,
      },
      {
        name: 'PaymentSuccessScreen',
        component: PaymentSuccessScreen,
        options: transparentModalOptions,
      },
      {
        name: 'PaymentLinkCreatedScreen',
        component: PaymentLinkCreatedScreen,
        options: transparentModalOptions,
      },
    ],
  },
  {
    label: 'Requests',
    screens: [
      {
        name: 'RequestConfirmationScreen',
        component: RequestConfirmationScreen,
        options: transparentModalOptions,
      },
      {
        name: 'RequestSuccessScreen',
        component: RequestSuccessScreen,
        options: transparentModalOptions,
      },
      { name: 'ClaimPaymentScreen', component: ClaimPaymentScreen },
      {
        name: 'ShareScreen',
        component: ShareScreen,
        options: transparentModalOptions,
      },
    ],
  },
  {
    label: 'Deposits & History',
    screens: [
      { name: 'DepositScreen', component: DepositScreen },
      { name: 'PingHistoryScreen', component: PingHistoryScreen },
      { name: 'TransactionDetailsScreen', component: TransactionDetailsScreen },
    ],
  },
  {
    label: 'QR Payments',
    screens: [
      { name: 'QRCodeScreen', component: QRCodeScreen },
      { name: 'PayQrScreen', component: PayQrScreen },
    ],
  },
  {
    label: 'Settings',
    screens: [
      {
        name: 'AccountRecoveryScreen',
        component: AccountRecoveryScreen,
        options: {
          headerShown: true,
          headerTitle: 'Password Recovery',
          headerStyle: {
            backgroundColor: '#fff',
            borderBottomWidth: 0,
            shadowColor: 'transparent',
            shadowOffset: {
              width: 0,
              height: 0,
            },
            shadowOpacity: 0,
            shadowRadius: 0,
            height: 120,
          },
          headerTitleStyle: {
            color: '#444444',
            fontWeight: '500',
            fontSize: 20,
          },
          headerLeft: () => (
            <TouchableOpacity
              className="items-center justify-center"
              activeOpacity={0.8}
              onPress={() => goBack()}>
              <BackIcon />
            </TouchableOpacity>
          ),
        },
      },
      {
        name: 'ScanRecoveryScreen',
        component: ScanRecoveryScreen,
      },
      {
        name: 'RecoveryPasswordScreen',
        component: RecoveryPasswordScreen,
      },
      {
        name: 'ChangePasswordScreen',
        component: ChangePasswordScreen,
      },
    ],
  },
];

const RootNavigator = () => {
  const ENTRY_SCREEN = 'SplashScreen';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={ENTRY_SCREEN}>
      {SCREEN_GROUPS.map(({ label, screens }) => (
        <Fragment key={label}>
          {screens.map(({ name, component, options }) => (
            <Stack.Screen key={name} name={name} component={component} options={options} />
          ))}
        </Fragment>
      ))}
    </Stack.Navigator>
  );
};

export default RootNavigator;
