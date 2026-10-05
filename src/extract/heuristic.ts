import type { Concept, ConceptExtractor, ExtractOptions, ExtractResult, Lang } from './types';
import { STOPWORDS } from './stopwords';
import { getObjectDef } from '../objects/library';
import { assignObjects } from './objectmatch';
import { tokenize } from '../input/language-detect';
import { clipWords, toUnits, wordCount } from '../input/text';
import { hashString, mulberry32, shuffled } from '../palace/rng';

export const MAX_CONCEPTS_PER_ROOM = 8;

const isDev = (s: string): boolean => /[ऀ-ॿ]/.test(s);

function isStop(tok: string, lang: Lang): boolean {
  const t = tok.toLowerCase();
  return STOPWORDS[lang].has(t) || STOPWORDS.en.has(t);
}

function isContent(tok: string, lang: Lang): boolean {
  if (/^\p{Nd}+$/u.test(tok)) return false;
  if (isStop(tok, lang)) return false;
  return tok.length >= (isDev(tok) ? 2 : 3);
}

/** Light stemming so "atoms"/"atom" count together. Devanagari tokens are used as-is. */
function stem(tok: string): string {
  const t = tok.toLowerCase();
  if (isDev(t)) return t;
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is'))
    return t.slice(0, -1);
  return t;
}

interface Derived {
  title: string;
  rest: string;
  def: boolean;
}

const EN_SKIP_START =
  /^(it|this|that|these|those|they|he|she|we|there|which|who|when|where|what|in|on|at|for|if|as|after|before|during|with|by)\b/i;

