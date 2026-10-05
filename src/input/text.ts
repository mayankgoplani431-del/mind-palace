/** Pure text utilities: sentence splitting (incl. the Devanagari danda), line classification, sectioning. */

export type UnitKind = 'heading' | 'sentence';

export interface Unit {
  text: string;
  kind: UnitKind;
  /** The source line contained **bold** / __bold__ markup (a hint that the term is important). */
  bold: boolean;
  /** Index of the paragraph (blank-line separated block) this unit came from. */
  para: number;
}

export interface Section {
  heading: string | null;
  units: Unit[];
}

const ABBREV = new Set([
  'dr',
  'mr',
  'mrs',
  'ms',
  'prof',
  'st',
  'sr',
  'jr',
  'vs',
  'etc',
  'fig',
  'no',
  'eg',
  'ie',
  'cf',
  'approx',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
  'ca',
]);

/**
 * Splits running text into sentences. Always splits on the danda (।) and double danda (॥);
 * splits on . ! ? only when followed by whitespace and the preceding token is not a known abbreviation.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  const chars = Array.from(text.replace(/\s+/g, ' ').trim());
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] as string;
    buf += ch;
    if (ch === '।' || ch === '॥') {
      // swallow closing quotes/brackets directly after
      while (chars[i + 1] === '"' || chars[i + 1] === '”' || chars[i + 1] === ')') buf += chars[++i];
      push(out, buf);
      buf = '';
    } else if (ch === '.' || ch === '!' || ch === '?') {
      const next = chars[i + 1];
      if (next !== undefined && next !== ' ') continue; // 3.14, e.g., U.S.A
      // absorb closing quote
      const prevWord = (buf.match(/([A-Za-z]+)\.$/)?.[1] ?? '').toLowerCase();
      if (ch === '.' && (ABBREV.has(prevWord) || /(?:^|[\s(])(?:[A-Za-z]\.){2,}$/.test(buf))) continue;
      const after = chars[i + 2];
      if (after !== undefined && ch === '.' && /[a-z]/.test(after)) continue; // "e.g. something"
      push(out, buf);
      buf = '';
    }
  }
  push(out, buf);
  return out;
}

function push(out: string[], s: string): void {
  const t = s.trim();
  if (t.length > 1 && /[\p{L}\p{N}]/u.test(t)) out.push(t);
}

const TERMINAL = /[.!?।॥:;,]["')”]?$/;
const BULLET = /^\s*(?:[-*•▪◦●‣·]|\d{1,2}[.)]|[a-z][.)])\s+/;

function stripMarkdown(line: string): { text: string; bold: boolean } {
  const bold = /\*\*[^*]+\*\*|__[^_]+__/.test(line);
  const text = line
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/, '')
    .trim();
  return { text, bold };
}

function isHeadingLine(raw: string, prevBlank: boolean, nextLine: string | undefined): boolean {
  const t = raw.trim();
  if (/^#{1,6}\s+\S/.test(t)) return true;
  if (/^(\*\*|__)[^*_]{2,80}(\*\*|__):?$/.test(t)) return true;
  if (/^[A-Z0-9][A-Z0-9 &:,'-]{2,58}$/.test(t) && /[A-Z]{3}/.test(t)) return true;
  if (prevBlank && nextLine && nextLine.trim() && t.length <= 50 && !TERMINAL.test(t) && !BULLET.test(t)) {
    const words = t.split(/\s+/).length;
    if (words <= 7 && nextLine.trim().length > t.length) return true;
  }
  return false;
}

/** Turns raw notes into ordered units (headings + sentences), merging hard-wrapped lines. */
export function toUnits(raw: string): Unit[] {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const units: Unit[] = [];
  let para = 0;
  let prevBlank = true;
  let pending: { text: string; bold: boolean } | null = null;

  const flush = (): void => {
    if (!pending) return;
    for (const s of splitSentences(pending.text))
      units.push({ text: s, kind: 'sentence', bold: pending.bold, para });
    pending = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (!line.trim()) {
      flush();
      if (!prevBlank) para++;
      prevBlank = true;
      continue;
    }
    if (isHeadingLine(line, prevBlank, lines[i + 1])) {
      flush();
      const { text } = stripMarkdown(line.replace(/^\s*#{1,6}\s+/, ''));
      if (text) units.push({ text: text.replace(/[:：]$/, ''), kind: 'heading', bold: true, para });
      prevBlank = false;
      continue;
    }
    const isBullet = BULLET.test(line);
    const { text, bold } = stripMarkdown(line.replace(BULLET, ''));
    const joinable = pending && !isBullet && pending.text.length >= 55 && !TERMINAL.test(pending.text);
    if (pending && joinable) {
      pending.text += ' ' + text;
      pending.bold = pending.bold || bold;
    } else {
      flush();
      pending = { text, bold };
    }
    // bullets and short lines stand alone – flush immediately so they become their own unit
    if (isBullet || text.length < 55) flush();
    prevBlank = false;
  }
  flush();
  return units;
}

/** Groups units under headings. Content before the first heading becomes a headless section. */
export function toSections(units: Unit[]): Section[] {
  const out: Section[] = [];
  let cur: Section = { heading: null, units: [] };
  for (const u of units) {
    if (u.kind === 'heading') {
      if (cur.units.length || cur.heading) out.push(cur);
      cur = { heading: u.text, units: [] };
    } else cur.units.push(u);
  }
  if (cur.units.length || cur.heading) out.push(cur);
  return out.filter((s) => s.units.length > 0);
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Trims to at most `max` words, appending an ellipsis when cut. */
export function clipWords(s: string, max: number): string {
  const w = s.trim().split(/\s+/);
  if (w.length <= max) return s.trim();
  return (
    w
      .slice(0, max)
      .join(' ')
      .replace(/[,;:।-]+$/, '') + '…'
  );
}
