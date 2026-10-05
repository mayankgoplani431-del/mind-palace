import type { Card } from './srs';
import { freshness, isFaded } from './fading';

export interface Quest {
  conceptId: string;
  freshness: number;
}

/** "Refresh quests": every concept whose object has faded, most faded first. */
export function refreshQuests(cards: ReadonlyMap<string, Card>, now: number): Quest[] {
  const out: Quest[] = [];
  for (const [id, card] of cards) {
    const f = freshness(card, now);
    if (isFaded(f)) out.push({ conceptId: id, freshness: f });
  }
  return out.sort((a, b) => a.freshness - b.freshness);
}
