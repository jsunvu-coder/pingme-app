export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleResult = {
  minLength: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
};

export function getPasswordRuleResults(password: string): PasswordRuleResult {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasNumber: /\d/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const results = getPasswordRuleResults(password);
  return results.minLength && results.hasNumber && results.hasUppercase && results.hasLowercase;
}

export const passwordRegex = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{${PASSWORD_MIN_LENGTH},}$`
);
