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

  // Convenience methods for common overlay types
  const showLoading = (message?: string) => {
    show('loading', { message });
  };

  const showError = (message: string, title?: string) => {
    show('error', { message, title });
  };

  const showConfirmation = (
    message: string,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
    }
  ) => {
    show('confirmation', {
      message,
      ...options,
    });
  };

  const showHongBaoSuccess = (link: string) => {
    show('hongbao-success', { link });
  };

  const showHongBaoClaimed = (
    amount: string,
    sender: string,
    message?: string
  ) => {
    show('hongbao-claimed', { amount, sender, message });
  };

  return {
    show,
    hide,
    showLoading,
    showError,
    showConfirmation,
    showHongBaoSuccess,
    showHongBaoClaimed,
  };
}
