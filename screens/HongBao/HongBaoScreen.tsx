import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AniCover, { AniCoverRef } from './AniCover';
import CreateHongBaoForm, { CreateHongBaoFormRef, HongBaoFormData } from './CreateHongBaoForm';
import { useOverlay } from 'screens/Overlay';
import { clearAction } from 'store/overlaySlice';
import { RootState } from 'store';

export default function HongBaoScreen() {
  const { showHongBaoSuccess } = useOverlay();
  const dispatch = useDispatch();
  const aniCoverRef = useRef<AniCoverRef>(null);
  const createHongBaoFormRef = useRef<CreateHongBaoFormRef>(null);
  const [loading, setLoading] = useState(false);
  
  // Listen to overlay actions
  const actionTriggered = useSelector((state: RootState) => state.overlay.actionTriggered);

  useEffect(() => {
    if (actionTriggered === 'hongbao:reset') {
      // Reset animation when triggered from overlay
      aniCoverRef.current?.resetProgress();
      createHongBaoFormRef.current?.clearForm();
      // Clear the action
      dispatch(clearAction());
    }
  }, [actionTriggered, dispatch]);

  const handleCreateHongBao = (data: HongBaoFormData) => {
    console.log('Creating HongBao:', data);
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      
      // Trigger animation and show success overlay
      aniCoverRef.current?.continueProgress();
      setTimeout(() => {
        showHongBaoSuccess(`https://pingme.app/hongbao/${Date.now()}`);
      }, 2000);
    }, 1500);
  };

  return (
    <AniCover ref={aniCoverRef}>
      <CreateHongBaoForm ref={createHongBaoFormRef} onSubmit={handleCreateHongBao} loading={loading} />
    </AniCover>
  );
}
