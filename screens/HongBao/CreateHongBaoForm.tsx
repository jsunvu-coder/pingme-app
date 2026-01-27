import { View, Text } from 'react-native';
import { useState, forwardRef, useImperativeHandle } from 'react';
import PrimaryButton from 'components/PrimaryButton';
import LabeledInput from 'components/LabeledInput';
import CounterInput from 'components/CounterInput';
import ChatTextIcon from 'assets/ChatTextIcon';
import DollarSignIcon from 'assets/DollarSignIcon';
import EnvelopeIcon from 'assets/HongBaoAni/EnvelopeIcon';
import { ALL_TOKENS, TOKENS } from 'business/Constants';

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

const MAX_RECIPIENTS = 20;
const MAX_AMOUNT = 100;
const MAX_MESSAGE_LENGTH = 80;

const CreateHongBaoForm = forwardRef<CreateHongBaoFormRef, CreateHongBaoFormProps>(
  ({ onSubmit, loading = false }, ref) => {
    const [recipientCount, setRecipientCount] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [message, setMessage] = useState('恭喜发财🧧');
    const [editable, setEditable] = useState(true);

    const tokens = ALL_TOKENS;

    const [selectedToken, setSelectedToken] = useState(tokens[0]);

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

    const amountError =
      totalAmount && totalAmountNum > MAX_AMOUNT
        ? `Total amount cannot exceed $${MAX_AMOUNT}`
        : undefined;

    const isValid =
      recipientCountNum > 0 &&
      totalAmountNum > 0 &&
      totalAmountNum <= MAX_AMOUNT &&
      recipientCountNum <= MAX_RECIPIENTS;

    return (
      <View pointerEvents={editable ? 'auto' : 'none'} className="w-full" >
        {/* Title */}
        <View className="mb-6 flex-row items-center">
          <Text className=" flex-1 text-2xl font-bold text-[#982C0B] text-center mb-6">
            Gift luck, joy and{'\n'}crypto in one tap.
          </Text>
        </View>

        {/* Number of Recipients */}
        <View className="mb-6">
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
        <View className="mb-6">
          <LabeledInput
            value={totalAmount}
            onChangeText={setTotalAmount}
            icon={<DollarSignIcon width={24} height={24} />}
            showMaxInfo={`Max $${MAX_AMOUNT}`}
            showCharCount={false}
            multiline={false}
            keyboardType="number-pad"
            placeholder="How much in total?"
            editable={!loading}
            maxLength={MAX_AMOUNT.toString().length}
            integerOnly
            helperText={amountError}
          />
        </View>

        {/* Message */}
        <View className="mb-6">
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
