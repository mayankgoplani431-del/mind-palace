import type { Meta } from '../storage/db';

export type AchievementId = 'first_palace' | 'streak3' | 'perfect_recall' | 'speed_runner';

export const ACHIEVEMENTS: Array<{ id: AchievementId; icon: string }> = [
  { id: 'first_palace', icon: '🏛️' },
  { id: 'streak3', icon: '🔥' },
  { id: 'perfect_recall', icon: '🎯' },
  { id: 'speed_runner', icon: '⚡' },
];

/** Returns the updated meta if the achievement is new, else null. */
export function unlock(meta: Meta, id: AchievementId, now = Date.now()): Meta | null {
  if (meta.achievements[id]) return null;
  return { ...meta, achievements: { ...meta.achievements, [id]: now } };
}

/** Achievements that follow from the streak alone. */
export function streakAchievements(meta: Meta): AchievementId[] {
  return meta.streak >= 3 ? ['streak3'] : [];
}
