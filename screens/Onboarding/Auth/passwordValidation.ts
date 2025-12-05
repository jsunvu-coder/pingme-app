import { t } from 'i18n';

export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; // 8+ chars, upper, lower, digit

export const validatePasswordFields = (
  password: string,
  confirm: string
): { password?: string; confirm?: string } => {
  const validation: { password?: string; confirm?: string } = {};

  const ruleMessage =
    t('AUTH_PASSWORD_RULE') ||
    'Password must be at least 8 characters and include uppercase, lowercase, and a number';

  if (!password) {
    validation.password = t('AUTH_PASSWORD_REQUIRED') || 'Password is required';
  } else if (!passwordRegex.test(password)) {
    validation.password = ruleMessage;
  }

  if (!confirm) {
    validation.confirm = t('AUTH_PASSWORD_CONFIRM_REQUIRED') || 'Please re-enter password';
  } else if (password && confirm !== password) {
    validation.confirm = t('AUTH_PASSWORD_MISMATCH') || 'Passwords do not match';
  }

  return validation;
};
