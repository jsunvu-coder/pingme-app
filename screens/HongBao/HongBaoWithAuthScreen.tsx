import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { push } from 'navigation/Navigation';
import PrimaryButton from 'components/PrimaryButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddUserIcon from 'assets/AddUserIcon';
import LoginIcon from 'assets/LoginIcon';
import AuthFormFields from './AuthFormFields';

type HongBaoWithAuthParams = {
  bundle_uuid?: string;
};

const ratio = 375 / 86

const imageHeight = Dimensions.get('window').width / ratio;


const SignUpIcon = ({ isActive }: { isActive: boolean }) => (
  <AddUserIcon isActive={isActive} />
);

const LogInIcon = ({ isActive }: { isActive: boolean }) => (
  <LoginIcon isActive={isActive} />
);

export default function HongBaoWithAuthScreen() {
  const route = useRoute();
  const { bundle_uuid } = (route.params as HongBaoWithAuthParams) || {};

  const [mode, setMode] = useState<'signup' | 'login'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    if (mode === 'signup' && !agreedToTerms) {
      return;
    }

    setLoading(true);

    // Mock signup/login
    setTimeout(() => {
      setLoading(false);
      // Navigate to verification screen with auth data
      push('HongBaoVerificationScreen', {
        bundle_uuid,
        email,
        password,
      });
    }, 1500);
  };

  return (
    <View className="flex flex-1 bg-[#F5E9E1]">
      <SafeAreaView edges={['top']} />
      <Image source={require('../../assets/HongBaoAni/HongBaoWithAuthBanner.png')} style={{ width: '100%', height: imageHeight, marginTop: 16 }} resizeMode='stretch' />
      <Text className="text-center text-2xl mt-4 px-6 font-bold text-[#982C0B]">
        You're one step away from{'\n'}claiming your Hongbao!
      </Text>
      {/* Main Content */}
      <View className=" flex-1 rounded-3xl bg-white p-4 mx-4 mt-4">

        {/* Tabs */}
        <View className="flex-row rounded-full border border-[#E9E9E9] bg-white p-1">
          <TouchableOpacity
            onPress={() => setMode('signup')}
            className={`flex-1 flex-row items-center justify-center rounded-full py-3 ${mode === 'signup' ? 'bg-black' : 'bg-transparent'}`}
          >
            <SignUpIcon isActive={mode === 'signup'} />
            <Text
              className={`ml-1 text-center text-base  ${mode === 'signup' ? 'text-white font-bold' : 'text-gray-500 font-medium'}`}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('login')}
            className={`flex-1 flex-row items-center justify-center rounded-full py-3 ${mode === 'login' ? 'bg-black' : 'bg-transparent'}`}
          >
            <LogInIcon isActive={mode === 'login'} />
            <Text
              className={`ml-1 text-center text-base  ${mode === 'login' ? 'text-white font-bold' : 'text-gray-500 font-medium'}`}
            >
              Log In
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Form */}
          <View className="mt-6">
            <AuthFormFields
              mode={mode}
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              disabled={loading}
            />

            {/* Terms Checkbox (only for signup) */}
            {mode === 'signup' && (
              <TouchableOpacity
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                className="mt-6 flex-row items-center"
              >
                <View
                  className={`mr-3 h-5 w-5 items-center justify-center rounded ${agreedToTerms ? 'bg-[#E85D35]' : 'border border-gray-400 bg-white'}`}
                >
                  {agreedToTerms && <Text className="text-white">✓</Text>}
                </View>
                <Text className="flex-1 text-sm text-gray-700">
                  I confirm that I have read and agreed to{' '}
                  <Text className="text-[#E85D35]">TOS</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

      </View>
      <View className="my-6 px-6">
        <PrimaryButton
          title={mode === 'signup' ? 'Create Account' : 'Log In'}
          onPress={handleCreateAccount}
          loading={loading}
          disabled={mode === 'signup' && !agreedToTerms}
        />
      </View>
      <SafeAreaView edges={['bottom']} />
    </View>
  );
}
