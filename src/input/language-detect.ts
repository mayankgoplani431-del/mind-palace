import type { Lang, LangChoice } from '../extract/types';

const DEVANAGARI = /[ऀ-ॿ]/g;
const LATIN = /[A-Za-z]/g;

/** Words that are (nearly) exclusive to Marathi. */
const MARATHI_MARKERS = new Set([
  'आहे',
  'आहेत',
  'आणि',
  'मध्ये',
  'नाही',
  'होते',
  'होती',
  'झाले',
  'झाली',
  'झाला',
  'केले',
  'केली',
  'केला',
  'म्हणतात',
  'म्हणजे',
  'म्हणून',
  'त्यांनी',
  'त्याने',
  'तिने',
  'येथे',
  'किंवा',
  'परंतु',
  'असे',
  'असतो',
  'असते',
  'असतात',
  'त्याचे',
  'त्यांचे',
  'हे',
  'च्या',
  'चा',
  'ची',
  'चे',
  'ना',
  'तर',
  'पण',
  'सर्व',
  'वर',
  'ते',
  'नंतर',
  'तसेच',
  'कारण',
  'जेव्हा',
  'तेव्हा',
  'करतात',
  'होतो',
  'होतात',
  'शकते',
  'शकतो',
  'लागते',
  'पाहिजे',
  'दिले',
  'घेतले',
  'स्थापन',
  'मिळवले',
]);

/** Words that are (nearly) exclusive to Hindi. */
const HINDI_MARKERS = new Set([
  'है',
  'हैं',
  'और',
  'में',
  'नहीं',
  'था',
  'थी',
  'थे',
  'किया',
  'की',
  'के',
  'का',
  'को',
  'से',
  'पर',
  'यह',
  'वह',
  'इस',
  'उस',
  'एक',
  'भी',
  'लिए',
  'साथ',
  'द्वारा',
  'कहते',
  'कहलाता',
  'कहलाती',
  'होता',
  'होती',
  'होते',
  'करते',
  'करता',
  'करती',
  'जाता',
  'जाती',
  'जाते',
  'जिसमें',
  'जिसे',
  'जो',
  'तथा',
  'लेकिन',
  'अपने',
  'उनके',
  'सकता',
  'सकती',
  'चाहिए',
  'बाद',
  'कहा',
  'गया',
  'गई',
  'गए',
]);

// Some tokens occur in both; give the unique ones more weight.
const SHARED = new Set(['होता', 'होती', 'होते', 'करते', 'सर्व']);

export function tokenize(text: string): string[] {
  return text.match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
}

/** Script-level + marker-level detection. Returns 'en' for empty/unknown text. */
export function detectLanguage(text: string): Lang {
  const sample = text.slice(0, 20000);
  const dev = (sample.match(DEVANAGARI) ?? []).length;
  const lat = (sample.match(LATIN) ?? []).length;
  if (dev === 0 || dev < lat * 0.5) return 'en';

  let mr = 0;
  let hi = 0;
  for (const tok of tokenize(sample)) {
    const w = SHARED.has(tok) ? 0.3 : 1;
    if (MARATHI_MARKERS.has(tok)) mr += w;
    if (HINDI_MARKERS.has(tok)) hi += w;
  }
  // Strongest single tells: आहे/आहेत (mr) vs है/हैं (hi) are in the lists above; weight them a bit more.
  const aahe = (sample.match(/आहे/g) ?? []).length;
  const hai = (sample.match(/(^|\s)हैं?(\s|[।.,]|$)/gu) ?? []).length;
  mr += aahe * 0.5;
  hi += hai * 0.5;
  return mr > hi ? 'mr' : 'hi';
}

export function resolveLang(choice: LangChoice, text: string): Lang {
  return choice === 'auto' ? detectLanguage(text) : choice;
}
