import { t } from 'i18n';
import {
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  passwordRegex as sharedPasswordRegex,
} from 'utils/passwordPolicy';

export const passwordRegex = sharedPasswordRegex;

export const validatePasswordFields = (
  password: string,
  confirm: string
): { password?: string; confirm?: string } => {
  const validation: { password?: string; confirm?: string } = {};

  const ruleMessage =
    t('AUTH_PASSWORD_RULE', { min: PASSWORD_MIN_LENGTH }) ||
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include uppercase, lowercase, and a number`;

  if (!password) {
    validation.password = t('AUTH_PASSWORD_REQUIRED') || 'Password is required';
  } else if (!isPasswordValid(password)) {
    validation.password = ruleMessage;
  }

  if (!confirm) {
    validation.confirm = t('AUTH_PASSWORD_CONFIRM_REQUIRED') || 'Please re-enter password';
  } else if (password && confirm !== password) {
    validation.confirm = t('AUTH_PASSWORD_MISMATCH') || 'Passwords do not match';
  }

  return validation;
};
