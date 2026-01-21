import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { setRootScreen } from 'navigation/Navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

type HongBaoErrorParams = {
  bundle_uuid?: string;
};


const ratio = 375 / 449
const imageHeight = Dimensions.get('window').width / ratio;
export default function HongBaoErrorScreen() {
  const route = useRoute();
  const { bundle_uuid } = (route.params as HongBaoErrorParams) || {};

  const handleGoHome = () => {
    setRootScreen(['MainTab']);
  };

  return (
    <View className="flex-1 bg-[#F5E9E1]">
      <SafeAreaView edges={['top']} />

      <Image source={require('../../assets/HongBaoAni/HongBaoErrorBanner.png')} style={{ width: '100%', height: imageHeight }} resizeMode='stretch' />
      {/* Error Message */}
      <View className="mt-10 px-6">
        <Text className="text-center text-3xl font-bold text-black">
          Oops! This Hongbao is{'\n'}fully claimed or expired!
        </Text>
      </View>

      {/* Go Home Button */}
      <View className="mx-auto mt-4">
        <TouchableOpacity
          onPress={handleGoHome}
          className=""
        >
          <Text className="text-center text-base text-[#FD4912]">
            Go to Homepage
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
