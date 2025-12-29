import { View, Text, Alert, Linking, Platform } from 'react-native';
import IconButton from 'components/IconButton';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import XTwitterIcon from 'assets/XTwitterIcon';
import { useCallback, useMemo, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import { APP_URL } from 'business/Config';
import { Asset } from 'expo-asset';
import RNShare from 'react-native-share';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { t } from 'i18n';
import { showFlashMessage } from 'utils/flashMessage';

type ShareParams = {
  amount?: number;
  duration?: number;
  mode?: 'claimed' | 'sent' | 'request';
  amountUsdStr?: string;
  from?: 'login' | 'signup';
  action?: 'send' | 'claim' | 'request' | 'link';
  linkType?: 'payment' | 'request';
};

export default function ShareSection() {
  const route = useRoute();
  const { amount = 100, duration = 2, mode, amountUsdStr, action, linkType } =
    (route.params as ShareParams) || {};

  const formattedAmount = useMemo(() => amountUsdStr ?? amount.toFixed(2), [amount, amountUsdStr]);
  const shareAction: NonNullable<ShareParams['action']> = useMemo(() => {
    if (action) return action;
    if (mode === 'claimed') return 'claim';
    if (mode === 'request') return 'request';
    return 'send';
  }, [action, mode]);

  const shareText = useMemo(() => {
    const durationText = duration ? `${duration} sec` : 'seconds';
    if (shareAction === 'claim') {
      return `Just claimed $${formattedAmount} in ${durationText} with @PingMe! #JustPinged`;
    }
    if (shareAction === 'request') {
      return `Requesting $${formattedAmount} with @PingMe. Pay me fast.`;
    }
    if (shareAction === 'link') {
      const linkLabel = linkType === 'request' ? 'payment request' : 'payment';
      return `Here is my ${linkLabel} link on @PingMe for $${formattedAmount}. Quick and secure.`;
    }
    return `Just sent $${formattedAmount} in ${durationText} with @PingMe! #JustPinged`;
  }, [duration, formattedAmount, linkType, shareAction]);

  const shareContent = useMemo(() => `${shareText}\n${APP_URL}`, [shareText]);

  const normalizeFileUri = useCallback((uri: string | null | undefined) => {
    if (!uri) return null;
    if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
    if (uri.startsWith('asset:')) return null;
    if (uri.startsWith('/')) return `file://${uri}`;
    return uri;
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
        title: 'Share More',
        message: shareContent,
        url: imageUri ?? undefined,
        failOnCancel: false,
      });
      return true;
    } catch (err: any) {
      if (err?.message?.includes('User did not share')) return false;
      console.error('System share error:', err);

      if (Platform.OS === 'android' && imageUri) {
        try {
          await RNShare.open({
            title: 'Share More',
            message: shareContent,
            failOnCancel: false,
          });
          return true;
        } catch (err2: any) {
          if (err2?.message?.includes('User did not share')) return false;
          console.error('System share retry (no url) error:', err2);
        }
      }

      Alert.alert('Share', 'Unable to open share options.');
      return false;
    }
  }, [getShareImageUri, shareContent]);

  const openInstagramWebFallback = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(shareContent);
      showFlashMessage({
        title: t('NOTICE', undefined, 'Notice'),
        message: t(
          'INSTAGRAM_WEB_FALLBACK',
          undefined,
          'Instagram is not installed. Share text copied — paste it in Instagram.'
        ),
        type: 'info',
      });
    } catch (err) {
      console.warn('Failed to copy share content to clipboard:', err);
    }

    try {
      await WebBrowser.openBrowserAsync('https://www.instagram.com/');
    } catch (err) {
      console.error('Open Instagram web failed:', err);
      await handleSystemShare();
    }
  }, [handleSystemShare, shareContent]);

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
    const confirmOpenX = () =>
      new Promise<boolean>((resolve) => {
        Alert.alert(t('OPEN_X_TITLE', undefined, 'Open X'), t('OPEN_X_MESSAGE', undefined, 'Open X to share?'), [
          { text: t('CANCEL', undefined, 'Cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('OPEN', undefined, 'Open'), onPress: () => resolve(true) },
        ]);
      });

    const proceed = await confirmOpenX();
    if (!proceed) return;

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
    const imageUri = await getShareImageUri();
    if (!imageUri) return;

    try {
      const encodedMessage = encodeURIComponent(shareText);
      const storyLink = `${APP_URL}?msg=${encodedMessage}`;

      if (Platform.OS === 'android') {
        const installed = await RNShare.isPackageInstalled('com.instagram.android');
        if (!installed?.isInstalled) {
          await openInstagramWebFallback();
          return;
        }

        await RNShare.shareSingle({
          social: RNShare.Social.INSTAGRAM_STORIES,
          backgroundImage: imageUri,
          attributionURL: storyLink,
        });
        return;
      }

      // iOS: Convert to base64 for Instagram Story
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await RNShare.shareSingle({
        social: RNShare.Social.INSTAGRAM_STORIES,
        backgroundImage: `data:image/png;base64,${base64}`,
        attributionURL: storyLink,
        appId: 'YOUR_FACEBOOK_APP_ID', // required on iOS
      });
    } catch (err) {
      console.error('Instagram Story error:', err);
      const maybeMessage = (err as any)?.message?.toString?.() ?? '';
      if (maybeMessage.toLowerCase().includes('not installed')) {
        await openInstagramWebFallback();
        return;
      }

      Alert.alert('Share', 'Unable to share on Instagram Story.');
    }
  }, [getShareImageUri, openInstagramWebFallback, shareText]);

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
