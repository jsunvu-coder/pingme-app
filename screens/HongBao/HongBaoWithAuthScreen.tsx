import { useRoute } from '@react-navigation/native';
import AddUserIcon from 'assets/AddUserIcon';
import LoginIcon from 'assets/LoginIcon';
import { BundleStatusResponse, RedPocketService } from 'business/services/RedPocketService';
import PrimaryButton from 'components/PrimaryButton';
import usePreventBackFuncAndroid from 'hooks/usePreventBackFuncAndroid';
import { setRootScreen } from 'navigation/Navigation';
import { useRef, useState } from 'react';
import { Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateAccountView, { CreateAccountViewRef } from 'screens/Onboarding/Auth/CreateAccountView';
import LoginView, { LoginViewRef } from 'screens/Onboarding/Auth/LoginView';

type HongBaoWithAuthParams = {
  bundle_uuid?: string;
};

const ratio = 375 / 86;

const imageHeight = Dimensions.get('window').width / ratio;

const SignUpIcon = ({ isActive }: { isActive: boolean }) => <AddUserIcon isActive={isActive} />;

const LogInIcon = ({ isActive }: { isActive: boolean }) => <LoginIcon isActive={isActive} />;

const navigateToHongBaoVerification = (
  bundle_uuid: string,
  mode: 'signup' | 'login',
  message: string
) => {
  setRootScreen([
    {
      name: 'HongBaoVerificationScreen',
      params: {
        bundle_uuid,
        from: mode,
        message: message,
      },
    },
  ]);
};

const navigateToHongBaoError = (isLoggedIn: boolean, invalidBundle?: boolean) => {
  setRootScreen([
    {
      name: 'HongBaoErrorScreen',
      params: { isLoggedIn, invalidBundle },
    },
  ]);
};

export default function HongBaoWithAuthScreen() {
  const route = useRoute();
  const { bundle_uuid } = (route.params as HongBaoWithAuthParams) || {};
  
  usePreventBackFuncAndroid();
  const [mode, setMode] = useState<'signup' | 'login'>('login');
  const [loading, setLoading] = useState(false);
  const loginViewRef = useRef<LoginViewRef>(null);
  const createAccountViewRef = useRef<CreateAccountViewRef>(null);
  const [isSignupFormValid, setIsSignupFormValid] = useState(false);
  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const redPocketService = RedPocketService.getInstance();
      let bundleStatus: BundleStatusResponse;
      try {
        bundleStatus = await redPocketService.getBundleStatus(bundle_uuid || '');
      } catch (error) {
        navigateToHongBaoError(false, true);
        return;
      }
      if (mode === 'signup') {
        if (redPocketService.verifyBundleInfo(bundleStatus)) {
          await createAccountViewRef.current?.register();
        } else {
          navigateToHongBaoError(false);
          return;
        }
      } else {
        await loginViewRef.current?.login();
      }

      navigateToHongBaoVerification(bundle_uuid || '', mode, bundleStatus.message || '');
      return;
    } catch (err) {
      console.error('Error signing in', err);
      return;
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    };
  }

  return (
    <View className="flex flex-1 bg-[#F5E9E1]">
      <SafeAreaView edges={['top']} />
      <Image
        source={require('../../assets/HongBaoAni/HongBaoWithAuthBanner.png')}
        style={{ width: '100%', height: imageHeight, marginTop: 16 }}
        resizeMode="stretch"
      />
      <Text className="mt-4 px-6 text-center text-2xl font-bold text-[#982C0B]">
        You're one step away from{'\n'}claiming your Hongbao!
      </Text>
      {/* Main Content */}
      <View className="mx-4 mt-4 flex-1 rounded-3xl bg-white">
        {/* Tabs */}
        <View className="m-4 flex-row rounded-full border border-[#E9E9E9] bg-white p-1">
          <TouchableOpacity
            onPress={() => setMode('signup')}
            className={`flex-1 flex-row items-center justify-center rounded-full py-3 ${mode === 'signup' ? 'bg-black' : 'bg-transparent'}`}>
            <SignUpIcon isActive={mode === 'signup'} />
            <Text
              className={`ml-2 text-center text-base ${mode === 'signup' ? 'font-bold text-white' : 'font-medium text-gray-500'}`}>
              Sign Up
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('login')}
            className={`flex-1 flex-row items-center justify-center rounded-full py-3 ${mode === 'login' ? 'bg-black' : 'bg-transparent'}`}>
            <LogInIcon isActive={mode === 'login'} />
            <Text
              className={`ml-2 text-center text-base ${mode === 'login' ? 'font-bold text-white' : 'font-medium text-gray-500'}`}>
              Log In
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          bottomOffset={100}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          {mode === 'login' && (
            <LoginView
              ref={loginViewRef}
              removeButtonLogin
              disableSuccessCallback
              altHandleLogin={handleCreateAccount}
            />
          )}
          {mode === 'signup' && (
            <CreateAccountView
              ref={createAccountViewRef}
              removeButtonCreateAccount
              disableSuccessCallback
              setIsFormValid={setIsSignupFormValid}
            />
          )}
        </KeyboardAwareScrollView>
      </View>
      <View className="my-6 px-6">
        <PrimaryButton
          title={mode === 'signup' ? 'Create Account' : 'Log In'}
          onPress={handleCreateAccount}
          loading={loading}
          disabled={loading || (mode === 'signup' && !isSignupFormValid)}
        />
      </View>
      <SafeAreaView edges={['bottom']} />
    </View>
  );
}
