import { mulberry32 } from './rng';

/**
 * Pure (THREE-free) palace geometry. World axes: +x right, +z toward the viewer of a top-down map.
 * A heading angle φ maps to the point (sin φ, cos φ); DECREASING φ is clockwise on the top-down map.
 */
export interface Vec2 {
  x: number;
  z: number;
}

export interface LocusSlot {
  index: number;
  /** Where the pedestal stands. */
  pos: Vec2;
  /** Heading of the direction from the pedestal toward the room centre (object faces this way). */
  yaw: number;
  /** Where a visitor stands to study this locus. */
  stand: Vec2;
}

export interface RoomLayout {
  index: number;
  center: Vec2;
  radius: number;
  /** Heading from the room centre toward its door (and toward the foyer). */
  doorAngle: number;
  doorPos: Vec2;
  loci: LocusSlot[];
}

export interface Corridor {
  a: Vec2;
  b: Vec2;
  width: number;
  length: number;
  /** Heading a -> b. */
  heading: number;
}

export interface Layout {
  foyer: { center: Vec2; radius: number; doorAngles: number[] };
  rooms: RoomLayout[];
  corridors: Corridor[];
  /** Half-extent (for minimap scaling). */
  extent: number;
}

export const FOYER_RADIUS = 6.5;
export const CORRIDOR_LENGTH = 10;
export const CORRIDOR_WIDTH = 3.2;
export const WALL_HEIGHT = 4.6;
export const PEDESTAL_HEIGHT = 0.95;

export const polar = (c: Vec2, r: number, heading: number): Vec2 => ({
  x: c.x + r * Math.sin(heading),
  z: c.z + r * Math.cos(heading),
});

const TAU = Math.PI * 2;
export const wrapAngle = (a: number): number => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

/**
 * @param lociPerRoom number of loci (concepts) in each room, in order
 * @param seed palace seed – same inputs always give the same layout
 */
export function computeLayout(lociPerRoom: number[], seed: number): Layout {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const K = Math.max(1, lociPerRoom.length);
  const start = rng() * TAU;
  const rooms: RoomLayout[] = [];
  const corridors: Corridor[] = [];
  const doorAngles: number[] = [];
  const foyerC: Vec2 = { x: 0, z: 0 };
  let extent = FOYER_RADIUS;

  lociPerRoom.forEach((n, k) => {
    const radius = Math.round((7 + 0.3 * n + rng() * 0.6) * 10) / 10;
    // rooms fan out around the foyer, clockwise (decreasing heading) from the start angle
    const alpha = start - (TAU * k) / K;
    const dist = FOYER_RADIUS + CORRIDOR_LENGTH + radius;
    const center = polar(foyerC, dist, alpha);
    const doorAngle = alpha + Math.PI;
    const doorPos = polar(center, radius, doorAngle);
    const lociR = radius - 1.5;
    const step = TAU / (n + 1);
    const loci: LocusSlot[] = [];
    for (let i = 0; i < n; i++) {
      // clockwise from the door: slot 0 is the first pedestal to the door's right-hand side
      const heading = doorAngle - step * (i + 1);
      const pos = polar(center, lociR, heading);
      loci.push({ index: i, pos, yaw: heading + Math.PI, stand: polar(center, lociR - 2.1, heading) });
    }
    rooms.push({ index: k, center, radius, doorAngle, doorPos, loci });
    doorAngles.push(alpha);
    corridors.push({
      a: polar(foyerC, FOYER_RADIUS, alpha),
      b: doorPos,
      width: CORRIDOR_WIDTH,
      length: CORRIDOR_LENGTH,
      heading: alpha,
    });
    extent = Math.max(extent, dist + radius);
  });

  return { foyer: { center: foyerC, radius: FOYER_RADIUS, doorAngles }, rooms, corridors, extent };
}

/** Which region of the palace a point is in: -1 foyer, 0..n-1 room index, 'hall' for corridors, null outside. */
export type Region = { kind: 'foyer' } | { kind: 'room'; index: number } | { kind: 'corridor'; index: number } | null;

function inCorridor(c: Corridor, x: number, z: number, margin: number): boolean {
  const dx = Math.sin(c.heading);
  const dz = Math.cos(c.heading);
  const px = x - c.a.x;
  const pz = z - c.a.z;
  const t = px * dx + pz * dz;
  const perp = Math.abs(px * dz - pz * dx);
  return t >= -0.6 && t <= c.length + 0.6 && perp <= c.width / 2 - margin;
}

export function regionAt(layout: Layout, x: number, z: number, margin = 0): Region {
  if (Math.hypot(x, z) <= layout.foyer.radius - margin) return { kind: 'foyer' };
  for (const r of layout.rooms) {
    if (Math.hypot(x - r.center.x, z - r.center.z) <= r.radius - margin) return { kind: 'room', index: r.index };
  }
  for (let i = 0; i < layout.corridors.length; i++) {
    if (inCorridor(layout.corridors[i] as Corridor, x, z, margin)) return { kind: 'corridor', index: i };
  }
  return null;
}

export const isWalkable = (layout: Layout, x: number, z: number, margin = 0.35): boolean =>
  regionAt(layout, x, z, margin) !== null;

/** Move from -> to, sliding along walls: tries the full move, then each axis alone. */
export function slide(layout: Layout, from: Vec2, to: Vec2, margin = 0.35): Vec2 {
  if (isWalkable(layout, to.x, to.z, margin)) return to;
  if (isWalkable(layout, to.x, from.z, margin)) return { x: to.x, z: from.z };
  if (isWalkable(layout, from.x, to.z, margin)) return { x: from.x, z: to.z };
  return from;
}

/** Waypoints for auto-walking from the foyer centre to a room locus stand (used by the tour / route modes). */
export function routeToRoom(layout: Layout, roomIndex: number): Vec2[] {
  const r = layout.rooms[roomIndex];
  const c = layout.corridors[roomIndex];
  if (!r || !c) return [];
  return [layout.foyer.center, c.a, c.b, r.center];
}
