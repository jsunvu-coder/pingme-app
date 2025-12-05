import { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onRetry?: () => void;
};

function NetworkBannerBase({ visible, onRetry }: Props) {
  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
      }}>
      <View className="bg-amber-500 px-4 py-3 pt-5 shadow-md">
        <SafeAreaView edges={['top']} />
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-white">No internet connection</Text>
            <Text className="mt-1 text-sm text-white/90">Trying to reconnect…</Text>
          </View>
          <TouchableOpacity
            onPress={onRetry}
            className="rounded-full border border-white/60 px-3 py-2 active:opacity-70">
            <Text className="text-sm font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export const NetworkBanner = memo(NetworkBannerBase);
