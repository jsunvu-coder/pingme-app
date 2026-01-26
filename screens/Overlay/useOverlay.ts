import { useDispatch } from 'react-redux';
import { showOverlay, hideOverlay, OverlayPayload, OverlayType } from '../../store/overlaySlice';
import { AppDispatch } from '../../store';

/**
 * Hook to easily show/hide overlays from any component
 */
export function useOverlay() {
  const dispatch = useDispatch<AppDispatch>();

  const show = (type: OverlayType, payload?: OverlayPayload) => {
    dispatch(showOverlay({ type, payload }));
  };

  const hide = () => {
    dispatch(hideOverlay());
  };

  const showHongBaoSuccess = (link: string) => {
    show('hongbao-success', { link });
  };

  return {
    show,
    hide,
    showHongBaoSuccess,
  };
}
