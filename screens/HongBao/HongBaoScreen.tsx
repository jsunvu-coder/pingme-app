import { useIsFocused, useRoute } from '@react-navigation/native';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeaderView from 'components/HeaderView';

export default function HongBaoScreen() {
  const route = useRoute<any>();
  const isFocused = useIsFocused();

  

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View className="z-40 bg-white pb-4">
        <SafeAreaView edges={['top']} />
        <HeaderView title="Ping Now" variant="light" />
      </View>
      <View>
        <Text className="text-2xl font-bold">Hongbao</Text>
      </View>
    </View>
  );
}
