import { Fragment, type ComponentType } from 'react';
import { Platform , TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import type { StackNavigationOptions } from '@react-navigation/stack';
import { goBack } from 'navigation/Navigation';
import BackIcon from 'assets/BackIcon';

import MainTab from 'screens/MainTab';
import SendPaymentScreen from 'screens/Send/PingMe/PingMeScreen';
import PaymentSuccessScreen from 'screens/Send/SentSuccess/PaymentSuccessScreen';
import ClaimSuccessScreen from 'screens/Claim/ClaimSuccessScreen';
import RequestConfirmationScreen from 'screens/Request/RequestConfirmationScreen';
import SplashScreen from 'screens/SplashScreen';
import OnboardingPager from 'screens/Onboarding/OnboardingPager';
import SendConfirmationScreen from 'screens/Send/SendConfirmation/SendConfirmationScreen';
import ClaimPaymentScreen from 'screens/Claim/ClaimPaymentScreen';
import PaymentLinkCreatedScreen from 'screens/Send/PaymentLinkCreated/PaymentLinkCreatedScreen';
import PingHistoryScreen from 'screens/Home/History/List/PingHistoryScreen';
import DepositScreen from 'screens/Home/Deposit/DepositScreen';
import QRCodeScreen from 'screens/Pay/QrCode/QRCodeScreen';
import PayQrConfirmationScreen from 'screens/Pay/QrPayment/PayQrConfirmationScreen';
import ShareScreen from 'screens/Share/ShareScreen';
import AuthScreen from 'screens/Onboarding/Auth/AuthScreen';
import ChangePasswordScreen from 'screens/Onboarding/Auth/ChangePasswordScreen';
import RequestSuccessScreen from 'screens/Request/RequestSuccess/RequestSuccessScreen';
import AccountRecoveryScreen from 'screens/Recovery/AccountRecoveryScreen';
import ScanRecoveryScreen from 'screens/Recovery/ScanRecoveryScreen';
import RecoveryPasswordScreen from 'screens/Recovery/RecoveryPasswordScreen';
import TransactionDetailsScreen from 'screens/Home/History/Detail/TransactionDetailsScreen';
import WithdrawScreen from 'screens/Withdraw/WithdrawScreen';
import WithdrawSuccessScreen from 'screens/Withdraw/WithdrawSuccessScreen';
import WithdrawConfirmationScreen from 'screens/Withdraw/WithdrawConfirmationScreen';
import HongBaoWithAuthScreen from 'screens/HongBao/HongBaoWithAuthScreen';
import HongBaoVerificationScreen from 'screens/HongBao/HongBaoVerificationScreen';
import HongBaoSuccessScreen from 'screens/HongBao/HongBaoSuccessScreen';
import HongBaoErrorScreen from 'screens/HongBao/HongBaoErrorScreen';

const Stack = createStackNavigator();

const transparentModalOptions: StackNavigationOptions = {
  presentation: 'transparentModal',
  animation: 'slide_from_bottom',
};

const modalOptions = Platform.OS === 'ios' ? transparentModalOptions : undefined;

const SCREEN_GROUPS: {
  label: string;
  screens: {
    name: string;
    component: ComponentType<any>;
    options?:
      | StackNavigationOptions
      | ((props: { route: any; navigation: any }) => StackNavigationOptions);
  }[];
}[] = [
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
        options: {
          ...transparentModalOptions,
          gestureEnabled: false,
        },
      },
      {
        name: 'ClaimSuccessScreen',
        component: ClaimSuccessScreen,
        options: {
          ...transparentModalOptions,
          gestureEnabled: false,
        },
      },
      {
        name: 'PaymentLinkCreatedScreen',
        component: PaymentLinkCreatedScreen,
        options: {
          ...transparentModalOptions,
          gestureEnabled: false,
        },
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
        options: {
          ...transparentModalOptions,
          gestureEnabled: false,
        },
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
    label: 'HongBao',
    screens: [
      { name: 'HongBaoWithAuthScreen', component: HongBaoWithAuthScreen },
      { name: 'HongBaoVerificationScreen', component: HongBaoVerificationScreen },
      {
        name: 'HongBaoSuccessScreen',
        component: HongBaoSuccessScreen,
        options: {
          gestureEnabled: false,
        },
      },
      {
        name: 'HongBaoErrorScreen',
        component: HongBaoErrorScreen,
        options: {
          gestureEnabled: false,
        },
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
      { name: 'PayQrConfirmationScreen', component: PayQrConfirmationScreen },
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
          },
          headerTitleStyle: {
            color: '#444444',
            fontWeight: '600',
            fontSize: 18,
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
      {
        name: 'WithdrawScreen',
        component: WithdrawScreen,
      },
      {
        name: 'WithdrawConfirmationScreen',
        component: WithdrawConfirmationScreen,
        options: modalOptions,
      },
      {
        name: 'WithdrawSuccessScreen',
        component: WithdrawSuccessScreen,
        options:
          Platform.OS === 'ios'
            ? { ...transparentModalOptions, gestureEnabled: false }
            : { gestureEnabled: false },
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
