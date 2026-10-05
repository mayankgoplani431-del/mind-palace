import { describe, expect, it } from 'vitest';
import { computeLayout, isWalkable, regionAt, slide } from '../src/palace/layout';

describe('palace layout', () => {
  it('is deterministic for the same seed and differs for another', () => {
    const a = computeLayout([8, 7, 6], 12345);
    const b = computeLayout([8, 7, 6], 12345);
    const c = computeLayout([8, 7, 6], 999);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(c));
  });
  it('places the requested number of loci per room, all inside the room and away from the door', () => {
    const l = computeLayout([8, 6], 7);
    expect(l.rooms.map((r) => r.loci.length)).toEqual([8, 6]);
    for (const r of l.rooms) {
      for (const s of r.loci) {
        expect(Math.hypot(s.pos.x - r.center.x, s.pos.z - r.center.z)).toBeLessThan(r.radius - 1);
        expect(Math.hypot(s.pos.x - r.doorPos.x, s.pos.z - r.doorPos.z)).toBeGreaterThan(2);
      }
    }
  });
  it('orders loci clockwise from the door (heading decreases)', () => {
    const r = computeLayout([8], 3).rooms[0]!;
    const heading = (i: number): number => Math.atan2(r.loci[i]!.pos.x - r.center.x, r.loci[i]!.pos.z - r.center.z);
    const d = (a: number, b: number): number => ((((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    for (let i = 0; i < 7; i++) expect(d(heading(i), heading(i + 1))).toBeLessThan(0);
  });
  it('connects foyer and rooms by walkable corridors and blocks the void', () => {
    const l = computeLayout([6, 6, 6], 11);
    expect(regionAt(l, 0, 0)).toEqual({ kind: 'foyer' });
    for (const r of l.rooms) {
      expect(isWalkable(l, r.center.x, r.center.z)).toBe(true);
      const c = l.corridors[r.index]!;
      expect(isWalkable(l, (c.a.x + c.b.x) / 2, (c.a.z + c.b.z) / 2)).toBe(true);
    }
    expect(isWalkable(l, 500, 500)).toBe(false);
  });
  it('slides along walls instead of stopping dead', () => {
    const l = computeLayout([6], 5);
    const from = { x: 0, z: 0 };
    const out = slide(l, from, { x: 50, z: 0 });
    expect(Math.hypot(out.x, out.z)).toBeLessThanOrEqual(l.foyer.radius);
  });
});
