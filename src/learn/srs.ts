import { DAY_MS } from './clock';

/** SM-2 card state, one per concept. `interval` is in days. */
export interface Card {
  id: string;
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  /** Timestamp (ms) when the concept is next due. */
  due: number;
  last: number | null;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

/** SM-2 quality scores 0-5 for our four buttons. */
export const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export const MIN_EASE = 1.3;
export const START_EASE = 2.5;

/** A brand-new card is due one day after creation (so a fresh palace starts out glowing). */
export function newCard(id: string, now: number): Card {
  return { id, ease: START_EASE, interval: 0, reps: 0, lapses: 0, due: now + DAY_MS, last: null };
}

/** Classic SuperMemo-2 update. Pure: returns a new card. */
export function review(card: Card, grade: Grade, now: number): Card {
  const q = QUALITY[grade];
  let { ease, interval, reps, lapses } = card;
  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    reps += 1;
  }
  ease = Math.max(MIN_EASE, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { id: card.id, ease, interval, reps, lapses, due: now + interval * DAY_MS, last: now };
}

/** Map a quiz result to a grade: wrong = again; right = good/easy depending on speed and hints. */
export function gradeFromQuiz(correct: boolean, fast: boolean, usedHint: boolean): Grade {
  if (!correct) return 'again';
  if (usedHint) return 'hard';
  return fast ? 'easy' : 'good';
}
