import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AniCover, { AniCoverRef } from './AniCover';
import CreateHongBaoForm, { CreateHongBaoFormRef, HongBaoFormData } from './CreateHongBaoForm';
import { useOverlay } from 'screens/Overlay';
import { clearAction } from 'store/overlaySlice';
import { RootState } from 'store';
import { CreateBundleRequest, RedPocketService } from 'business/services/RedPocketService';
import { GLOBALS, LOCKBOX_DURATION, MIN_AMOUNT, TOKEN_DECIMALS, TOKENS } from 'business/Constants';
import { Utils } from 'business/Utils';
import { showFlashMessage } from 'utils/flashMessage';
import { APP_URL } from 'business/Config';
import { BalanceService } from 'business/services/BalanceService';
import { fetchRecentHistoryToRedux } from 'store/historyThunks';
import { useCurrentAccountStablecoinBalance } from 'store/hooks';
import { t } from 'i18n';
import enUS from 'i18n/en-US.json';
import { showLocalizedAlert } from 'components/LocalizedAlert';

const DEFAULT_DURATION = 7 * 60 * 60 * 24;

const confirm = async (msg: string) => {
  const resolvedMessage = Object.prototype.hasOwnProperty.call(enUS, msg)
    ? (enUS as Record<string, unknown>)[msg]
    : msg;
  const message =
    typeof resolvedMessage === 'string' ? resolvedMessage : String(resolvedMessage ?? msg);

  // Show confirmation popup (OK + Cancel)
  return showLocalizedAlert({
    title: 'Confirmation',
    message,
    buttons: [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => false,
      },
      {
        text: 'OK',
        onPress: () => true,
      },
    ],
  });
};

export default function HongBaoScreen() {
  const { showHongBaoSuccess } = useOverlay();
  const dispatch = useDispatch();
  const aniCoverRef = useRef<AniCoverRef>(null);
  const createHongBaoFormRef = useRef<CreateHongBaoFormRef>(null);
  const [loading, setLoading] = useState(false);
  const redPocketService = RedPocketService.getInstance();
  const balanceService = BalanceService.getInstance();
  const { stablecoinEntries } = useCurrentAccountStablecoinBalance();
  // Listen to overlay actions
  const actionTriggered = useSelector((state: RootState) => state.overlay.actionTriggered);

  console.log('stablecoinEntries', stablecoinEntries);

  useEffect(() => {
    if (actionTriggered === 'hongbao:reset') {
      // Reset animation when triggered from overlay
      aniCoverRef.current?.resetProgress();
      createHongBaoFormRef.current?.clearForm();
      // Clear the action
      dispatch(clearAction());
    }
  }, [actionTriggered, dispatch]);

  const handleCreateHongBao = async (data: HongBaoFormData) => {
    // console.log('Creating HongBao:', data);

    if (!data.totalAmount) {
      showFlashMessage({
        title: 'Error',
        message: 'Total amount is required',
        type: 'danger',
      });
      return;
    }

    if (!data.recipientCount) {
      showFlashMessage({
        title: 'Error',
        message: 'Recipient count is required',
        type: 'danger',
      });
      return;
    }

    const entry = stablecoinEntries[0];

    const total_amount = Utils.toMicro(data.totalAmount.toString(), TOKEN_DECIMALS[data.token]);

    //TODO: current only allow stablecoin bundles, need to add support for other tokens
    const kMinAmount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);

    if (total_amount < kMinAmount) {
      showFlashMessage({
        title: t('_TITLE_BELOW_MINIMUM', undefined, 'Amount too low'),
        message: t(
          '_ALERT_BELOW_MINIMUM',
          undefined,
          'Minimum amount must be greater than the minimum amount'
        ),
        type: 'danger',
      });
      return;
    }

    if (BigInt(entry?.amount) < total_amount) {
      showFlashMessage({
        title: t('_TITLE_ABOVE_AVAILABLE', undefined, 'Amount too high'),
        message: t('_ALERT_ABOVE_AVAILABLE', undefined, 'The amount exceed the available balance.'),
        type: 'danger',
      });
      return;
    }

    if (!(await confirm('_CONFIRM_CREATE_HONG_BAO'))) return;

    const createBundleRequest: CreateBundleRequest = {
      token: TOKENS[data.token],
      total_amount,
      quantity: data.recipientCount,
      duration: DEFAULT_DURATION,
      message: data.message,
    };

    // Call create bundle
    setLoading(true);
    try {
      const result = await redPocketService.createBundle(createBundleRequest);
      await balanceService.getBalance();

      setTimeout(() => {
        void fetchRecentHistoryToRedux(dispatch);
      }, 3000);

      aniCoverRef.current?.continueProgress();
      setTimeout(() => {
        showHongBaoSuccess(`${APP_URL}/redPocket?bundle_uuid=${result.uuid}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating HongBao:', error);
      showFlashMessage({
        title: 'Error',
        message: 'Failed to create HongBao',
        type: 'danger',
      });
      return;
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    }
  };

  return (
    <AniCover ref={aniCoverRef}>
      <CreateHongBaoForm
        ref={createHongBaoFormRef}
        onSubmit={handleCreateHongBao}
        loading={loading}
      />
    </AniCover>
  );
}
