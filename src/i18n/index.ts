import en from './en.json';
import hi from './hi.json';
import mr from './mr.json';
import type { Lang } from '../extract/types';

type Dict = Record<string, string>;
const dicts: Record<Lang, Dict> = { en: en as Dict, hi: hi as Dict, mr: mr as Dict };

let current: Lang = 'en';

export function setUiLang(l: Lang): void {
  current = l;
  document.documentElement.lang = l;
}

export function getUiLang(): Lang {
  return current;
}

/** Translate a key; falls back to English, then to the key itself. `{name}` placeholders are filled from vars. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = dicts[current][key] ?? dicts.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? `{${k}}`)) : raw;
}

export const UI_LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

export const allDicts = dicts;
