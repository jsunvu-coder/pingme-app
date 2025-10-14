import { TouchableOpacity, Text } from 'react-native';

interface OutlineButtonProps {
  title: string;
  onPress?: () => void;
  className?: string;
}

export default function OutlineButton({ title, onPress, className = '' }: OutlineButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center rounded-full border border-[#333] bg-transparent py-4 ${className}`}>
      <Text className="text-center text-lg font-bold text-[#333]">{title}</Text>
    </TouchableOpacity>
  );
}
