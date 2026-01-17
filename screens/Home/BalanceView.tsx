import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlusIcon from 'assets/PlusIcon';
import { BalanceEntry } from 'business/Types';
import { push } from 'navigation/Navigation';
import { useCallback, useRef, useEffect } from 'react';

export default function BalanceView({
  balance,
  onRefresh,
  loading = false,
}: {
  balance: string;
  tokens?: BalanceEntry[];
  onRefresh?: () => Promise<void> | void;
  loading?: boolean;
}) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);
  // Stop animation when loading becomes false - but let it complete one full rotation
  useEffect(() => {
    if (!loading && isAnimatingRef.current && animationRef.current) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Stop the loop animation and get current value
      animationRef.current.stop();
      animationRef.current = null;

      spinValue.stopAnimation((currentValue) => {
        // Calculate remaining rotation to complete one full circle (1.0)
        const fractionalPart = currentValue % 1.0;
        const remainingRotation = 1.0 - fractionalPart;
        // Target value to complete the current circle
        const targetValue = Math.floor(currentValue) + 1.0;

        // Animate from current position to complete one full rotation
        const completeAnimation = Animated.timing(spinValue, {
          toValue: targetValue,
          duration: remainingRotation * 800, // Calculate duration based on remaining rotation
          easing: Easing.linear,
          useNativeDriver: true,
        });

        completeAnimation.start(({ finished }) => {
          if (finished) {
            // Reset to 0 after completing the rotation
            spinValue.setValue(0);
            isAnimatingRef.current = false;
          }
        });
      });
    }
  }, [loading, spinValue]);

  const handleRefresh = useCallback(async () => {
    if (isAnimatingRef.current) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    // Reset animation value
    spinValue.setValue(0);

    // Mark as animating
    isAnimatingRef.current = true;

    // Start spin animation
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animationRef.current = animation;
    animation.start();

    // Animation will be stopped by useEffect when loading becomes false
    await onRefresh?.();
  }, [onRefresh, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="mt-12 px-6">
      <Text className="mb-1 text-sm text-white opacity-80">Current Balance</Text>

      <View className="flex-row items-center justify-between">
        <View className="w-[80%] flex-row items-center">
          <Text
            className="text-[52px] font-extrabold text-white"
            numberOfLines={1}
            adjustsFontSizeToFit>
            {balance}
          </Text>
          <TouchableOpacity onPress={handleRefresh} className="rounded-full p-2">
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="refresh" size={26} color="white" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center space-x-3">
          <TouchableOpacity className="rounded-full" onPress={() => push('DepositScreen')}>
            <PlusIcon color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
