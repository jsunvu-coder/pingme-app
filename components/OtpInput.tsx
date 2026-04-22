import { useCallback, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

const DEFAULT_LENGTH = 6;
const DEFAULT_GAP = 8;

export type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  editable?: boolean;
  gap?: number;
  /** Border for each cell — parent controls error/success/focus colors */
  cellBorderStyle: (index: number) => { borderColor: string; borderWidth: number };
  digitColor: string;
  selectionColor: string;
  onFocusChange?: (focusedIndex: number | null) => void;
  textContentType?: 'oneTimeCode' | 'none';
  autoComplete?: 'sms-otp' | 'off';
};

/**
 * Six (or `length`) separate fields. Paste is split across cells from the focused index;
 * typing advances focus; backspace on empty moves to the previous cell.
 */
export function OtpInput({
  length = DEFAULT_LENGTH,
  value,
  onChange,
  editable = true,
  gap = DEFAULT_GAP,
  cellBorderStyle,
  digitColor,
  selectionColor,
  onFocusChange,
  textContentType = 'oneTimeCode',
  autoComplete = 'sms-otp',
}: OtpInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const blurClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurClearTimerRef.current) clearTimeout(blurClearTimerRef.current);
    };
  }, []);

  const focusAt = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, length - 1));
    requestAnimationFrame(() => inputRefs.current[clamped]?.focus());
  }, [length]);

  /** After paste, RN often keeps the full string in the focused native field; force one char per cell. */
  const syncNativeCells = useCallback((next: string) => {
    for (let i = 0; i < length; i++) {
      inputRefs.current[i]?.setNativeProps({ text: next[i] ?? '' });
    }
  }, [length]);

  const applyPastedDigits = useCallback(
    (rawDigits: string, startIndex: number) => {
      const cleaned = rawDigits.replace(/\D/g, '');
      const next = (value.slice(0, startIndex) + cleaned).slice(0, length);
      onChange(next);
      syncNativeCells(next);
      const focusIdx = next.length >= length ? length - 1 : next.length;
      focusAt(focusIdx);
    },
    [length, onChange, focusAt, value, syncNativeCells]
  );

  const handleChangeText = useCallback(
    (index: number, text: string) => {
      const digits = text.replace(/\D/g, '');
      if (digits.length > 1) {
        applyPastedDigits(digits, index);
        return;
      }
      if (digits.length === 0) {
        const next = value.slice(0, index) + value.slice(index + 1);
        onChange(next);
        return;
      }
      const next = (value.slice(0, index) + digits[0] + value.slice(index + 1)).slice(0, length);
      onChange(next);
      if (index < length - 1) {
        focusAt(index + 1);
      }
    },
    [value, onChange, length, applyPastedDigits, focusAt]
  );

  const handleKeyPress = useCallback(
    (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key !== 'Backspace') return;
      if (value[index]) return;
      if (index <= 0) return;
      const next = value.slice(0, index - 1) + value.slice(index);
      onChange(next);
      focusAt(index - 1);
    },
    [value, onChange, focusAt]
  );

  const handleFocus = useCallback(
    (index: number) => {
      if (blurClearTimerRef.current) {
        clearTimeout(blurClearTimerRef.current);
        blurClearTimerRef.current = null;
      }
      onFocusChange?.(index);
    },
    [onFocusChange]
  );

  const handleBlur = useCallback(() => {
    if (blurClearTimerRef.current) clearTimeout(blurClearTimerRef.current);
    blurClearTimerRef.current = setTimeout(() => {
      onFocusChange?.(null);
      blurClearTimerRef.current = null;
    }, 80);
  }, [onFocusChange]);

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          value={value[index] ?? ''}
          onChangeText={(t) => handleChangeText(index, t)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          keyboardType="number-pad"
          maxLength={length}
          editable={editable}
          selectTextOnFocus
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          style={[
            styles.cell,
            { color: digitColor },
            index < length - 1 ? { marginRight: gap } : null,
            cellBorderStyle(index),
          ]}
          selectionColor={selectionColor}
          textContentType={textContentType}
          autoComplete={autoComplete}
          accessibilityLabel={`Digit ${index + 1} of ${length}`}
          {...(index === 0
            ? {
                accessibilityHint: 'Enter or paste the verification code',
              }
            : {})}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
});
