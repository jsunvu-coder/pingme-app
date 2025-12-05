import { View, Text, Alert, Linking } from 'react-native';
import IconButton from 'components/IconButton';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import XTwitterIcon from 'assets/XTwitterIcon';
import { useCallback, useMemo, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import { APP_URL } from 'business/Config';
import { Asset } from 'expo-asset';
import RNShare from 'react-native-share';
import * as FileSystem from 'expo-file-system/legacy';

type ShareParams = {
  amount?: number;
  duration?: number;
  mode?: 'claimed' | 'sent';
  amountUsdStr?: string;
  from?: 'login' | 'signup';
};

export default function ShareSection() {
  const route = useRoute();
  const { amount = 100, duration = 2, mode, amountUsdStr } = (route.params as ShareParams) || {};

  const formattedAmount = useMemo(() => amountUsdStr ?? amount.toFixed(2), [amount, amountUsdStr]);

  const shareText = useMemo(() => {
    const action = mode === 'claimed' ? 'claimed' : 'sent';
    const durationText = duration ? `${duration} sec` : 'seconds';
    return `Just ${action} $${formattedAmount} in ${durationText} with @PingMe! #JustPinged`;
  }, [formattedAmount, mode, duration]);

  const shareContent = useMemo(() => `${shareText}\n${APP_URL}`, [shareText]);

  const normalizeFileUri = useCallback((uri: string | null | undefined) => {
    if (!uri) return null;
    return uri.startsWith('file://') ? uri : `file://${uri}`;
  }, []);

  const adImageAsset = useRef<Asset | null>(null);
  const loadFallbackAdImage = useCallback(async () => {
    try {
      const asset = Asset.fromModule(require('assets/share_card.png'));
      adImageAsset.current = asset;
      if (!asset.localUri) {
        await asset.downloadAsync();
      }
      return normalizeFileUri(asset.localUri ?? asset.uri);
    } catch (err) {
      console.error('Failed to load fallback share image:', err);
      return null;
    }
  }, [normalizeFileUri]);

  const getShareImageUri = useCallback(async () => {
    const fallback = await loadFallbackAdImage();
    if (!fallback) {
      Alert.alert('Share', 'Unable to prepare image for sharing. Please try again.');
    }
    return fallback;
  }, [loadFallbackAdImage]);

  // -------------------------------------------------------------
  // System Share
  // -------------------------------------------------------------
  const handleSystemShare = useCallback(async () => {
    const imageUri = await getShareImageUri();
    try {
      await RNShare.open({
        message: shareContent,
        url: imageUri ?? APP_URL,
        failOnCancel: false,
      });
      return true;
    } catch (err: any) {
      if (err?.message?.includes('User did not share')) return false;
      console.error('System share error:', err);
      return false;
    }
  }, [getShareImageUri, shareContent]);

  const shareViaSocial = useCallback(
    async (social: RNShare.Social, extra?: RNShare.Options) => {
      const imageUri = await getShareImageUri();
      try {
        await RNShare.shareSingle({
          social,
          message: shareText,
          url: imageUri ?? APP_URL,
          failOnCancel: false,
          ...extra,
        });
        return 'shared';
      } catch (err: any) {
        if (err?.message?.includes('User did not share')) return 'cancel';
        if (err?.message?.includes('not installed')) return 'unavailable';

        console.error(`Share error (${social}):`, err);
        return 'error';
      }
    },
    [getShareImageUri, shareText]
  );

  const handleFacebookShare = useCallback(async () => {
    const result = await shareViaSocial(RNShare.Social.FACEBOOK);
    if (result === 'shared' || result === 'cancel') return;
    await handleSystemShare();
  }, [shareViaSocial, handleSystemShare]);

  const handleTwitterShare = useCallback(async () => {
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(APP_URL);

    const xAppUrl = `twitter://post?message=${encodedText}`;
    const xAndroidUrl = `x-com.twitter.android://post?message=${encodedText}`;
    const webUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;

    const tryOpen = async (url: string) => {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const opened =
      (await tryOpen(xAppUrl)) || (await tryOpen(xAndroidUrl)) || (await tryOpen(webUrl));

    if (!opened) await handleSystemShare();
  }, [shareText, handleSystemShare]);

  const handleInstagramShare = useCallback(async () => {
    try {
      // Load share image
      const asset = Asset.fromModule(require('assets/share_card.png'));
      await asset.downloadAsync();
      const fileUri = asset.localUri ?? asset.uri;
      if (!fileUri) {
        Alert.alert('Error', 'Unable to load image for Instagram.');
        return;
      }

      // Convert to base64 for Instagram Story
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Build attribution URL with message (Option 2)
      const encodedMessage = encodeURIComponent(shareText);
      const storyLink = `${APP_URL}?msg=${encodedMessage}`;

      // Share to Instagram Story
      await RNShare.shareSingle({
        social: RNShare.Social.INSTAGRAM_STORIES,
        backgroundImage: `data:image/png;base64,${base64}`,
        attributionURL: storyLink,
        appId: 'YOUR_FACEBOOK_APP_ID', // required on iOS
      });
    } catch (err) {
      console.error('Instagram Story error:', err);
      Alert.alert('Share', 'Unable to share on Instagram Story.');
    }
  }, [shareText]);

  return (
    <View className="mt-10">
      <Text className="mb-4 ml-4 text-lg text-gray-600">Share On</Text>

      <View className="flex-row justify-between px-4">
        <IconButton
          label="Facebook"
          icon={<FontAwesome5 name="facebook-f" size={36} color="white" />}
          onPress={handleFacebookShare}
        />
        <IconButton label="Twitter" icon={<XTwitterIcon />} onPress={handleTwitterShare} />
        <IconButton
          label="Insta"
          icon={<FontAwesome5 name="instagram" size={42} color="white" />}
          onPress={handleInstagramShare}
        />
        <IconButton
          label="More"
          icon={<Ionicons name="add-circle-outline" size={42} color="white" />}
          onPress={handleSystemShare}
        />
      </View>
    </View>
  );
}
