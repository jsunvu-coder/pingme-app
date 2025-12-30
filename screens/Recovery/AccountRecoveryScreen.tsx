import { View, ActivityIndicator, Text, Alert, Linking } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { SecurityNotice } from './SecurityNotice';
import { InstructionList } from './InstructionList';
import { QRCodeCard } from './QRCodeCard';
import { ActionFooter } from './ActionFooter';
import { SuccessView } from './SuccessView';
import PrimaryButton from 'components/PrimaryButton';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import RecoveryConfirmSheet from './RecoveryConfirmSheet';
import BottomSheet from '@gorhom/bottom-sheet';
import { ContractService } from 'business/services/ContractService';
import { CryptoUtils } from 'business/CryptoUtils';
import { Utils } from 'business/Utils';
import { GLOBALS, GLOBAL_SALT, ZERO_BYTES32 } from 'business/Constants';
import { AuthService } from 'business/services/AuthService';
import NavigationBar from 'components/NavigationBar';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';

export default function AccountRecoveryScreen() {
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recoveryPk, setRecoveryPk] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryCodeStorageKey, setRecoveryCodeStorageKey] = useState<string | null>(null);
  const [photoPermissionGranted, setPhotoPermissionGranted] = useState<boolean | null>(null);
  const qrRef = useRef<any | null>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const ensurePhotoPermission = useCallback(async (): Promise<boolean> => {
    try {
      const current = await MediaLibrary.getPermissionsAsync();
      if (current.granted) {
        setPhotoPermissionGranted(true);
        return true;
      }

      if (!current.canAskAgain) {
        setPhotoPermissionGranted(false);
        return false;
      }

      const requested = await MediaLibrary.requestPermissionsAsync();
      setPhotoPermissionGranted(requested.granted);
      return requested.granted;
    } catch (e) {
      console.warn('Failed to get/request photo permission', e);
      setPhotoPermissionGranted(false);
      return false;
    }
  }, []);

  const promptOpenSettingsForPhotos = useCallback(() => {
    Alert.alert(
      'Photo Library Access Required',
      'Please allow Photo Library access to save your recovery QR code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings().catch((e) => console.warn('Failed to open settings', e));
          },
        },
      ]
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      void ensurePhotoPermission().then((granted) => {
        if (!granted) promptOpenSettingsForPhotos();
      });
    }, [ensurePhotoPermission, promptOpenSettingsForPhotos])
  );

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const contract = ContractService.getInstance();
        const cr = contract.getCrypto();
        if (!cr || !cr.input_data) {
          console.warn('Recovery: crypto state missing. Please sign in first.');
          return;
        }

        const globals = Utils.getSessionObject(GLOBALS);
        const saltHex = globals?.[GLOBAL_SALT];
        if (!saltHex || !CryptoUtils.isHex(saltHex) || saltHex.length !== 66) {
          throw new Error('Missing GLOBAL_SALT');
        }
        const rvCommit = CryptoUtils.recoveryVaultCommitmentFromInputData(cr.input_data, saltHex);

        const storageKeyHash = CryptoUtils.globalHash(rvCommit);
        const storageKey = `recoveryCode:${storageKeyHash ?? rvCommit}`;
        if (isMounted) setRecoveryCodeStorageKey(storageKey);

        const ret = await contract.rvGetRecoveryPk(rvCommit);
        if (!isMounted) return;
        setRecoveryPk(ret?.recoveryPk ?? null);

        // If the app was restarted (e.g., user toggled permissions in Settings),
        // resume showing the recovery code if it was already generated.
        try {
          const storedCode = await SecureStore.getItemAsync(storageKey);
          if (storedCode && isMounted) setRecoveryCode(storedCode);
        } catch (e) {
          console.warn('Failed to load persisted recovery code', e);
        }
      } catch (e: any) {
        console.error('Recovery mount failed', e);
        Alert.alert('Error', e?.message || 'Failed to load recovery status');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetup = async () => {
    try {
      const granted = await ensurePhotoPermission();
      if (!granted) {
        promptOpenSettingsForPhotos();
        return;
      }

      setLoading(true);

      const contract = ContractService.getInstance();
      const auth = AuthService.getInstance();
      const cr = contract.getCrypto();
      if (!cr || !cr.input_data) throw new Error('Missing crypto state');

      // Compute recovery commitment
      const globals = Utils.getSessionObject(GLOBALS);
      const saltHex = globals?.[GLOBAL_SALT];
      if (!saltHex || !CryptoUtils.isHex(saltHex) || saltHex.length !== 66) {
        throw new Error('Missing GLOBAL_SALT');
      }
      const rvCommitment = CryptoUtils.recoveryVaultCommitmentFromInputData(cr.input_data, saltHex);

      // Generate recovery code and derive keys
      const code = CryptoUtils.randomString(50);
      const codeHash = CryptoUtils.globalHash(CryptoUtils.strToHex(code));
      if (!codeHash) throw new Error('Failed to compute code hash');
      const recPriv = await CryptoUtils.hkdf32(
        CryptoUtils.hexToBytes(codeHash),
        new TextEncoder().encode('rv-seed'),
        new TextEncoder().encode('pw-recovery-v1-seed')
      );
      const recPub = CryptoUtils.x25519PublicKey(recPriv);

      const eph = CryptoUtils.x25519Ephemeral();
      const shared = CryptoUtils.x25519Shared(eph.priv, recPub);
      const aesKey = await CryptoUtils.hkdf32(
        shared,
        CryptoUtils.hexToBytes(saltHex),
        new TextEncoder().encode('pw-recovery-v1')
      );

      // Extract current password from input_data
      const inputStr = CryptoUtils.hexToStr(cr.input_data);
      const idx = inputStr.indexOf(':');
      const password = idx >= 0 ? inputStr.slice(idx + 1) : '';

      const padded = CryptoUtils.padTo32(new TextEncoder().encode(password));
      const { ct, tag, nonce } = await CryptoUtils.aesGcmEncrypt256(aesKey, padded);

      const recoveryPkHex = CryptoUtils.bytesToHex(recPub);
      const ctKemHex = CryptoUtils.bytesToHex(eph.pub);
      const ctHex = CryptoUtils.bytesToHex(ct);
      const tagHex = CryptoUtils.bytesToHex(tag);
      const nonceHex = CryptoUtils.bytesToHex(nonce);

      const rvCommitmentHash = CryptoUtils.globalHash(rvCommitment);
      if (!rvCommitmentHash) throw new Error('Failed to compute rv commitment hash');

      const recoveryPkHash = CryptoUtils.globalHash(recoveryPkHex);
      if (!recoveryPkHash) throw new Error('Failed to compute recovery pk hash');

      await auth.rvCommitProtect(
        () => contract.rvInitialize(rvCommitment, recoveryPkHex, ctKemHex, ctHex, tagHex, nonceHex),
        rvCommitmentHash,
        recoveryPkHash
      );

      if (recoveryCodeStorageKey) {
        try {
          await SecureStore.setItemAsync(recoveryCodeStorageKey, code);
        } catch (e) {
          console.warn('Failed to persist recovery code', e);
        }
      }

      setRecoveryPk(recoveryPkHex);
      setRecoveryCode(code);
    } catch (e: any) {
      console.error('Recovery initialize failed', e);
      Alert.alert('Error', e?.message || 'Failed to setup recovery');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Export QR as base64 PNG then save to Photos
    qrRef.current?.toDataURL(async (data: string) => {
      try {
        const granted = await ensurePhotoPermission();
        if (!granted) {
          promptOpenSettingsForPhotos();
          return;
        }

        const fileUri = FileSystem.cacheDirectory + 'recovery-qr.png';
        const base64 = data?.startsWith('data:image') ? data.split(',')[1] : data;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
        await MediaLibrary.saveToLibraryAsync(fileUri);
        Alert.alert('Success', 'QR image saved to Photos');
      } catch (e: any) {
        console.warn('Failed to save QR image', e);
        Alert.alert('Error', e?.message || 'Failed to save QR image');
      }
    });
  };

  const handleContinue = () => {
    sheetRef.current?.expand();
  };

  const handleConfirmHide = () => {
    (async () => {
      try {
        if (recoveryCodeStorageKey) {
          await SecureStore.deleteItemAsync(recoveryCodeStorageKey);
        }
      } catch (e) {
        console.warn('Failed to clear persisted recovery code', e);
      } finally {
        setRecoveryCode(null);
        setIsCompleted(true);
        sheetRef.current?.close();
      }
    })();
  };

  if (isCompleted) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 p-4">
          <SuccessView />
        </View>
      </View>
    );
  }

  if (loading || recoveryPk == null) {
    return (
      <View className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </View>
    );
  }

  if (recoveryPk === ZERO_BYTES32) {
    return (
      <View className="flex-1 bg-black">
        <View className="flex-1 gap-6 px-6 py-8">
          <View className="items-center">
            <Text className="mt-8 text-center text-2xl font-semibold text-white">
              Set up your account recovery now
            </Text>
            <Text className="mt-2 text-center text-base text-[#CCCCCC]">
              Create a one-time recovery credential to recover your password later.
            </Text>
          </View>

          <View className="items-center">
            <PrimaryButton
              className="w-[240px]"
              title="Setup Recovery"
              onPress={handleSetup}
              loading={loading}
            />
            {photoPermissionGranted === false && (
              <Text className="mt-3 text-center text-xs text-[#CCCCCC]">
                Enable Photo Library access to save your recovery QR code.
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (recoveryCode) {
    return (
      <View className="flex-1 bg-black">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-between px-6 py-8">
            <View>
              <SecurityNotice />
              <InstructionList />
              <QRCodeCard value={recoveryCode} getRef={(r) => (qrRef.current = r)} />
            </View>

            <View className="mt-6">
              <ActionFooter onDownload={handleDownload} onContinue={handleContinue} />
            </View>
          </View>
        </ScrollView>
        <RecoveryConfirmSheet ref={sheetRef} onConfirm={handleConfirmHide} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center px-6 py-8">
        <Text className="text-center text-lg font-semibold text-white">
          Recovery credential already exists
        </Text>
        <Text className="mt-2 text-center text-sm text-[#CCCCCC]">
          A recovery key is already set for this account. The recovery code is only shown once at
          the time of setup and cannot be displayed again.
        </Text>
      </View>
    </View>
  );
}
