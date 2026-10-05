import type {
  ConceptExtractor,
  ExtractResult,
  Lang,
  LangChoice,
  PalaceData,
  RoomSpec,
  StyleKey,
} from './types';
import { HeuristicExtractor } from './heuristic';
import { LlmError, LlmExtractor, type Complete, type Fetch, type LlmConfig } from './llm/common';
import { anthropicComplete } from './llm/anthropic';
import { openaiComplete } from './llm/openai';
import { geminiComplete } from './llm/gemini';
import { validateExtract } from './validate';
import { assertEnoughNotes } from '../input/notes';
import { resolveLang } from '../input/language-detect';
import { toSections, toUnits, type Section, type Unit } from '../input/text';
import { hashString } from '../palace/rng';

export const MAX_ROOMS = 6;
const MIN_SENTENCES_PER_ROOM = 3;
const SPLIT_ABOVE = 16;
const CHUNK = 12;

export type EngineConfig = { kind: 'heuristic' } | { kind: 'llm'; cfg: LlmConfig };

export interface PlannedSection {
  heading: string | null;
  text: string;
  sentences: number;
}

function terminate(s: string, lang: Lang): string {
  return /[.!?।॥:;]["')”]?$/.test(s) ? s : s + (lang === 'en' ? '.' : '।');
}

function serialize(heading: string | null, units: Unit[], lang: Lang): string {
  const body = units
    .map((u) => (u.bold ? `**${terminate(u.text, lang)}**` : terminate(u.text, lang)))
    .join('\n');
  return heading ? `# ${heading}\n${body}` : body;
}

function chunk<T>(arr: T[], parts: number): T[][] {
  const size = Math.ceil(arr.length / parts);
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Splits notes into room-sized sections: by headings first, then by size. At most MAX_ROOMS. */
export function planSections(text: string, lang: Lang): PlannedSection[] {
  const units = toUnits(text);
  let sections: Section[] = toSections(units);
  if (sections.length === 0)
    sections = [{ heading: null, units: units.filter((u) => u.kind === 'sentence') }];

  // split oversized sections
  const split: Section[] = [];
  for (const s of sections) {
    if (s.units.length > SPLIT_ABOVE) {
      const parts = chunk(s.units, Math.ceil(s.units.length / CHUNK));
      parts.forEach((u, i) =>
        split.push({ heading: s.heading ? `${s.heading} (${i + 1}/${parts.length})` : null, units: u }),
      );
    } else split.push(s);
  }

  // merge tiny sections into the previous one (or the next if first)
  const merged: Section[] = [];
  for (const s of split) {
    const prev = merged[merged.length - 1];
    if (
      s.units.length < MIN_SENTENCES_PER_ROOM &&
      prev &&
      prev.units.length + s.units.length <= SPLIT_ABOVE
    ) {
      prev.units = [...prev.units, ...s.units];
    } else merged.push({ heading: s.heading, units: [...s.units] });
  }
  if (merged.length > 1 && (merged[0] as Section).units.length < MIN_SENTENCES_PER_ROOM) {
    const first = merged.shift() as Section;
    (merged[0] as Section).units = [...first.units, ...(merged[0] as Section).units];
  }
  // cap the number of rooms: merge the smallest adjacent pair until within the limit
  while (merged.length > MAX_ROOMS) {
    let best = 0;
    let bestSize = Infinity;
    for (let i = 0; i < merged.length - 1; i++) {
      const sz = (merged[i] as Section).units.length + (merged[i + 1] as Section).units.length;
      if (sz < bestSize) {
        bestSize = sz;
        best = i;
      }
    }
    const a = merged[best] as Section;
    const b = merged[best + 1] as Section;
    a.units = [...a.units, ...b.units];
    merged.splice(best + 1, 1);
  }
  return merged.map((s) => ({
    heading: s.heading,
    text: serialize(s.heading, s.units, lang),
    sentences: s.units.length,
  }));
}

const SCIENCE =
  /physic|chemi|science|atom|energy|force|electric|magnet|भौतिक|रसायन|विज्ञान|ऊर्जा|बल\b|विद्युत|चुंबक|चुंबकीय|ऊर्जा/i;
const HISTORY =
  /histor|empire|war|king|dynast|revolution|freedom|independ|इतिहास|साम्राज्य|युद्ध|राजा|स्वातंत्र्य|स्वतंत्रता|मराठ|लढा|क्रांति/i;
const NATURE =
  /biolog|plant|cell|animal|ecosystem|nature|geograph|environment|जीव|वनस्पती|पौधे|कोशिका|प्राणी|निसर्ग|भूगोल|पर्यावरण/i;

export function pickStyle(topic: string, text: string, seed: number): StyleKey {
  const probe = `${topic} ${text.slice(0, 2000)}`;
  const score = (re: RegExp): number => (probe.match(new RegExp(re.source, 'gi')) ?? []).length;
  const s = { lab: score(SCIENCE), temple: score(HISTORY), zen: score(NATURE) };
  const top = Object.entries(s).sort((a, b) => b[1] - a[1])[0] as [StyleKey, number];
  if (top[1] >= 2) return top[0];
  return (['temple', 'lab', 'zen'] as const)[seed % 3] as StyleKey;
}

export function completeFor(p: LlmConfig['provider']): Complete {
  return p === 'anthropic' ? anthropicComplete : p === 'openai' ? openaiComplete : geminiComplete;
}

export interface BuildWarning {
  kind: LlmError['kind'] | 'fallback';
  message: string;
}

export interface BuildOptions {
  langChoice: LangChoice;
  engine: EngineConfig;
  style?: StyleKey | 'auto';
  onProgress?: (done: number, total: number) => void;
  fetchImpl?: Fetch;
}

export interface BuildOutcome {
  palace: PalaceData;
  warnings: BuildWarning[];
}

/** Notes -> PalaceData. Never throws on engine trouble: LLM failures fall back to the offline engine. */
export async function buildPalace(text: string, opts: BuildOptions): Promise<BuildOutcome> {
  assertEnoughNotes(text);
  const lang = resolveLang(opts.langChoice, text);
  const sections = planSections(text, lang);
  const warnings: BuildWarning[] = [];

  const allHeuristic = new HeuristicExtractor();
  const primary: ConceptExtractor =
    opts.engine.kind === 'llm'
      ? new LlmExtractor(opts.engine.cfg, completeFor(opts.engine.cfg.provider), opts.fetchImpl)
      : allHeuristic;
  let llmOk = opts.engine.kind === 'llm';

  const results: ExtractResult[] = [];
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i] as PlannedSection;
    const idPrefix = `r${i + 1}`;
    opts.onProgress?.(i, sections.length);
    let res: ExtractResult | null = null;
    if (llmOk) {
      try {
        res = await primary.extract(sec.text, { lang, idPrefix });
      } catch (e) {
        llmOk = false; // don't keep hammering a broken key / offline network
        const err =
          e instanceof LlmError ? e : new LlmError('server', e instanceof Error ? e.message : String(e));
        warnings.push({ kind: err.kind, message: err.message });
      }
    }
    if (!res) {
      const others = sections.filter((_, j) => j !== i).flatMap((s) => (s.heading ? [s.heading] : []));
      res = await new HeuristicExtractor(others).extract(sec.text, { lang, idPrefix });
    }
    // every result passes the same strict schema, whichever engine made it
    const v = validateExtract(res);
    if (!v.ok) throw new Error(`Internal validation failed: ${v.error}`);
    results.push(v.value);
  }
  opts.onProgress?.(sections.length, sections.length);
  if (opts.engine.kind === 'llm' && !llmOk)
    warnings.push({ kind: 'fallback', message: 'Used the offline engine instead.' });

  const rooms: RoomSpec[] = results.map((r, i) => ({
    id: `r${i + 1}`,
    topic: (sections[i] as PlannedSection).heading ?? r.topic,
    concepts: r.concepts,
  }));
  const firstHeading = toUnits(text).find((u) => u.kind === 'heading')?.text;
  const topic =
    rooms.length === 1 ? (rooms[0] as RoomSpec).topic : (firstHeading ?? (rooms[0] as RoomSpec).topic);
  const seed = hashString(`${lang}|${text.trim()}`);
  const style = !opts.style || opts.style === 'auto' ? pickStyle(topic, text, seed) : opts.style;
  const palace: PalaceData = {
    version: 1,
    id: `p${seed.toString(36)}`,
    topic,
    language: lang,
    seed,
    style,
    rooms,
    createdAt: Date.now(),
    engine: llmOk && opts.engine.kind === 'llm' ? primary.name : allHeuristic.name,
  };
  return { palace, warnings };
}
