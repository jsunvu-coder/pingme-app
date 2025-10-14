import { Fragment, type ComponentType } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { StackNavigationOptions } from '@react-navigation/stack';

import MainTab from 'screens/MainTab';
import SendPaymentScreen from 'screens/Send/PingMe/PingMeScreen';
import PaymentSuccessScreen from 'screens/Send/SentSuccess/PaymentSuccessScreen';
import RequestPaymentScreen from 'screens/Request/RequestPaymentScreen';
import RequestConfirmScreen from 'screens/Request/RequestConfirmScreen';
import RequestReceiptScreen from 'screens/Request/RequestReceiptScreen';
import SplashScreen from 'screens/SplashScreen';
import OnboardingPager from 'screens/Onboarding/OnboardingPager';
import SendConfirmationScreen from 'screens/Send/SendConfirmation/SendConfirmationScreen';
import ClaimPaymentScreen from 'screens/Claim/ClaimPaymentScreen';
import PaymentLinkCreatedScreen from 'screens/Send/PaymentLinkCreated/PaymentLinkCreatedScreen';
import PingHistoryScreen from 'screens/Home/History/PingHistoryScreen';
import DepositScreen from 'screens/Home/Deposit/DepositScreen';
import QRCodeScreen from 'screens/Pay/QrCode/QRCodeScreen';
import PayQrScreen from 'screens/Pay/QrPayment/PayQrScreen';
import ShareScreen from 'screens/Share/ShareScreen';
import AuthScreen from 'screens/Onboarding/Auth/AuthScreen';
import PasswordRecoveryScreen from 'screens/PasswordRecovery/PasswordRecoveryScreen';

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
    options?: StackNavigationOptions;
  }>;
}> = [
  {
    label: 'Onboarding & Auth',
    screens: [
      { name: 'SplashScreen', component: SplashScreen },
      { name: 'OnboardingPager', component: OnboardingPager },
      { name: 'AuthScreen', component: AuthScreen },
    ],
  },
  {
    label: 'Main App',
    screens: [
      {
        name: 'MainTab',
        component: MainTab,
        options: {
          presentation: 'card',
          animation: 'slide_from_left',
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
      { name: 'RequestPaymentScreen', component: RequestPaymentScreen },
      { name: 'RequestConfirmScreen', component: RequestConfirmScreen },
      {
        name: 'RequestReceiptScreen',
        component: RequestReceiptScreen,
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
      { name: 'PasswordRecoveryScreen', component: PasswordRecoveryScreen },
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
      initialRouteName={ENTRY_SCREEN}
    >
      {SCREEN_GROUPS.map(({ label, screens }) => (
        <Fragment key={label}>
          {screens.map(({ name, component, options }) => (
            <Stack.Screen
              key={name}
              name={name}
              component={component}
              options={options}
            />
          ))}
        </Fragment>
      ))}
    </Stack.Navigator>
  );
};

export default RootNavigator;
