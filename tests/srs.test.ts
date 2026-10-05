import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../src/learn/clock';
import { MIN_EASE, gradeFromQuiz, newCard, review } from '../src/learn/srs';
import { freshness, isFaded, mastery } from '../src/learn/fading';
import { refreshQuests } from '../src/learn/quests';

const T0 = 1_700_000_000_000;

describe('SM-2 scheduling', () => {
  it('follows the 1 -> 6 -> interval*ease progression on good reviews', () => {
    let c = newCard('a', T0);
    c = review(c, 'good', T0);
    expect(c.interval).toBe(1);
    expect(c.reps).toBe(1);
    c = review(c, 'good', T0 + DAY_MS);
    expect(c.interval).toBe(6);
    const before = c.ease;
    c = review(c, 'good', T0 + 7 * DAY_MS);
    expect(c.interval).toBe(Math.round(6 * before));
    expect(c.due).toBe(T0 + 7 * DAY_MS + c.interval * DAY_MS);
  });
  it('resets reps and interval on a lapse and never drops ease below 1.3', () => {
    let c = newCard('a', T0);
    c = review(review(review(c, 'good', T0), 'good', T0), 'good', T0);
    c = review(c, 'again', T0);
    expect(c.reps).toBe(0);
    expect(c.interval).toBe(1);
    expect(c.lapses).toBe(1);
    for (let i = 0; i < 30; i++) c = review(c, 'again', T0);
    expect(c.ease).toBe(MIN_EASE);
  });
  it('easy raises ease, hard lowers it slightly, good keeps it', () => {
    const c = newCard('a', T0);
    expect(review(c, 'easy', T0).ease).toBeCloseTo(2.6);
    expect(review(c, 'good', T0).ease).toBeCloseTo(2.5);
    expect(review(c, 'hard', T0).ease).toBeCloseTo(2.36);
  });
  it('maps quiz results to grades', () => {
    expect(gradeFromQuiz(false, true, false)).toBe('again');
    expect(gradeFromQuiz(true, true, false)).toBe('easy');
    expect(gradeFromQuiz(true, false, false)).toBe('good');
    expect(gradeFromQuiz(true, true, true)).toBe('hard');
  });
});

describe('freshness', () => {
  it('is 1 until due, then decays linearly to 0 over max(3, interval) days', () => {
    const c = newCard('a', T0);
    expect(freshness(c, T0)).toBe(1);
    expect(freshness(c, c.due)).toBe(1);
    expect(freshness(c, c.due + 1.5 * DAY_MS)).toBeCloseTo(0.5);
    expect(freshness(c, c.due + 3 * DAY_MS)).toBe(0);
    expect(freshness(c, c.due + 30 * DAY_MS)).toBe(0);
    const long = { ...c, interval: 10 };
    expect(freshness(long, long.due + 5 * DAY_MS)).toBeCloseTo(0.5);
  });
  it('time travel +7 days fades a day-old card completely and creates quests', () => {
    const cards = new Map([
      ['a', newCard('a', T0)],
      ['b', review(newCard('b', T0), 'easy', T0)],
    ]);
    expect(refreshQuests(cards, T0)).toHaveLength(0);
    const later = T0 + 7 * DAY_MS;
    const q = refreshQuests(cards, later);
    expect(q.map((x) => x.conceptId).sort()).toEqual(['a', 'b']);
    expect(q[0]?.freshness).toBe(0);
    expect(isFaded(freshness(cards.get('a')!, later))).toBe(true);
  });
  it('mastery grows with interval and shrinks when faded', () => {
    let c = newCard('a', T0);
    expect(mastery(c, T0)).toBe(0);
    c = review(review(review(c, 'good', T0), 'good', T0), 'good', T0);
    const fresh = mastery(c, T0);
    expect(fresh).toBeGreaterThan(0);
    expect(mastery(c, c.due + 40 * DAY_MS)).toBeLessThan(fresh);
  });
});
