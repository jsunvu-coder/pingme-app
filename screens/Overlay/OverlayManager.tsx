import { StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

// Import overlay content components
import { HongBaoSuccessOverlay } from './overlays/HongBaoSuccessOverlay';

export default function OverlayManager() {
  const { isVisible, type, payload } = useSelector((state: RootState) => state.overlay);

  if (!isVisible || !type) {
    return null;
  }

  const renderOverlayContent = () => {
    switch (type) {
      case 'hongbao-success':
        return <HongBaoSuccessOverlay payload={payload} />;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      entering={SlideInDown.springify()}
      exiting={SlideOutDown.springify()}
      style={styles.overlay}
      pointerEvents="box-none"
    > 
     {/* Content container */}
      <View style={styles.container} pointerEvents="box-none">
        {renderOverlayContent()}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
