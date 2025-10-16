import { useMemo, forwardRef } from 'react';
import { View, Text } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import CloseButton from 'components/CloseButton';
import WarningIcon from 'assets/WarningIcon';
import SecondaryButton from 'components/ScondaryButton';

type RecoveryConfirmSheetProps = {
  onConfirm: () => void;
};

const RecoveryConfirmSheet = forwardRef<BottomSheet, RecoveryConfirmSheetProps>(
  ({ onConfirm }, ref) => {
    const snapPoints = useMemo(() => ['70%'], []);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        handleComponent={() => null}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <BottomSheetView>
          <View className="px-6 py-4">
            <CloseButton
              className="flex-row justify-end"
              onPress={() => (ref as any)?.current?.close()}
            />

            <View className="mb-6">
              <View className="mt-2 items-center">
                <WarningIcon color="#FFD952" width={56} height={56} />
              </View>

              <Text className="mt-4 text-center text-[22px] font-medium text-[#0F0F0F]">
                Confirm Recovery Key Saved
              </Text>
            </View>

            <View className="mb-6 flex-row rounded-xl bg-[#E82F2F] p-4">
              <View className="mr-2 h-5 w-5 items-center justify-center">
                <WarningIcon width={20} height={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-[12px] font-medium text-white">WARNING</Text>
                <Text className="text-[12px] font-medium leading-5 text-white">
                  If you have not saved the QR code, close this modal and secure it now.
                </Text>
              </View>
            </View>

            <View>
              <View className="mb-3 flex-row">
                <Text className="text-base text-[#0F0F0F]">• </Text>
                <Text className="flex-1 text-base text-[#0F0F0F]">
                  Once you proceed, the QR code will be permanently hidden.
                </Text>
              </View>
              <View className="mb-3 flex-row">
                <Text className="text-base text-[#0F0F0F]">• </Text>
                <Text className="flex-1 text-base text-[#0F0F0F]">
                  This recovery function cannot be accessed again.
                </Text>
              </View>
              <View className="flex-row">
                <Text className="text-base text-[#0F0F0F]">• </Text>
                <Text className="flex-1 text-base text-[#0F0F0F]">
                  Without this QR code, you will not be able to recover your account if you forget
                  your password.
                </Text>
              </View>
            </View>

            <View className="mb-4 mt-8">
              <SecondaryButton onPress={onConfirm} title="Confirm & Hide QR Code" />
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

export default RecoveryConfirmSheet;
