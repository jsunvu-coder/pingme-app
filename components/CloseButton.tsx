import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { goBack } from 'navigation/Navigation';

type Props = {
  onPress?: () => void;
  className?: string;
  iconColor?: string;
  iconSize?: number;
  isLoading?: boolean;
};

export default function CloseButton({
  onPress,
  className = '',
  iconColor = '#C4C4C4',
  iconSize = 40,
  isLoading = false,
}: Props) {
  const handleClose = () => {
    if (isLoading) return;
    if (onPress) {
      onPress();
    } else {
      goBack();
    }
  };

  return (
    <View className={className || 'mb-4 flex-row justify-end'}>
      <TouchableOpacity onPress={handleClose}>
        <Ionicons name="close-outline" size={iconSize} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
}
