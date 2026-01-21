import { Modal, View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import CloseButton from './CloseButton';
import PrimaryButton from './PrimaryButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSendHongBao: () => void;
};

const ratio = 375 / 290

const imageHeight = Dimensions.get('window').width / ratio;

export default function HongBaoPopup({ visible, onClose, onSendHongBao }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}

    >
      <View className="flex-1 bg-[##000000B2] justify-center items-center w-full p-4">
        {/* Close Button */}
        <View className="absolute top-12 right-6 z-10">
          <CloseButton
            onPress={onClose}
            iconColor="white"
            iconSize={32}
          />
        </View>

        {/* Content Container */}
        <View className="bg-[#F5E9E1] rounded-3xl w-full p-10">
          {/* Title */}
          <Text
            style={{
              fontSize: 40,
              color: '#8B3A3A',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Fortune In A Ping. With A Lucky Twist.
          </Text>

          {/* Envelopes Image */}
          <View 
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: imageHeight,
              marginBottom: 16,
            }}>
            <Image
              source={require('assets/HongBaoAni/EnvelopePopup.png')}
              style={{
                width: Dimensions.get('window').width,
                height: imageHeight,
                // position: 'absolute',
              }}
              resizeMode="contain"
            />
          </View>

          {/* Description */}
          <Text className="text-[#0F0F0F] text-center text-base font-bold mb-8 px-2">
            The modern Hongbao: instant, borderless and fun. Share up to 20 Hongbao in one link and let luck decide who gets what.
          </Text>

          {/* CTA Button */}
          <PrimaryButton
            title="Send a Hongbao"
            onPress={() => {
              onClose();
              onSendHongBao();
            }}
            className="shadow-lg"
          />
        </View>
      </View>
    </Modal>
  );
}
