import type { Grade } from '../learn/srs';

/** Seconds per item at/below which time scores full marks, and above which it scores zero. */
export const FAST_SEC_PER_ITEM = 8;
export const SLOW_SEC_PER_ITEM = 40;
/** After this many wrong placements of one object, a first-letter hint appears. */
export const HINT_AFTER_WRONG = 2;

export interface ItemState {
  id: string;
  title: string;
  wrong: number;
  hinted: boolean;
  placed: boolean;
  /** Tries it took to place it correctly (including the successful one). */
  tries: number;
  placedAtMs: number | null;
}

export type PlaceResult = { correct: true } | { correct: false; hint: string | null };

export interface RecallScore {
  /** 0..1: first try = 1, second = 0.6, later = 0.3, never = 0. */
  accuracy: number;
  timeSec: number;
  hints: number;
  /** 0..100 composite. */
  score: number;
  perfect: boolean;
}

export function firstLetter(title: string): string {
  return Array.from(title.trim())[0] ?? '?';
}

const POINTS = [1, 0.6, 0.3];

export function computeScore(items: ItemState[], timeSec: number): RecallScore {
  const n = Math.max(1, items.length);
  const pts = items.reduce((s, it) => s + (it.placed ? (POINTS[Math.min(it.tries, 3) - 1] ?? 0.3) : 0), 0);
  const accuracy = pts / n;
  const hints = items.filter((i) => i.hinted).length;
  const perItem = timeSec / n;
  const timeFactor = Math.min(
    1,
    Math.max(0, 1 - (perItem - FAST_SEC_PER_ITEM) / (SLOW_SEC_PER_ITEM - FAST_SEC_PER_ITEM)),
  );
  const raw = 70 * accuracy + 30 * timeFactor - 5 * hints;
  return {
    accuracy,
    timeSec,
    hints,
    score: Math.round(Math.min(100, Math.max(0, raw))),
    perfect: items.every((i) => i.placed && i.tries === 1 && !i.hinted),
  };
}

/** Pure state for one Recall Test; the 3D drag & drop just calls `place`. */
export class RecallSession {
  readonly items = new Map<string, ItemState>();
  readonly order: string[] = [];
  private readonly started: number;
  private ended: number | null = null;

  constructor(concepts: Array<{ id: string; title: string }>, now: number) {
    for (const c of concepts) {
      this.items.set(c.id, {
        id: c.id,
        title: c.title,
        wrong: 0,
        hinted: false,
        placed: false,
        tries: 0,
        placedAtMs: null,
      });
    }
    this.started = now;
  }

  /** Try to put object `objectId` on the locus that belongs to `locusId`. */
  place(objectId: string, locusId: string, now: number): PlaceResult {
    const it = this.items.get(objectId);
    if (!it || it.placed) return { correct: false, hint: null };
    it.tries += 1;
    if (objectId === locusId) {
      it.placed = true;
      it.placedAtMs = now - this.started;
      this.order.push(objectId);
      if (this.done) this.ended = now;
      return { correct: true };
    }
    it.wrong += 1;
    if (it.wrong >= HINT_AFTER_WRONG) {
      it.hinted = true;
      return { correct: false, hint: firstLetter(it.title) };
    }
    return { correct: false, hint: null };
  }

  /** Hint text for an object after enough misses (keeps showing it). */
  hintFor(objectId: string): string | null {
    const it = this.items.get(objectId);
    return it?.hinted ? firstLetter(it.title) : null;
  }

  get done(): boolean {
    return [...this.items.values()].every((i) => i.placed);
  }

  get remaining(): number {
    return [...this.items.values()].filter((i) => !i.placed).length;
  }

  finish(now: number): RecallScore {
    this.ended ??= now;
    return computeScore([...this.items.values()], Math.max(0, (this.ended - this.started) / 1000));
  }

  /** SM-2 grade per concept from how placement went. */
  grades(): Map<string, Grade> {
    const n = Math.max(1, this.items.size);
    const total = (this.ended ?? this.started) - this.started;
    const fast = total / 1000 / n <= 6;
    const out = new Map<string, Grade>();
    for (const it of this.items.values()) {
      if (!it.placed || it.tries > 2) out.set(it.id, 'again');
      else if (it.tries === 2 || it.hinted) out.set(it.id, 'hard');
      else out.set(it.id, fast ? 'easy' : 'good');
    }
    return out;
  }
}
