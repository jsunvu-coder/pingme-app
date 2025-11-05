import enUS from './en-US.json';

type TranslationParams = Record<string, string | number>;

const translations = enUS as Record<string, string>;

export type TranslationKey = keyof typeof enUS;

export function hasTranslation(key: string): key is TranslationKey {
  return Object.prototype.hasOwnProperty.call(translations, key);
}

export function translate(
  key: TranslationKey | string,
  params?: TranslationParams,
  fallback?: string
): string {
  const template = translations[key] ?? fallback ?? key;

  if (!params) return template;

  return Object.entries(params).reduce((acc, [token, value]) => {
    const pattern = new RegExp(`{{\\s*${token}\\s*}}`, 'g');
    return acc.replace(pattern, String(value));
  }, template);
}

export const t = translate;

export default translate;
