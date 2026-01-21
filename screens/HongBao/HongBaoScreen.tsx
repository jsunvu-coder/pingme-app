import { useEffect, useRef } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AniCover, { AniCoverRef } from './AniCover';
import PrimaryButton from 'components/PrimaryButton';
import { useOverlay } from 'screens/Overlay';
import { clearAction } from 'store/overlaySlice';
import { RootState } from 'store';

export default function HongBaoScreen() {
  const { showHongBaoSuccess } = useOverlay();
  const dispatch = useDispatch();
  const aniCoverRef = useRef<AniCoverRef>(null);
  
  // Listen to overlay actions
  const actionTriggered = useSelector((state: RootState) => state.overlay.actionTriggered);

  useEffect(() => {
    if (actionTriggered === 'hongbao:reset') {
      // Reset animation when triggered from overlay
      aniCoverRef.current?.resetProgress();
      // Clear the action
      dispatch(clearAction());
    }
  }, [actionTriggered, dispatch]);

  const handleContinue = () => {
    aniCoverRef.current?.continueProgress();
    setTimeout(() => {
      showHongBaoSuccess('https://pingme.app/pay/4f8abc123');
    }, 2000);
  };

  const handleReset = () => {
    aniCoverRef.current?.resetProgress();
  };

  return (
    <AniCover ref={aniCoverRef}>
      <PrimaryButton title="Continue" onPress={handleContinue}/>
      <TouchableOpacity onPress={handleReset}>
        <Text>Reset</Text>
      </TouchableOpacity>
    </AniCover>
  );
}
