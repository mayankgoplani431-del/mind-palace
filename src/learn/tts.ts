import type { Lang } from '../extract/types';

const LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

export const ttsSupported = (): boolean => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

let cachedVoices: SpeechSynthesisVoice[] = [];

function voices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return [];
  const v = speechSynthesis.getVoices();
  if (v.length) cachedVoices = v;
  return cachedVoices;
}

if (ttsSupported()) {
  speechSynthesis.addEventListener?.('voiceschanged', () => void voices());
  voices();
}

/** Best voice for the language: en-IN / hi-IN / mr-IN first, then any voice of that language. */
export function findVoice(lang: Lang): SpeechSynthesisVoice | null {
  const all = voices();
  const want = LOCALE[lang].toLowerCase();
  return (
    all.find((v) => v.lang.toLowerCase().replace('_', '-') === want) ??
    all.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
    null
  );
}

export type SpeakResult = 'spoken' | 'no-voice' | 'unsupported' | 'error';

/** Speaks text. If no voice exists for hi/mr the utterance is still tried with the locale, result 'no-voice' lets the UI say so. */
export function speak(text: string, lang: Lang): Promise<SpeakResult> {
  if (!ttsSupported()) return Promise.resolve('unsupported');
  stopSpeaking();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const voice = findVoice(lang);
    u.lang = LOCALE[lang];
    if (voice) u.voice = voice;
    u.rate = 0.95;
    let done = false;
    const finish = (r: SpeakResult): void => {
      if (!done) {
        done = true;
        resolve(r);
      }
    };
    u.onend = () => finish(voice || lang === 'en' ? 'spoken' : 'no-voice');
    u.onerror = () => finish('error');
    // some engines never fire end for unsupported locales
    window.setTimeout(() => finish(voice ? 'spoken' : 'no-voice'), Math.max(4000, text.length * 120));
    try {
      speechSynthesis.speak(u);
    } catch {
      finish('error');
    }
  });
}

export function stopSpeaking(): void {
  if (ttsSupported()) speechSynthesis.cancel();
}
