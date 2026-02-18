import { View, Text } from 'react-native';
import { useState, forwardRef, useImperativeHandle, useMemo, useEffect } from 'react';
import PrimaryButton from 'components/PrimaryButton';
import LabeledInput from 'components/LabeledInput';
import CounterInput from 'components/CounterInput';
import ChatTextIcon from 'assets/ChatTextIcon';
import DollarSignIcon from 'assets/DollarSignIcon';
import EnvelopeIcon from 'assets/HongBaoAni/EnvelopeIcon';
import { ALL_TOKENS, TOKENS } from 'business/Constants';
import MonadIcon from 'assets/MonadIcon';
import TokenSelectorTabs from 'components/TokenSelectorTabs';
import { Utils } from 'business/Utils';

type CreateHongBaoFormProps = {
  onSubmit: (data: HongBaoFormData) => void;
  loading?: boolean;
};

export type CreateHongBaoFormRef = {
  clearForm: () => void;
  setEditable: (editable: boolean) => void;
};

export type HongBaoFormData = {
  recipientCount: number;
  totalAmount: number;
  message: string;
  token: keyof typeof TOKENS;
};

const MAX_RECIPIENTS = 500;
const MAX_AMOUNT = 2500;
const MAX_AMOUNT_WMON = 125000;
const MAX_MESSAGE_LENGTH = 80;

const CreateHongBaoForm = forwardRef<CreateHongBaoFormRef, CreateHongBaoFormProps>(
  ({ onSubmit, loading = false }, ref) => {
    const [recipientCount, setRecipientCount] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [message, setMessage] = useState('恭喜发财🧧');
    const [editable, setEditable] = useState(true);

    const tokens = ALL_TOKENS;

    const [selectedToken, setSelectedToken] = useState(tokens[0]);

    const maxAmount = useMemo(() => {
      if (Utils.isStablecoin(selectedToken)) {
        return MAX_AMOUNT;
      }
      return MAX_AMOUNT_WMON;
    }, [selectedToken]);

    // Expose clearForm method via ref
    useImperativeHandle(ref, () => ({
      clearForm: () => {
        setRecipientCount('');
        setTotalAmount('');
        setMessage('恭喜发财🧧');
      },
      setEditable: (editable: boolean) => {
        setEditable(editable);
      },
    }));

    useEffect(() => {
      setRecipientCount('');
      setTotalAmount('');
      setMessage('恭喜发财🧧');
    }, [selectedToken]);

    const handleSubmit = () => {
      onSubmit({
        recipientCount: parseInt(recipientCount, 10) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        message,
        token: selectedToken,
      });
    };

    // Validation
    const recipientCountNum = parseInt(recipientCount, 10);
    const totalAmountNum = parseFloat(totalAmount);

    const recipientError =
      recipientCount && recipientCountNum > MAX_RECIPIENTS
        ? `Total envelopes cannot exceed ${MAX_RECIPIENTS}`
        : undefined;

    const amountError = useMemo(() => {
      if (totalAmount && totalAmountNum > maxAmount) {
        if (Utils.isStablecoin(selectedToken)) {
          return `Total amount cannot exceed $${maxAmount}`;
        }
        return `Total amount cannot exceed ${maxAmount}${selectedToken}`;
      }
    }, [totalAmount, totalAmountNum, maxAmount]);

    const isValid =
      recipientCountNum > 0 &&
      totalAmountNum > 0 &&
      totalAmountNum <= maxAmount;

    const isStablecoin = selectedToken === 'USDC' || selectedToken === 'pUSDC';
    const maxAmountInfo = 'Max ' + Utils.formatDisplayAmount(maxAmount.toString(), selectedToken);

    // Max length for amount input based on current value, not token:
    // base = digit length of maxAmount, +1 if user actually uses a decimal separator.
    // Count digits only before "." in maxAmount, then +2 (for "." and 1 decimal digit)
    const maxAmountStr = maxAmount.toString();
    const integerPartLength = totalAmount.split('.')[0]?.length ?? 0;
    const hasDecimalSeparator = totalAmount.includes('.') || totalAmount.includes(',');
    const isMaxAmountReached = totalAmountNum >= maxAmount;
    // If user uses decimal separator, allow exactly one "." and one digit after it:
    // integer part (maxAmountDigitsLength) + "." + 1 decimal digit => +2
    const totalAmountMaxLength = hasDecimalSeparator
      ? integerPartLength + 2
      : isMaxAmountReached? maxAmountStr.length : maxAmountStr.length + 1;

    return (
      <View pointerEvents={editable ? 'auto' : 'none'} className="w-full gap-y-4">
        {/* Title */}
        <View className="flex-row items-center">
          <Text className="flex-1 text-center text-2xl font-bold text-[#982C0B]">
            Gift luck, joy and{'\n'}crypto in one tap.
          </Text>
        </View>

        {/* Token Selector */}
        <View className="">
          <TokenSelectorTabs selectedToken={selectedToken} setSelectedToken={setSelectedToken} />
        </View>

        {/* Number of Recipients */}
        <View className="">
          <CounterInput
            value={recipientCount}
            onValueChange={setRecipientCount}
            min={1}
            max={MAX_RECIPIENTS}
            step={1}
            icon={<EnvelopeIcon color={'#3B3A3A'} width={24} height={24} />}
            showMaxInfo={`Max ${MAX_RECIPIENTS}`}
            disabled={loading}
            placeholder="How many Hongbao?"
            helperText={recipientError}
          />
        </View>

        {/* Total Amount */}
        <View className="">
          <LabeledInput
            value={totalAmount}
            onChangeText={setTotalAmount}
            icon={
              isStablecoin ? (
                <DollarSignIcon width={24} height={24} />
              ) : (
                <MonadIcon width={24} height={24} />
              )
            }
            showMaxInfo={maxAmountInfo}
            showCharCount={false}
            multiline={false}
            minValue={isStablecoin ? 0.01 : 5}
            integerOnly={!isStablecoin}
            keyboardType={isStablecoin ? 'decimal-pad' : 'number-pad'}
            placeholder="How much in total?"
            editable={!loading}
            maxLength={totalAmountMaxLength}
            helperText={amountError}
          />
        </View>

        {/* Message */}
        <View className="">
          <LabeledInput
            value={message}
            onChangeText={setMessage}
            placeholder="Add a message..."
            maxLength={MAX_MESSAGE_LENGTH}
            editable={!loading}
            icon={<ChatTextIcon />}
            showCharCount
            multiline
          />
        </View>

        {/* Submit Button */}
        <PrimaryButton
          title="Create Hongbao"
          onPress={handleSubmit}
          disabled={!isValid || loading}
          loading={loading}
          loadingText="Creating..."
        />
      </View>
    );
  }
);

CreateHongBaoForm.displayName = 'CreateHongBaoForm';

export default CreateHongBaoForm;
