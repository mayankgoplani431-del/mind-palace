import { del, get, set } from 'idb-keyval';
import type { Lang, LangChoice, PalaceData, StyleKey } from '../extract/types';
import type { Provider } from '../extract/llm/common';
import type { Card } from '../learn/srs';

// ---------------------------------------------------------------------------------------------
// Settings live in localStorage (incl. the BYO API key – it never leaves this browser except in
// the direct request to the chosen provider). Everything else is in IndexedDB via idb-keyval.
// ---------------------------------------------------------------------------------------------

export interface Settings {
  uiLang: Lang;
  langChoice: LangChoice;
  style: StyleKey | 'auto';
  night: boolean;
  mute: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  fontScale: number;
  bloom: boolean;
  gyro: boolean;
  tts: boolean;
  ghost: boolean;
  useLlm: boolean;
  provider: Provider;
  model: string;
  apiKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  uiLang: 'en',
  langChoice: 'auto',
  style: 'auto',
  night: false,
  mute: false,
  reducedMotion: false,
  highContrast: false,
  fontScale: 1,
  bloom: true,
  gyro: false,
  tts: true,
  ghost: false,
  useLlm: false,
  provider: 'anthropic',
  model: 'claude-sonnet-5-5',
  apiKey: '',
};

const SETTINGS_KEY = 'mindpalace.settings.v1';

export function loadSettings(): Settings {
  const s = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(s, JSON.parse(raw) as Partial<Settings>);
    else {
      s.reducedMotion = matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const nav = navigator.language?.toLowerCase() ?? 'en';
      s.uiLang = nav.startsWith('hi') ? 'hi' : nav.startsWith('mr') ? 'mr' : 'en';
    }
  } catch {
    /* storage blocked: defaults */
  }
  return s;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: settings last for this session only */
  }
}

// ---- key-value wrapper with in-memory fallback (private mode / blocked IndexedDB) ----
const mem = new Map<string, unknown>();
let idbBroken = false;

async function kvGet<T>(key: string): Promise<T | undefined> {
  if (!idbBroken) {
    try {
      return await get<T>(key);
    } catch {
      idbBroken = true;
    }
  }
  return mem.get(key) as T | undefined;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  mem.set(key, value);
  if (!idbBroken) {
    try {
      await set(key, value);
    } catch {
      idbBroken = true;
    }
  }
}

async function kvDel(key: string): Promise<void> {
  mem.delete(key);
  if (!idbBroken) {
    try {
      await del(key);
    } catch {
      idbBroken = true;
    }
  }
}

export interface Attempt {
  at: number;
  kind: 'recall' | 'exam';
  /** 0-100 composite score. */
  score: number;
  /** 0-1. */
  accuracy: number;
  timeSec: number;
  hints: number;
  /** Concept ids in the order they were placed (recall) – feeds Ghost Mode. */
  order?: string[];
}

export interface Meta {
  streak: number;
  /** Local calendar day (YYYY-MM-DD) of the last activity. */
  lastDay: string | null;
  achievements: Record<string, number>;
}

export const EMPTY_META: Meta = { streak: 0, lastDay: null, achievements: {} };

export async function listPalaces(): Promise<PalaceData[]> {
  return (await kvGet<PalaceData[]>('palaces')) ?? [];
}

export async function savePalace(p: PalaceData): Promise<void> {
  const all = await listPalaces();
  const i = all.findIndex((x) => x.id === p.id);
  if (i >= 0) all[i] = p;
  else all.unshift(p);
  await kvSet('palaces', all);
}

export async function deletePalace(id: string): Promise<void> {
  await kvSet(
    'palaces',
    (await listPalaces()).filter((p) => p.id !== id),
  );
  await kvDel(`cards:${id}`);
  await kvDel(`attempts:${id}`);
}

export async function loadCards(palaceId: string): Promise<Record<string, Card>> {
  return (await kvGet<Record<string, Card>>(`cards:${palaceId}`)) ?? {};
}

export async function saveCards(palaceId: string, cards: Record<string, Card>): Promise<void> {
  await kvSet(`cards:${palaceId}`, cards);
}

export async function loadAttempts(palaceId: string): Promise<Attempt[]> {
  return (await kvGet<Attempt[]>(`attempts:${palaceId}`)) ?? [];
}

export async function addAttempt(palaceId: string, a: Attempt): Promise<Attempt[]> {
  const all = [...(await loadAttempts(palaceId)), a].slice(-60);
  await kvSet(`attempts:${palaceId}`, all);
  return all;
}

export async function loadMeta(): Promise<Meta> {
  return { ...EMPTY_META, ...((await kvGet<Meta>('meta')) ?? {}) };
}

export async function saveMeta(m: Meta): Promise<void> {
  await kvSet('meta', m);
}

export const localDay = (t = Date.now()): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Register activity today; returns the updated meta (streak +1 on consecutive days, reset after a gap). */
export function touchStreak(meta: Meta, t = Date.now()): Meta {
  const today = localDay(t);
  if (meta.lastDay === today) return meta;
  const y = localDay(t - 86_400_000);
  return { ...meta, lastDay: today, streak: meta.lastDay === y ? meta.streak + 1 : 1 };
}
