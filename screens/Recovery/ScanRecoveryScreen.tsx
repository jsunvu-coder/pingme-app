import { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRScanner from 'screens/Pay/QrCode/QrScanner';
import UploadPhotoButton from 'screens/Pay/QrCode/UploadPhotoButton';
import NavigationBar from 'components/NavigationBar';
import { push } from 'navigation/Navigation';
import { CryptoUtils } from 'business/CryptoUtils';
import { ContractService } from 'business/services/ContractService';
import { Utils } from 'business/Utils';
import { GLOBAL_SALT, GLOBALS } from 'business/Constants';
import { showFlashMessage } from 'utils/flashMessage';

// 🔒 your crypto + utils imports

export default function ScanRecoveryScreen() {
  const [loading, setLoading] = useState(false);

  const handleScanSuccess = async (data: string, releaseScanLock: () => void) => {
    // data = long QR string (recovery code)
    setLoading(true);
    try {
      const recoveredPassword = await recoverPassword(data);
      console.log('Recovered password:', recoveredPassword);
      if (recoveredPassword) {
        push('RecoveryPasswordScreen', { password: recoveredPassword });
      } else {
        showFlashMessage({
          title: 'Recovery failed',
          message: 'Could not decrypt the password.',
          type: 'danger',
          onHide: releaseScanLock,
        });
      }
    } catch (err: any) {
      console.error('RECOVER_FAILED', err);
      showFlashMessage({
        title: 'Error',
        message: err?.message || 'Password recovery failed.',
        type: 'danger',
        onHide: releaseScanLock,
      });
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Recovery logic as async func
  // -----------------------------
  async function recoverPassword(recoveryCode: string): Promise<string | null> {
    console.log('[Recovery] Start password recovery');
    try {
      // 1️⃣ Derive private key
      console.log('[Recovery] Step 1: Deriving private key from recovery code');

      const recoveryCodeHex = CryptoUtils.strToHex(recoveryCode);
      console.log('[Recovery] recoveryCodeHex length:', recoveryCodeHex.length);

      const hashInput = CryptoUtils.globalHash(recoveryCodeHex);
      if (!hashInput) {
        console.error('[Recovery] Failed to hash recovery code');
        throw new Error('Failed to hash recovery code.');
      }

      console.log('[Recovery] Generated hash input:', hashInput.slice(0, 16) + '...');

      const codeHash = CryptoUtils.hexToBytes(hashInput);
      console.log('[Recovery] codeHash bytes length:', codeHash.length);

      const recPriv = await CryptoUtils.hkdf32(
        codeHash,
        new TextEncoder().encode('rv-seed'),
        new TextEncoder().encode('pw-recovery-v1-seed')
      );
      console.log('[Recovery] Derived recPriv length:', recPriv.length);

      const recoveryPkHex = CryptoUtils.bytesToHex(CryptoUtils.x25519PublicKey(recPriv));
      console.log('[Recovery] recoveryPkHex:', recoveryPkHex);

      // 2️⃣ Fetch vault record
      console.log('[Recovery] Step 2: Fetching vault record by recovery public key');
      const ret = await ContractService.getInstance().rvGetVaultRecordByRecoveryPk(recoveryPkHex);

      if (!ret) {
        console.error('[Recovery] Vault record not found');
        throw new Error('Vault record not found.');
      }

      console.log('[Recovery] Vault record retrieved successfully');
      console.log('[Recovery] ct_kem length:', ret.ct_kem?.length);
      console.log('[Recovery] ct length:', ret.ct?.length);
      console.log('[Recovery] tag length:', ret.tag?.length);
      console.log('[Recovery] nonce length:', ret.nonce?.length);

      // 3️⃣ Decode fields
      console.log('[Recovery] Step 3: Decoding ciphertext fields');
      const ct_kem = CryptoUtils.hexToBytes(ret.ct_kem);
      const ct = CryptoUtils.hexToBytes(ret.ct);
      const tag = CryptoUtils.hexToBytes(ret.tag);
      const nonce = CryptoUtils.hexToBytes(ret.nonce);
      console.log('[Recovery] Decoded ciphertext field lengths →', {
        ct_kem: ct_kem.length,
        ct: ct.length,
        tag: tag.length,
        nonce: nonce.length,
      });

      // 4️⃣ Derive AES key
      console.log('[Recovery] Step 4: Deriving AES key via X25519 + HKDF');
      const shared = CryptoUtils.x25519Shared(recPriv, ct_kem);
      console.log('[Recovery] Shared secret length:', shared.length);

      const salt = Utils.getSessionObject(GLOBALS)[GLOBAL_SALT];
      console.log('[Recovery] Using global salt:', salt);

      const aesKey = await CryptoUtils.hkdf32(
        shared,
        CryptoUtils.hexToBytes(salt),
        new TextEncoder().encode('pw-recovery-v1')
      );
      console.log('[Recovery] AES key derived (length:', aesKey.length, ')');

      // 5️⃣ Decrypt
      console.log('[Recovery] Step 5: Decrypting ciphertext');
      const ptPadded = await CryptoUtils.aesGcmDecrypt256(aesKey, ct, tag, nonce);
      console.log('[Recovery] Decrypted padded plaintext length:', ptPadded.length);

      if (ptPadded.length !== 32) {
        console.error('[Recovery] Invalid plaintext length, expected 32 bytes');
        throw new Error('Decryption failed (unexpected length).');
      }

      const pt = CryptoUtils.unpad32(ptPadded);
      const recoveredPassword = new TextDecoder().decode(pt);
      console.log('[Recovery] ✅ Password successfully recovered:', recoveredPassword);

      console.log('[Recovery] Finished password recovery successfully');
      return recoveredPassword;
    } catch (err) {
      console.error('[Recovery] ❌ RECOVER_LOGIC_FAILED', err);
      return null;
    }
  }

  return (
    <View className="flex-1 bg-white">
      <NavigationBar title="Scan recovery QR code" />

      <View className="flex-1">
        <View className="m-6 flex-row items-center rounded-2xl bg-[#00B050] px-4 py-3">
          <Ionicons name="information-circle" size={18} color="white" />
          <Text className="text-md ml-2 flex-1 text-white">
            Scan your recovery password QR code to reveal your current password.
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FD4912" />
            <Text className="mt-3 text-[#1D1D1D]">Recovering password...</Text>
          </View>
        ) : (
          <>
            <View className="flex-1 overflow-hidden">
              <QRScanner onScanSuccess={handleScanSuccess} />
            </View>

            <View className="mt-6 mb-24 items-center">
              <UploadPhotoButton onScanSuccess={handleScanSuccess} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
