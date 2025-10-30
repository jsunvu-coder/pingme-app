import React from 'react';
import { View } from 'react-native';

type Props = {
  index: number;
};

export default function PageIndicator({ index }: Props) {
  const positions = [0, 1, 2];

  return (
    <View className="mt-4 flex-row items-center justify-center gap-x-2">
      {positions.map((pos) =>
        pos === index ? (
          <View
            key={pos}
            style={{ width: 32, height: 8, borderRadius: 4, backgroundColor: 'white' }}
          />
        ) : (
          <View
            key={pos}
            style={{ width: 12, height: 12, borderRadius: 6, borderColor: 'white', borderWidth: 2 }}
          />
        )
      )}
    </View>
  );
}
