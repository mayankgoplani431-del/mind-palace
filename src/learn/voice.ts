import type { Concept, Lang } from '../extract/types';

const LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => RecognitionLike;

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const voiceSupported = (): boolean => typeof window !== 'undefined' && !!ctor();

export type VoiceError = 'unsupported' | 'denied' | 'no-speech' | 'error';

/** Listens once; resolves with alternative transcripts (best first). Rejects with a VoiceError string. */
export function listenOnce(lang: Lang): Promise<string[]> {
  const C = ctor();
  if (!C) return Promise.reject<string[]>('unsupported' satisfies VoiceError);
  return new Promise((resolve, reject) => {
    const r = new C();
    r.lang = LOCALE[lang];
    r.interimResults = false;
    r.maxAlternatives = 4;
    let got = false;
    r.onresult = (e) => {
      got = true;
      const alts: string[] = [];
      for (const res of Array.from(e.results)) for (const a of Array.from(res)) alts.push(a.transcript);
      resolve(alts);
    };
    r.onerror = (e) => {
      const err: VoiceError =
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'denied'
          : e.error === 'no-speech'
            ? 'no-speech'
            : 'error';
      reject(err);
    };
    r.onend = () => {
      if (!got) reject('no-speech' satisfies VoiceError);
    };
    try {
      r.start();
    } catch {
      reject('error' satisfies VoiceError);
    }
  });
}

const ZERO_WIDTH = new RegExp('[' + String.fromCharCode(0x200b) + '-' + String.fromCharCode(0x200d) + String.fromCharCode(0xfeff) + ']', 'g');

export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(ZERO_WIDTH, '')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string[], b: string[]): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) (dp[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      (dp[i] as number[])[j] = Math.min(
        (dp[i - 1] as number[])[j]! + 1,
        (dp[i] as number[])[j - 1]! + 1,
        (dp[i - 1] as number[])[j - 1]! + cost,
      );
    }
  return (dp[a.length] as number[])[b.length] as number;
}

/** 0..1 similarity on grapheme-ish characters (Array.from keeps Devanagari code points intact). */
export function similarity(a: string, b: string): number {
  const x = Array.from(normalize(a));
  const y = Array.from(normalize(b));
  if (x.length === 0 || y.length === 0) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

export const VOICE_PASS = 0.6;

export interface VoiceMatch {
  score: number;
  pass: boolean;
  heard: string;
}

/** Fuzzy-match what was said against the concept's title and keywords. */
export function matchSpoken(heard: string[], concept: Pick<Concept, 'title' | 'keywords'>): VoiceMatch {
  let best = { score: 0, heard: heard[0] ?? '' };
  for (const h of heard) {
    const nh = normalize(h);
    let s = similarity(h, concept.title);
    const nt = normalize(concept.title);
    if (nt && nh.includes(nt)) s = Math.max(s, 0.95);
    for (const k of concept.keywords) {
      const nk = normalize(k);
      if (nk.length >= 3 && nh.includes(nk)) s = Math.max(s, 0.65);
      else s = Math.max(s, similarity(h, k) * 0.9);
    }
    if (s > best.score) best = { score: s, heard: h };
  }
  return { score: best.score, pass: best.score >= VOICE_PASS, heard: best.heard };
}
