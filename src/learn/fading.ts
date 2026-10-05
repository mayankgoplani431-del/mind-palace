import type { Card } from './srs';
import { DAY_MS } from './clock';

/** Days over which an overdue concept fades from 1 to 0 (at least 3, or the current interval). */
export function fadeWindowDays(card: Card): number {
  return Math.max(3, card.interval);
}

/**
 * The single 0..1 value that drives every visual: object saturation/opacity/glow, dust, pedestal dimming.
 * 1 until the due date, then linear decay over the fade window.
 */
export function freshness(card: Card, now: number): number {
  if (now <= card.due) return 1;
  const overdueDays = (now - card.due) / DAY_MS;
  return Math.max(0, 1 - overdueDays / fadeWindowDays(card));
}

export const FADED_BELOW = 0.75;
export const isFaded = (f: number): boolean => f < FADED_BELOW;

/** 0..1 mastery of one concept: interval progress towards ~3 weeks, weighted by freshness. */
export function mastery(card: Card, now: number): number {
  if (card.reps === 0) return 0;
  return Math.min(1, card.interval / 21) * (0.4 + 0.6 * freshness(card, now));
}
