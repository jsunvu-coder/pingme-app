import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import { push } from 'navigation/Navigation';
import PrimaryButton from 'components/PrimaryButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddUserIcon from 'assets/AddUserIcon';
import LoginIcon from 'assets/LoginIcon';
import AuthFormFields from './AuthFormFields';
import { RedPocketService } from 'business/services/RedPocketService';
import LoginView, { LoginViewRef } from 'screens/Onboarding/Auth/LoginView';
import { AuthService } from 'business/services/AuthService';
import CreateAccountView, { CreateAccountViewRef } from 'screens/Onboarding/Auth/CreateAccountView';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type HongBaoWithAuthParams = {
  bundle_uuid?: string;
};

const ratio = 375 / 86;

const imageHeight = Dimensions.get('window').width / ratio;

const SignUpIcon = ({ isActive }: { isActive: boolean }) => <AddUserIcon isActive={isActive} />;

const LogInIcon = ({ isActive }: { isActive: boolean }) => <LoginIcon isActive={isActive} />;

export default function HongBaoWithAuthScreen() {
  const route = useRoute();
  const { bundle_uuid } = (route.params as HongBaoWithAuthParams) || {};

  const [mode, setMode] = useState<'signup' | 'login'>('login');
  const [loading, setLoading] = useState(false);
  const loginViewRef = useRef<LoginViewRef>(null);
  const createAccountViewRef = useRef<CreateAccountViewRef>(null);
  const [isSignupFormValid, setIsSignupFormValid] = useState(false);
  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      if (mode === 'signup') {
        await createAccountViewRef.current?.register();
      } else {
        await loginViewRef.current?.login();
      }
      push('HongBaoVerificationScreen', {
        bundle_uuid,
        verified: true,
      });
    } catch (err) {
      console.error('Error signing in', err);
    } finally {
      setLoading(false);
    }
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

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
        <View className="flex-row rounded-full border border-[#E9E9E9] bg-white p-1 m-4">
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
          {mode === 'login' && <LoginView ref={loginViewRef} removeButtonLogin={true} disableSuccessCallback={true} />}
          {mode === 'signup' && <CreateAccountView ref={createAccountViewRef} removeButtonCreateAccount={true} disableSuccessCallback={true} setIsFormValid={setIsSignupFormValid} />}
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