function cleanTitle(t: string, lang: Lang): string {
  let s = t
    .replace(/^[\s"'“”‘’([]+|[\s"'“”‘’)\],.;:।॥-]+$/g, '')
    .replace(/^(the|a|an)\s+/i, '')
    .trim();
  if (wordCount(s) > 8) s = s.split(/\s+/).slice(0, 8).join(' ');
  if (s.length > 60) s = s.slice(0, 57).trimEnd() + '…';
  return lang === 'en' && s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function deriveTitle(sentence: string, lang: Lang, tf: Map<string, number>): Derived {
  const s = sentence.replace(/[।॥.!?]+$/g, '').trim();

  // "Term: definition", "Term — definition"
  const a = /^(.{2,70}?)\s*(?::|—|–|\s-\s)\s*(.{8,})$/.exec(s);
  if (a && wordCount(a[1] as string) <= 7 && !/[?]$/.test(a[1] as string)) {
    return { title: cleanTitle(a[1] as string, lang), rest: (a[2] as string).trim(), def: true };
  }

  if (lang === 'en') {
    const b =
      /^(.{2,60}?)\s+(?:is|are|was|were|refers to|means|describes|states|can be defined as|is called|are called)\s+(.+)$/i.exec(
        s,
      );
    if (b && !EN_SKIP_START.test(b[1] as string) && wordCount(b[1] as string) <= 6) {
      return { title: cleanTitle(b[1] as string, lang), rest: s, def: true };
    }
    const c = /\b(?:is|are) (?:called|known as|termed)\s+(?:the\s+)?(.{2,40}?)(?:[,;]|$)/i.exec(s);
    if (c) return { title: cleanTitle(c[1] as string, lang), rest: s, def: true };
  } else if (lang === 'hi') {
    const k = /\s+को\s+(.{2,40}?)\s+(?:कहते हैं|कहते है|कहा जाता है|कहलाता है|कहलाती है|कहलाते हैं)/u.exec(s);
    if (k) return { title: cleanTitle(k[1] as string, lang), rest: s, def: true };
    const h = /^(.{2,40}?)\s+(?:वह|वे|यह|एक|ऐसी|ऐसा|ऐसे)\s+/u.exec(s);
    if (h && wordCount(h[1] as string) <= 4 && /(?:है|हैं|कहलाता|कहलाती)(?:\s|$)/u.test(s)) {
      return { title: cleanTitle(h[1] as string, lang), rest: s, def: true };
    }
  } else {
    const k = /\s+ला\s+(.{2,40}?)\s+म्हणतात/u.exec(s);
    if (k) return { title: cleanTitle(k[1] as string, lang), rest: s, def: true };
    const m = /^(.{2,40}?)\s+(?:म्हणजे|हे|ही|हा|ते|ती|तो|आहे|आहेत)\s+/u.exec(s);
    if (m && wordCount(m[1] as string) <= 4 && /(?:आहे|आहेत|म्हणजे|म्हणतात)(?:\s|$)/u.test(s)) {
      return { title: cleanTitle(m[1] as string, lang), rest: s, def: true };
    }
  }

  // fallback: the most frequent content word, plus adjacent strong neighbours
  const toks = tokenize(s);
  let bestI = -1;
  let bestTf = -1;
  toks.forEach((t, i) => {
    if (!isContent(t, lang)) return;
    const f = tf.get(stem(t)) ?? 0;
    if (f > bestTf) {
      bestTf = f;
      bestI = i;
    }
  });
  if (bestI < 0) return { title: cleanTitle(toks.slice(0, 3).join(' ') || s, lang), rest: s, def: false };
  let lo = bestI;
  let hi = bestI;
  const strong = (i: number): boolean => {
    const t = toks[i];
    if (t === undefined || !isContent(t, lang)) return false;
    return (tf.get(stem(t)) ?? 0) >= 2 || /^\p{Lu}/u.test(t);
  };
  while (hi - lo < 2 && strong(hi + 1)) hi++;
  while (hi - lo < 2 && strong(lo - 1)) lo--;
  return { title: cleanTitle(toks.slice(lo, hi + 1).join(' '), lang), rest: s, def: false };
}

const MNEMONICS: Record<Lang, string[]> = {
  en: [
    'Imagine a giant {o} here – every time it moves, it whispers “{t}”.',
    'See a glowing {o} standing guard; it stands for “{t}”.',
    'The {o} on this pedestal makes you recall: {t}.',
    'Touch the {o} and a booming voice announces: “{t}!”',
  ],
  hi: [
    'कल्पना कीजिए: यहाँ एक चमकता हुआ {o} है जो फुसफुसाता है — “{t}”।',
    'एक विशाल {o} की कल्पना करें; वह “{t}” का प्रतीक है।',
    'इस चबूतरे पर रखा {o} देखिए और याद कीजिए: {t}।',
    '{o} को छूते ही गूँजती आवाज़ आती है: “{t}!”',
  ],
  mr: [
    'कल्पना करा: इथे एक चमकणारा {o} आहे आणि तो कानात सांगतो — “{t}”.',
    'एका अवाढव्य {o} ची कल्पना करा; तो “{t}” चे प्रतीक आहे.',
    'या चौथऱ्यावरील {o} पहा आणि आठवा: {t}.',
    '{o} ला स्पर्श करताच आवाज घुमतो: “{t}!”',
  ],
};

const QUESTION: Record<Lang, string> = {
  en: 'Which concept does this describe?',
  hi: 'यह किस अवधारणा का वर्णन है?',
  mr: 'हे कोणत्या संकल्पनेचे वर्णन आहे?',
};

const FILLER: Record<Lang, string[]> = {
  en: ['None of these', 'All of these', 'Cannot be determined'],
  hi: ['इनमें से कोई नहीं', 'ये सभी', 'निर्धारित नहीं किया जा सकता'],
  mr: ['यापैकी कोणतेही नाही', 'हे सर्व', 'ठरवता येत नाही'],
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mask(summary: string, title: string): string {
  try {
    return summary.replace(new RegExp(escapeRe(title), 'giu'), '____');
  } catch {
    return summary;
  }
}

export function buildMnemonic(objName: string, title: string, lang: Lang, salt: string): string {
  const tpl = MNEMONICS[lang][hashString(salt) % MNEMONICS[lang].length] as string;
  const obj = lang === 'en' ? objName.toLowerCase() : objName;
  return tpl.replace('{o}', obj).replace('{t}', title);
}

interface Cand {
  idx: number;
  text: string;
  title: string;
  summary: string;
  def: boolean;
  tokens: string[];
  score: number;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

/** Make 4 distinct options with the right answer at a seeded-random position. */
export function makeQuizOptions(
  correct: string,
  pool: string[],
  lang: Lang,
  seed: string,
): { options: string[]; answerIndex: number } {
  const rng = mulberry32(hashString(seed));
  const seen = new Set<string>([correct.toLowerCase()]);
  const distractors: string[] = [];
  for (const p of shuffled(pool, rng)) {
    const k = p.toLowerCase();
    if (!seen.has(k) && p.trim()) {
      seen.add(k);
      distractors.push(p);
    }
    if (distractors.length === 3) break;
  }
  for (const f of FILLER[lang]) {
    if (distractors.length === 3) break;
    if (!seen.has(f.toLowerCase())) distractors.push(f);
  }
  const options = shuffled([correct, ...distractors], rng);
  return { options, answerIndex: options.indexOf(correct) };
}

export interface HeuristicOptions extends ExtractOptions {
  /** Titles from other rooms, used as extra quiz distractors when a room is small. */
  extraTitles?: string[];
}

export function extractHeuristic(text: string, opts: HeuristicOptions): ExtractResult {
  const lang = opts.lang;
  const prefix = opts.idPrefix ?? 'c';
  const units = toUnits(text);
  const heading = units.find((u) => u.kind === 'heading')?.text ?? null;
  const sents = units.filter((u) => u.kind === 'sentence' && wordCount(u.text) >= 3);
  if (sents.length === 0) throw new Error('Not enough text to find any concepts.');

  // term frequency over the whole section
  const tf = new Map<string, number>();
  for (const u of sents)
    for (const t of tokenize(u.text)) if (isContent(t, lang)) tf.set(stem(t), (tf.get(stem(t)) ?? 0) + 1);

  const cands: Cand[] = sents.map((u, idx) => {
    const d = deriveTitle(u.text, lang, tf);
    const toks = tokenize(u.text).filter((t) => isContent(t, lang));
    const uniq = new Set(toks.map(stem));
    let score = 0;
    for (const st of uniq) score += 1 + Math.log(tf.get(st) ?? 1);
    score /= Math.sqrt(toks.length + 4);
    if (d.def) score += 2;
    if (u.bold) score += 1.5;
    if (/\d/.test(u.text)) score += 0.3;
    const wc = wordCount(u.text);
    if (wc < 5) score -= 1;
    if (wc > 45) score -= 1;
    return {
      idx,
      text: u.text,
      title: d.title,
      summary: clipWords(d.rest, 25),
      def: d.def,
      tokens: [...uniq],
      score,
    };
  });

  const target = cands.length <= MAX_CONCEPTS_PER_ROOM ? cands.length : MAX_CONCEPTS_PER_ROOM;
  const chosen: Cand[] = [];
  const titles = new Set<string>();
  for (const c of [...cands].sort((a, b) => b.score - a.score || a.idx - b.idx)) {
    if (chosen.length >= target) break;
    const tk = c.title.toLowerCase();
    if (!tk || titles.has(tk)) continue;
    const set = new Set(c.tokens);
    if (chosen.some((o) => jaccard(set, new Set(o.tokens)) > 0.6)) continue;
    titles.add(tk);
    chosen.push(c);
  }
  chosen.sort((a, b) => a.idx - b.idx);

  const kws = chosen.map((c) => {
    const sentenceToks = tokenize(c.text).filter((t) => isContent(t, lang));
    const titleToks = new Set(tokenize(c.title.toLowerCase()).map(stem));
    const ranked = [...new Set(sentenceToks.map((t) => t.toLowerCase()))].sort(
      (x, y) => (tf.get(stem(y)) ?? 0) - (tf.get(stem(x)) ?? 0),
    );
    const keywords = ranked.filter((t) => !titleToks.has(stem(t))).slice(0, 4);
    if (keywords.length < 2)
      keywords.push(
        ...tokenize(c.title)
          .filter((t) => isContent(t, lang))
          .slice(0, 2),
      );
    if (keywords.length === 0) keywords.push(c.title);
    return keywords;
  });
  const keys = assignObjects(
    chosen.map((c, i) => ({
      title: c.title,
      keywords: kws[i] as string[],
      sentence: c.text,
      salt: `${prefix}${i}${c.title}`,
    })),
    lang,
  );
  const concepts: Concept[] = chosen.map((c, i) => {
    const objectKey = keys[i] as string;
    const def = getObjectDef(objectKey);
    const id = `${prefix}c${i + 1}`;
    return {
      id,
      title: c.title,
      summary: c.summary,
      keywords: [...new Set(kws[i] as string[])].slice(0, 6),
      objectKey,
      mnemonic: buildMnemonic(def.name[lang], c.title, lang, id + c.title),
      quiz: { question: '', options: [], answerIndex: 0 },
    };
  });

  // quizzes need all titles for distractors
  const allTitles = concepts.map((c) => c.title);
  for (const c of concepts) {
    const pool = [
      ...allTitles.filter((t) => t !== c.title),
      ...(opts.extraTitles ?? []).filter((t) => t !== c.title),
      ...concepts.filter((o) => o !== c).flatMap((o) => o.keywords.slice(0, 1)),
    ];
    const { options, answerIndex } = makeQuizOptions(c.title, pool, lang, `${prefix}${c.id}quiz`);
    c.quiz = {
      question: `${QUESTION[lang]} “${clipWords(mask(c.summary, c.title), 20)}”`,
      options,
      answerIndex,
    };
  }

  const topic =
    heading ??
    (() => {
      const top = [...tf.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      const t = tokenize(text).find((w) => stem(w) === top) ?? concepts[0]?.title ?? 'Notes';
      return lang === 'en' ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    })();

  return { topic, language: lang, concepts };
}

export class HeuristicExtractor implements ConceptExtractor {
  readonly name = 'offline-heuristic';
  private readonly extraTitles: string[];
  constructor(extraTitles: string[] = []) {
    this.extraTitles = extraTitles;
  }
  async extract(text: string, opts: ExtractOptions): Promise<ExtractResult> {
    return extractHeuristic(text, { ...opts, extraTitles: this.extraTitles });
  }
}
