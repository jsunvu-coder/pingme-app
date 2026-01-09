import {
  useMemo,
  forwardRef,
  useCallback,
  useEffect,
  ReactNode,
  useState,
  useRef,
  useImperativeHandle,
} from 'react';
import { View, Modal, Platform, Keyboard, TextInput } from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

export type BottomSheetModalRef = BottomSheet & {
  scrollTo: (y: number) => void;
  scrollToInput: () => void;
  setInputPosition: (y: number) => void;
};

type BottomSheetModalProps = {
  visible: boolean;
  snapPoints?: string[];
  onClose: () => void;
  children: ReactNode;
  enablePanDownToClose?: boolean;
  backdropOpacity?: number;
  enableDynamicSizing?: boolean;
};

const BottomSheetModal = forwardRef<BottomSheetModalRef, BottomSheetModalProps>(
  (
    {
      visible,
      snapPoints = ['90%'],
      onClose,
      children,
      enablePanDownToClose = true,
      backdropOpacity = 0.5,
      enableDynamicSizing = false,
    },
    ref
  ) => {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const scrollViewRef = useRef<any>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const inputPositionRef = useRef<number | null>(null);

    // Expose scrollTo method via ref
    useImperativeHandle(ref, () => {
      const base = bottomSheetRef.current || ({} as BottomSheet);
      return {
        ...base,
        scrollTo: (y: number) => {
          if (scrollViewRef.current) {
            // BottomSheetScrollView should support scrollTo directly
            // Try multiple approaches to access scrollTo
            try {
              if ((scrollViewRef.current as any)?.scrollTo) {
                (scrollViewRef.current as any).scrollTo({ y, animated: true });
              } else {
                // Fallback: use getNativeScrollRef if available
                const nativeScrollRef = (scrollViewRef.current as any)?.getNativeScrollRef?.();
                if (nativeScrollRef?.scrollTo) {
                  nativeScrollRef.scrollTo({ y, animated: true });
                }
              }
            } catch (err) {
              console.warn('Failed to scroll BottomSheetScrollView:', err);
            }
          }
        },
        scrollToInput: () => {
          if (inputPositionRef.current !== null && scrollViewRef.current) {
            // iOS needs larger offset to ensure input is well above keyboard
            const offset = Platform.OS === 'ios' ? 250 : 150;
            const scrollY = Math.max(0, inputPositionRef.current - offset);

            const nativeScrollRef =
              (scrollViewRef.current as any)?.getNativeScrollRef?.() ||
              (scrollViewRef.current as any)?.nativeRef?.current ||
              scrollViewRef.current;

            if (nativeScrollRef?.scrollTo) {
              nativeScrollRef.scrollTo({
                y: scrollY,
                animated: true,
              });
            } else if (scrollViewRef.current?.scrollTo) {
              (scrollViewRef.current as any).scrollTo({
                y: scrollY,
                animated: true,
              });
            }
          }
        },
        setInputPosition: (y: number) => {
          inputPositionRef.current = y;
        },
      } as BottomSheetModalRef;
    }, []);

    useEffect(() => {
      const showSubscription = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (e) => {
          const keyboardHeight = e.endCoordinates.height;
          setKeyboardHeight(keyboardHeight);

          // Scroll to input immediately when keyboard starts appearing (smooth animation)
          if (visible && inputPositionRef.current !== null && scrollViewRef.current) {
            // Calculate scroll position: input position minus offset to show space above
            // iOS needs larger offset to ensure input is well above keyboard
            const offset = Platform.OS === 'ios' ? 250 : 150;
            const scrollY = Math.max(0, inputPositionRef.current - offset);

            // iOS: scroll immediately and multiple times during animation
            // Android: scroll once as keyboard already appeared
            const scrollOnce = () => {
              try {
                if ((scrollViewRef.current as any)?.scrollTo) {
                  (scrollViewRef.current as any).scrollTo({ y: scrollY, animated: true });
                } else {
                  // Fallback: try getNativeScrollRef
                  const nativeScrollRef = (scrollViewRef.current as any)?.getNativeScrollRef?.();
                  if (nativeScrollRef?.scrollTo) {
                    nativeScrollRef.scrollTo({ y: scrollY, animated: true });
                  } else if (nativeScrollRef?.scrollToEnd) {
                    // Last resort: scroll to end
                    nativeScrollRef.scrollToEnd({ animated: true });
                  }
                }
              } catch (err) {
                console.warn('Failed to scroll to input on keyboard show:', err);
              }
            };

            if (Platform.OS === 'ios') {
              // iOS: keyboardWillShow fires before animation, scroll multiple times with larger offset
              scrollOnce();
              // Scroll during animation (mid point)
              setTimeout(() => scrollOnce(), 150);
              // Scroll near end of animation
              setTimeout(() => scrollOnce(), 300);
            } else {
              // Android: keyboardDidShow fires after keyboard appeared, scroll once
              scrollOnce();
            }
          }
        }
      );
      const hideSubscription = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          setKeyboardHeight(0);
        }
      );

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }, [visible]);

    // If enableDynamicSizing, don't use snapPoints
    const memoizedSnapPoints = useMemo(() => {
      if (enableDynamicSizing) {
        return undefined;
      }
      return snapPoints;
    }, [snapPoints, enableDynamicSizing]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={backdropOpacity}
        />
      ),
      [backdropOpacity]
    );

    useEffect(() => {
      if (visible) {
        if (enableDynamicSizing) {
          // With dynamic sizing, just expand
          setTimeout(() => {
            bottomSheetRef.current?.expand();
          }, 100);
        } else {
          setTimeout(() => {
            bottomSheetRef.current?.snapToIndex(0);
          }, 100);
        }
      } else {
        bottomSheetRef.current?.close();
      }
    }, [visible, enableDynamicSizing]);

    const handleClose = useCallback(() => {
      bottomSheetRef.current?.close();
      onClose();
    }, [onClose]);

    if (!visible) return null;

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
        <View className="flex-1 bg-[#00000080]">
          <BottomSheet
            ref={bottomSheetRef}
            index={enableDynamicSizing ? 0 : -1}
            snapPoints={memoizedSnapPoints}
            enablePanDownToClose={enablePanDownToClose}
            handleComponent={() => null}
            backdropComponent={renderBackdrop}
            onClose={onClose}
            keyboardBehavior={Platform.OS === 'android' ? 'extend' : 'extend'}
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            enableDynamicSizing={enableDynamicSizing}
            maxDynamicContentSize={enableDynamicSizing ? 800 : undefined}
            backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <BottomSheetScrollView
              ref={scrollViewRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom:
                  keyboardHeight > 0
                    ? Platform.OS === 'android'
                      ? Math.max(keyboardHeight + 20, 150)
                      : Math.max(keyboardHeight + 50, 200) // iOS needs more padding to avoid input being too close to keyboard
                    : 40,
              }}>
              {children}
            </BottomSheetScrollView>
          </BottomSheet>
        </View>
      </Modal>
    );
  }
);

BottomSheetModal.displayName = 'BottomSheetModal';

export default BottomSheetModal;
