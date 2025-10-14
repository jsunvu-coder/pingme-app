import React from "react";
import { View } from "react-native";

type Props = {
  index: number; // active index
};

export default function PageIndicator({ index }: Props) {
  const positions = [0, 1, 2];

  return (
    <View className="flex-row justify-center items-center gap-x-2 mt-4">
      {positions.map((pos) =>
        pos === index ? (
          <View
            key={pos}
            style={{ width: 32, height: 8, borderRadius: 4, backgroundColor: "#FD4912" }}
          />
        ) : (
          <View
            key={pos}
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FD6D41" }}
          />
        )
      )}
    </View>
  );
}
