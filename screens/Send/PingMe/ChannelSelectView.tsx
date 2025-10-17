import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';

type Props = {
  active: 'Email' | 'Link';
  onChange: (value: 'Email' | 'Link') => void;
};

export default function ChannelSelectView({ active, onChange }: Props) {
  const options = [
    {
      key: 'Email',
      title: 'Send Email',
      description: 'Recipient will receive the email to claim',
    },
    {
      key: 'Link',
      title: 'Share Link',
      description: 'You will share payment link to the recipient',
    },
  ];

  // Store animated opacity for each option
  const opacities = useRef(
    options.reduce(
      (acc, opt) => ({
        ...acc,
        [opt.key]: new Animated.Value(active === opt.key ? 1 : 0.5),
      }),
      {} as Record<string, Animated.Value>
    )
  ).current;

  // Animate fade when active option changes
  useEffect(() => {
    options.forEach((opt) => {
      const isActive = active === opt.key;
      Animated.timing(opacities[opt.key], {
        toValue: isActive ? 1 : 0.5,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  }, [active]);

  return (
    <View className="mt-5 flex-row justify-between">
      {options.map((opt, idx) => {
        const isActive = active === opt.key;
        return (
          <Animated.View
            key={opt.key}
            style={{
              flex: 1,
              opacity: opacities[opt.key],
            }}>
            <TouchableOpacity
              onPress={() => onChange(opt.key as 'Email' | 'Link')}
              activeOpacity={0.9}
              className={`rounded-2xl border p-4 ${
                isActive ? 'border-[#FD4912]' : 'border-gray-300'
              } ${idx === 0 ? 'mr-3' : ''}`}>
              <Text
                className={`mb-1 text-xl font-semibold ${
                  isActive ? 'text-[#FD4912]' : 'text-gray-900'
                }`}>
                {opt.title}
              </Text>
              <Text className="text-base leading-snug text-gray-600">{opt.description}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}
