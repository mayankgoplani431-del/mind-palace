export const DAY_MS = 86_400_000;

/** Debug "time travel": a virtual offset (in days) added to the real clock for spaced-repetition maths. */
let offsetDays = 0;

export function setTimeOffsetDays(d: number): void {
  offsetDays = d;
}

export function getTimeOffsetDays(): number {
  return offsetDays;
}

/** Virtual "now" used by SRS and fading. Streaks use the real clock. */
export function now(): number {
  return Date.now() + offsetDays * DAY_MS;
}
