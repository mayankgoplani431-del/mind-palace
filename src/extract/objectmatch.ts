import type { Lang } from './types';
import { OBJECTS } from '../objects/library';
import { OBJECT_KEYS, FALLBACK_OBJECT_KEY } from '../objects/keys';
import { hashString } from '../palace/rng';
import { tokenize } from '../input/language-detect';

function matchScore(term: string, tag: string): number {
  if (term === tag) return 1;
  if (tag.includes(' ')) return 0; // phrases are checked separately
  const min = Math.min(term.length, tag.length);
  if (min >= 4 && (term.startsWith(tag) || tag.startsWith(term))) return 0.6;
  return 0;
}

/**
 * Keyword -> object matching. `title` counts double, `keywords` 1.5x, other sentence words 1x.
 * Objects already used in the room are skipped so every locus has a distinct picture; if nothing
 * matches, fall back to a deterministic hash of `salt` (never random, so palaces are reproducible).
 */
export function rankObjects(
  title: string,
  keywords: string[],
  sentence: string,
  lang: Lang,
): Array<{ key: string; score: number }> {
  const weighted = new Map<string, number>();
  const add = (s: string, w: number): void => {
    for (const t of tokenize(s.toLowerCase())) weighted.set(t, Math.max(weighted.get(t) ?? 0, w));
  };
  add(sentence, 1);
  keywords.forEach((k) => add(k, 1.5));
  add(title, 2);
  const haystack = ` ${[title, ...keywords, sentence].join(' ').toLowerCase()} `;

  const scored: Array<{ key: string; score: number }> = [];
  for (const def of OBJECTS) {
    if (def.key === FALLBACK_OBJECT_KEY) continue;
    let score = 0;
    const tagSets: Array<[string[], number]> = [[def.tags[lang], 1]];
    if (lang !== 'en') tagSets.push([def.tags.en, 0.6]);
    else tagSets.push([def.tags.hi, 0.0], [def.tags.mr, 0.0]);
    for (const [tags, mult] of tagSets) {
      if (mult === 0) continue;
      for (const raw of tags) {
        const tag = raw.toLowerCase();
        if (tag.includes(' ')) {
          if (haystack.includes(` ${tag}`)) score += 1.5 * mult;
          continue;
        }
        for (const [term, w] of weighted) score += matchScore(term, tag) * w * mult;
      }
    }
    // the object's own name in the notes is a strong signal
    for (const nm of [def.name[lang].toLowerCase(), def.key]) {
      if (nm && weighted.has(nm)) score += 3;
    }
    if (score > 0) scored.push({ key: def.key, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
  return scored.filter((s) => s.score >= 1);
}

/** Deterministic fallback: hash `salt` into the catalogue, probing past objects already used. */
export function hashObjectKey(used: ReadonlySet<string>, salt: string): string {

  const pool = OBJECT_KEYS.filter((k) => k !== FALLBACK_OBJECT_KEY);
  const start = hashString(salt) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const k = pool[(start + i) % pool.length] as string;
    if (!used.has(k)) return k;
  }
  return FALLBACK_OBJECT_KEY;
}

/** Single-concept convenience: best unused match, else the hash fallback. */
export function pickObjectKey(
  title: string,
  keywords: string[],
  sentence: string,
  lang: Lang,
  used: ReadonlySet<string>,
  salt: string,
): string {
  const best = rankObjects(title, keywords, sentence, lang).find((r) => !used.has(r.key));
  return best ? best.key : hashObjectKey(used, salt);
}

/** Assign objects to many concepts at once: strongest (concept, object) pairs win, so "Battery" gets the battery. */
export function assignObjects(
  items: Array<{ title: string; keywords: string[]; sentence: string; salt: string }>,
  lang: Lang,
): string[] {
  const pairs: Array<{ i: number; key: string; score: number }> = [];
  items.forEach((it, i) => rankObjects(it.title, it.keywords, it.sentence, lang).forEach((r) => pairs.push({ i, key: r.key, score: r.score })));
  pairs.sort((a, b) => b.score - a.score || a.i - b.i);
  const out: Array<string | undefined> = new Array(items.length).fill(undefined);
  const used = new Set<string>();
  for (const p of pairs) {
    if (out[p.i] !== undefined || used.has(p.key)) continue;
    out[p.i] = p.key;
    used.add(p.key);
  }
  return out.map((k, i) => {
    if (k) return k;
    const h = hashObjectKey(used, items[i]!.salt);
    used.add(h);
    return h;
  });
}
