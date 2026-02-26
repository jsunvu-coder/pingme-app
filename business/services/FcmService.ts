import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

export class FcmService {
  private static instance: FcmService;

  static getInstance(): FcmService {
    if (!FcmService.instance) {
      FcmService.instance = new FcmService();
    }
    return FcmService.instance;
  }

  async initAndGetToken(): Promise<string | null> {
    try {
      const apnsToken = await messaging().getAPNSToken();
      console.log('[FCM] APNS TOKEN:', apnsToken);
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('[FCM] Permission not granted');
        return null;
      }

      // iOS: required before getToken when using FCM
      await messaging().registerDeviceForRemoteMessages();

      const token = await messaging().getToken();
      console.log('[FCM] TOKEN:', token);
      return token;
    } catch (error) {
      console.error('[FCM] Failed to init or get token', error);
      return null;
    }
  }

  subscribeForeground(handler: (msg: FirebaseMessagingTypes.RemoteMessage) => void): () => void {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('[FCM] Foreground message:', remoteMessage);
      handler(remoteMessage);
    });
    return unsubscribe;
  }

  subscribeNotificationOpened(
    handler: (msg: FirebaseMessagingTypes.RemoteMessage) => void
  ): () => void {
    const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage) {
        console.log('[FCM] Opened from background:', remoteMessage);
        handler(remoteMessage);
      }
    });

    // Handle case where app was opened from a quit state by tapping a notification
    void messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('[FCM] Opened from quit state:', remoteMessage);
          handler(remoteMessage);
        }
      })
      .catch((error) => {
        console.error('[FCM] getInitialNotification error', error);
      });

    return unsubscribe;
  }
}
