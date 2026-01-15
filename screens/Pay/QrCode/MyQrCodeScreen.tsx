import { useEffect, useState } from 'react';
import { View, Dimensions, Alert, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { APP_URL } from 'business/Config';
import { ContractService } from 'business/services/ContractService';
import { t } from 'i18n';
import { Utils } from 'business/Utils';
import { GLOBALS, MIN_AMOUNT } from 'business/Constants';

type Props = {
  amount?: string;
  token?: string;
};

export default function MyQRCodeView({ amount = '', token }: Props) {
  const { width } = Dimensions.get('window');

  const [qrValue, setQrValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const confirm = async (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(t('NOTICE'), t(message), [{ text: t('OK'), onPress: () => resolve(true) }]);
    });
  };

  const createQr = async () => {
    try {
      setLoading(true);
      const contractService = ContractService.getInstance();
      const cr = contractService.getCrypto();

      if (!cr?.commitment) {
        console.warn('⚠️ No commitment found in crypto context');
        return;
      }

      let params = `?commitment=${cr.commitment}`;

      // ✅ Handle amount validation (if provided)
      if (amount) {
        const k_min_amount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
        const tokenDecimals = Utils.getTokenDecimals(token);
        const k_amount = Utils.toMicro(amount, tokenDecimals);

        if (k_amount < k_min_amount) {
          await confirm('_ALERT_BELOW_MINIMUM');
          return;
        } else {
          params += `&amount=${k_amount}`;
        }
      }

      // ✅ Handle token (if provided)
      if (token) {
        params += `&token=${token}`;
      }

      // ✅ Build QR URL
      const qrData = `${APP_URL}/deposit${params}`;
      const encoded = encodeURIComponent(qrData);
      setQrValue(encoded);
      console.log('✅ Generated deposit QR:', qrData);
    } catch (err) {
      console.error('❌ Failed to create QR:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate QR automatically on mount
  useEffect(() => {
    createQr();
  }, [amount, token]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <View className="flex-[0.5]" />
      {qrValue ? (
        <QRCode
          value={decodeURIComponent(qrValue)} // show actual readable link
          backgroundColor="white"
          size={width - 120}
          color="black"
          ecl="M"
        />
      ) : (
        !loading && (
          <View className="items-center justify-center">
            <Text>t('GENERATING_QR')</Text>
          </View>
        )
      )}
      <View className="flex-1" />
    </View>
  );
}
