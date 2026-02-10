import { useRoute } from '@react-navigation/native';
import { push, setRootScreen } from 'navigation/Navigation';
import { useEffect } from 'react';
import { Dimensions, Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import usePreventBackFuncAndroid from 'hooks/usePreventBackFuncAndroid';
import { AuthService } from 'business/services/AuthService';
import { SIGNUP_URL } from 'business/Config';
import PrimaryButton from 'components/PrimaryButton';
import OutlineButton from 'components/OutlineButton';
import ArrowUpRightIcon from 'assets/ArrowUpRightIcon';

export type HongBaoErrorParams = {
  isLoggedIn?: boolean;
  invalidBundle?: boolean;
};

const ratio = 375 / 449;
const imageHeight = Dimensions.get('window').width / ratio;
export default function HongBaoErrorScreen() {
  const route = useRoute();
  const { isLoggedIn, invalidBundle } = (route.params as HongBaoErrorParams) || {};

  useEffect(() => {
    if (!isLoggedIn) {
      AuthService.getInstance().logout();
    }
  }, [isLoggedIn]);

  usePreventBackFuncAndroid();

  const handleGoHome = () => {
    setRootScreen(['MainTab']);
  };

  const handleLogin = () => {
    setRootScreen(['AuthScreen']);
  };

  const handleSignUp = () => {
    Linking.openURL(SIGNUP_URL);
  };

  const showSignupButton = !isLoggedIn || invalidBundle;
  return (
    <View className="flex-1 bg-[#F5E9E1]">
      <SafeAreaView edges={['top']} />

      <Image
        source={require('../../assets/HongBaoAni/HongBaoErrorBanner.png')}
        style={{ width: '100%', height: imageHeight }}
        resizeMode="stretch"
      />
      {/* Error Message */}
      <View className="mt-10 px-6">
        <Text className="text-center text-3xl font-bold text-black">
          {invalidBundle
            ? 'Oops! This Hongbao is invalid!'
            : 'Oops! This Hongbao is \n fully claimed or expired!'}
        </Text>
      </View>

      {/* Go Home Button */}
      {showSignupButton ? (
        <View className="mt-4">
          <PrimaryButton title="Log In to PingMe" onPress={handleLogin} className="mx-8 mt-8" />
          {/* TODO: Add sign up flow */}
          <OutlineButton
            title="Sign Up"
            onPress={handleSignUp}
            className="mx-8 mt-6"
            borderColor="#FD4912"
            textColor="#0F0F0F"
            icon={<ArrowUpRightIcon size={32} color={'#0F0F0F'} />}
          />
        </View>
      ) : (
        <View className="mx-auto mt-4">
          <TouchableOpacity onPress={handleGoHome} className="">
            <Text className="text-center text-base text-[#FD4912]">Go to Homepage</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
