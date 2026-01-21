import { View, Text, TouchableOpacity, Share } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import { hideOverlay, triggerAction, OverlayPayload } from '../../../store/overlaySlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from 'components/PrimaryButton';
import CopyIcon from 'assets/CopyIcon';
import EnvelopeIcon from 'assets/HongBaoAni/EnvelopeIcon';
import * as Clipboard from 'expo-clipboard';
import { showLocalizedAlert } from 'components/LocalizedAlert';

interface HongBaoSuccessOverlayProps {
  payload: OverlayPayload | null;
}

export function HongBaoSuccessOverlay({ payload }: HongBaoSuccessOverlayProps) {
  const dispatch = useDispatch();
  const link = payload?.link || 'https://pingme.app/pay/4f8...';
  const { bottom } = useSafeAreaInsets();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(link);
    await showLocalizedAlert({
      title: 'Success',
      message: 'Link copied to clipboard',
    });
    // You can show a toast notification here
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this HongBao: ${link}`,
        url: link,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSendAnother = () => {
    dispatch(hideOverlay());
    // Trigger action that HongBaoScreen will listen to
    dispatch(triggerAction('hongbao:reset'));
  };

  return (
    <Animated.View
      entering={ZoomIn.springify()}
      exiting={FadeOut}
      style={{backgroundColor: '#651D07', borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', paddingBottom: bottom + 40, paddingTop: 40, paddingHorizontal: 32}}
    >
      {/* Link with copy icon */}
      <View className="flex-row items-center justify-between mb-10">
        <Text 
          className="text-white text-xl font-medium flex-1" 
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {link}
        </Text>
        <TouchableOpacity onPress={handleCopy} className="ml-3">
          <CopyIcon />
        </TouchableOpacity>
      </View>

      {/* Share Now Button */}
      <PrimaryButton title="Share Now" onPress={handleShare} />

      {/* Send Another Hongbao */}
      <TouchableOpacity 
        onPress={handleSendAnother}
        className="flex-row items-center justify-center mt-6"
        activeOpacity={0.7}
      >
        <Text className="text-white/90 text-base mr-2">
          Send Another Hongbao
        </Text>
        <EnvelopeIcon color="#FD6D41" width={20} height={20} />
      </TouchableOpacity>
    </Animated.View>
  );
}
