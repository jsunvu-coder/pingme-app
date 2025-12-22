import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SafeBottomView() {
  return <>{Platform.OS === 'android' && <SafeAreaView edges={['bottom']} />}</>;
}
