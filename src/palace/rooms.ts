import * as THREE from 'three';
import type { Corridor, RoomLayout } from './layout';
import { CORRIDOR_WIDTH, FOYER_RADIUS, PEDESTAL_HEIGHT, WALL_HEIGHT } from './layout';
import type { ThemeDef } from './themes';
import { mulberry32 } from './rng';

const TAU = Math.PI * 2;
const norm = (a: number): number => ((a % TAU) + TAU) % TAU;

/** Collects everything a world allocates so leaving a palace frees GPU memory. */
export class Disposer {
  private items: Array<{ dispose(): void }> = [];
  add<T extends { dispose(): void }>(x: T): T {
    this.items.push(x);
    return x;
  }
  disposeAll(): void {
    this.items.forEach((i) => i.dispose());
    this.items = [];
  }
}

export interface Assets {
  theme: ThemeDef;
  shadows: boolean;
  d: Disposer;
  tile: THREE.CanvasTexture;
  floor: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  pedestalTop: THREE.MeshStandardMaterial;
  accentMat: (hex: number, intensity?: number) => THREE.MeshStandardMaterial;
}

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

function tileTexture(theme: ThemeDef): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  if (x) {
    x.fillStyle = hex(theme.floor);
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = hex(theme.floor2);
    x.fillRect(0, 0, 128, 128);
    x.fillRect(128, 128, 128, 128);
    x.strokeStyle = 'rgba(0,0,0,0.22)';
    x.lineWidth = 3;
    x.strokeRect(1.5, 1.5, 253, 253);
    x.strokeRect(1.5, 1.5, 125, 125);
    x.strokeRect(129.5, 129.5, 125, 125);
    // subtle speckle so flat colour doesn't band
    for (let i = 0; i < 500; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeAssets(theme: ThemeDef, shadows: boolean): Assets {
  const d = new Disposer();
  const tile = d.add(tileTexture(theme));
  const floor = d.add(
    new THREE.MeshStandardMaterial({ map: tile, roughness: theme.roughness, metalness: theme.metalness, color: 0xffffff }),
  );
  const wall = d.add(
    new THREE.MeshStandardMaterial({ color: theme.wall, roughness: Math.min(1, theme.roughness + 0.1), metalness: theme.metalness * 0.6, side: THREE.DoubleSide }),
  );
  const trim = d.add(new THREE.MeshStandardMaterial({ color: theme.trim, roughness: 0.4, metalness: theme.key === 'zen' ? 0 : 0.6 }));
  const pedestalTop = d.add(new THREE.MeshStandardMaterial({ color: theme.pedestal, roughness: 0.5, metalness: theme.metalness * 0.5 }));
  const accentCache = new Map<string, THREE.MeshStandardMaterial>();
  const accentMat = (h: number, intensity = 1.2): THREE.MeshStandardMaterial => {
    const key = `${h}:${intensity}`;
    let m = accentCache.get(key);
    if (!m) {
      m = d.add(new THREE.MeshStandardMaterial({ color: h, emissive: h, emissiveIntensity: intensity, roughness: 0.4 }));
      accentCache.set(key, m);
    }
    return m;
  };
  return { theme, shadows, d, tile, floor, wall, trim, pedestalTop, accentMat };
}

function scaleUv(g: THREE.BufferGeometry, k: number): void {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  uv.needsUpdate = true;
}

interface Gap {
  c: number;
  h: number;
}

function arcs(gaps: Gap[]): Array<{ start: number; length: number }> {
  if (gaps.length === 0) return [{ start: 0, length: TAU }];
  const s = gaps.map((g) => ({ c: norm(g.c), h: g.h })).sort((a, b) => a.c - b.c);
  const out: Array<{ start: number; length: number }> = [];
  for (let i = 0; i < s.length; i++) {
    const a = s[i] as Gap;
    const b = s[(i + 1) % s.length] as Gap;
    const start = a.c + a.h;
    let end = b.c - b.h;
    if (i === s.length - 1) end += TAU;
    if (end - start > 0.02) out.push({ start, length: end - start });
  }
  return out;
}

function enableShadow(o: THREE.Object3D, cast: boolean, receive: boolean): void {
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
}

/** Round wall with door gaps, plus cornice and baseboard. */
function roundWall(radius: number, gaps: Gap[], a: Assets, parent: THREE.Group): void {
  for (const arc of arcs(gaps)) {
    const segs = Math.max(8, Math.ceil((72 * arc.length) / TAU));
    const wall = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(radius, radius, WALL_HEIGHT, segs, 1, true, arc.start, arc.length)), a.wall);
    wall.position.y = WALL_HEIGHT / 2;
    const cornice = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(radius + 0.12, radius + 0.12, 0.3, segs, 1, true, arc.start, arc.length)), a.trim);
    cornice.position.y = WALL_HEIGHT - 0.15;
    const base = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(radius - 0.06, radius - 0.06, 0.35, segs, 1, true, arc.start, arc.length)), a.trim);
    base.position.y = 0.175;
    cornice.material = a.trim;
    parent.add(wall, cornice, base);
    enableShadow(wall, a.shadows, false);
  }
}

function doorFrame(radius: number, heading: number, a: Assets, parent: THREE.Group): void {
  const halfW = CORRIDOR_WIDTH / 2 + 0.1;
  const g = new THREE.Group();
  const post = a.d.add(new THREE.BoxGeometry(0.4, WALL_HEIGHT * 0.78, 0.5));
  const l = new THREE.Mesh(post, a.trim);
  l.position.set(-halfW, WALL_HEIGHT * 0.39, 0);
  const r = new THREE.Mesh(post, a.trim);
  r.position.set(halfW, WALL_HEIGHT * 0.39, 0);
  const lintel = new THREE.Mesh(a.d.add(new THREE.BoxGeometry(halfW * 2 + 0.8, 0.45, 0.55)), a.trim);
  lintel.position.set(0, WALL_HEIGHT * 0.78 + 0.1, 0);
  const glow = new THREE.Mesh(a.d.add(new THREE.BoxGeometry(halfW * 2, 0.08, 0.1)), a.accentMat(a.theme.accent, 2));
  glow.position.set(0, WALL_HEIGHT * 0.78 - 0.15, 0.2);
  g.add(l, r, lintel, glow);
  // local +z points outward from the room centre along `heading`
  g.position.set(Math.sin(heading) * radius, 0, Math.cos(heading) * radius);
  g.rotation.y = heading;
  parent.add(g);
  enableShadow(g, a.shadows, false);
}

function circleFloor(radius: number, a: Assets, parent: THREE.Group, accent: number): void {
  const g = a.d.add(new THREE.CircleGeometry(radius, 72));
  g.rotateX(-Math.PI / 2);
  scaleUv(g, radius / 2.2);
  const f = new THREE.Mesh(g, a.floor);
  f.receiveShadow = true;
  parent.add(f);
  const ring = new THREE.Mesh(a.d.add(new THREE.RingGeometry(radius - 1.05, radius - 0.85, 72)), a.accentMat(accent, 0.9));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  const inner = new THREE.Mesh(a.d.add(new THREE.RingGeometry(1.6, 1.75, 64)), a.accentMat(accent, 0.6));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.012;
  parent.add(ring, inner);
}

function dustMotes(radius: number, color: number, count: number, a: Assets, seed: number): THREE.Points {
  const rng = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rng()) * (radius - 0.5);
    const ang = rng() * TAU;
    pos[i * 3] = Math.cos(ang) * r;
    pos[i * 3 + 1] = 0.3 + rng() * (WALL_HEIGHT - 0.6);
    pos[i * 3 + 2] = Math.sin(ang) * r;
  }
  const g = a.d.add(new THREE.BufferGeometry());
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = a.d.add(
    new THREE.PointsMaterial({ color, size: 0.07, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/** Decorative props around the wall, themed. Returns animated parts. */
function addProps(room: { radius: number; doorAngle: number; count: number }, a: Assets, parent: THREE.Group, accent: number, seed: number): THREE.Object3D[] {
  const animated: THREE.Object3D[] = [];
  const { radius, doorAngle, count } = room;
  const step = TAU / (count + 1);
  const angles: number[] = [];
  for (let i = 0; i <= count; i++) angles.push(doorAngle - step * (i + 0.5));
  const rng = mulberry32(seed);

  if (a.theme.props === 'columns') {
    const shaft = a.d.add(new THREE.CylinderGeometry(0.28, 0.32, WALL_HEIGHT - 0.6, 16));
    const cap = a.d.add(new THREE.BoxGeometry(0.85, 0.3, 0.85));
    const n = angles.length;
    const shafts = new THREE.InstancedMesh(shaft, a.pedestalTop, n);
    const caps = new THREE.InstancedMesh(cap, a.trim, n * 2);
    const m = new THREE.Matrix4();
    angles.forEach((ang, i) => {
      const x = Math.sin(ang) * (radius - 0.55);
      const z = Math.cos(ang) * (radius - 0.55);
      m.makeTranslation(x, (WALL_HEIGHT - 0.6) / 2 + 0.15, z);
      shafts.setMatrixAt(i, m);
      m.makeTranslation(x, WALL_HEIGHT - 0.3, z);
      caps.setMatrixAt(i * 2, m);
      m.makeTranslation(x, 0.15, z);
      caps.setMatrixAt(i * 2 + 1, m);
    });
    parent.add(shafts, caps);
    enableShadow(shafts, a.shadows, false);
    // braziers with flames near the door
    for (const s of [-1, 1]) {
      const heading = doorAngle + s * 0.42;
      const x = Math.sin(heading) * (radius - 0.9);
      const z = Math.cos(heading) * (radius - 0.9);
      const bowl = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(0.3, 0.16, 0.22, 12)), a.trim);
      bowl.position.set(x, 1.1, z);
      const stand = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 8)), a.trim);
      stand.position.set(x, 0.55, z);
      const flame = new THREE.Mesh(a.d.add(new THREE.ConeGeometry(0.17, 0.5, 10)), a.accentMat(0xff8a2a, 2.4));
      flame.position.set(x, 1.47, z);
      animated.push(flame);
      parent.add(bowl, stand, flame);
    }
  } else if (a.theme.props === 'tubes') {
    const tube = a.d.add(new THREE.CylinderGeometry(0.13, 0.13, WALL_HEIGHT - 0.8, 12));
    const plate = a.d.add(new THREE.CylinderGeometry(0.3, 0.34, 0.18, 12));
    const tubes = new THREE.InstancedMesh(tube, a.accentMat(accent, 1.4), angles.length);
    const plates = new THREE.InstancedMesh(plate, a.trim, angles.length * 2);
    const m = new THREE.Matrix4();
    angles.forEach((ang, i) => {
      const x = Math.sin(ang) * (radius - 0.55);
      const z = Math.cos(ang) * (radius - 0.55);
      m.makeTranslation(x, (WALL_HEIGHT - 0.8) / 2 + 0.3, z);
      tubes.setMatrixAt(i, m);
      m.makeTranslation(x, 0.09, z);
      plates.setMatrixAt(i * 2, m);
      m.makeTranslation(x, WALL_HEIGHT - 0.4, z);
      plates.setMatrixAt(i * 2 + 1, m);
    });
    parent.add(tubes, plates);
    const holo = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(a.d.add(new THREE.TorusGeometry(0.9 + i * 0.35, 0.025, 8, 64)), a.accentMat(accent, 1.8));
      ring.rotation.x = Math.PI / 2 + i * 0.5;
      holo.add(ring);
    }
    holo.position.y = 3.2;
    parent.add(holo);
    animated.push(holo);
  } else {
    // zen: rocks + bamboo + stone lanterns
    const rock = a.d.add(new THREE.IcosahedronGeometry(0.6, 0));
    const rocks = new THREE.InstancedMesh(rock, a.pedestalTop, angles.length);
    const stalk = a.d.add(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 6));
    const bamboo = new THREE.InstancedMesh(stalk, a.accentMat(0x5fa84f, 0.05), angles.length * 3);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    angles.forEach((ang, i) => {
      const x = Math.sin(ang) * (radius - 0.9);
      const z = Math.cos(ang) * (radius - 0.9);
      const k = 0.6 + rng() * 0.9;
      q.setFromEuler(new THREE.Euler(rng(), rng() * TAU, rng()));
      m.compose(new THREE.Vector3(x, 0.25, z), q, s.set(k, k * 0.7, k));
      rocks.setMatrixAt(i, m);
      for (let j = 0; j < 3; j++) {
        const bx = Math.sin(ang + (j - 1) * 0.07) * (radius - 0.4 - j * 0.12);
        const bz = Math.cos(ang + (j - 1) * 0.07) * (radius - 0.4 - j * 0.12);
        m.makeTranslation(bx, 2.1, bz);
        bamboo.setMatrixAt(i * 3 + j, m);
      }
    });
    parent.add(rocks, bamboo);
    for (const sgn of [-1, 1]) {
      const heading = doorAngle + sgn * 0.4;
      const x = Math.sin(heading) * (radius - 1.0);
      const z = Math.cos(heading) * (radius - 1.0);
      const base = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(0.18, 0.22, 0.8, 8)), a.pedestalTop);
      base.position.set(x, 0.4, z);
      const lamp = new THREE.Mesh(a.d.add(new THREE.BoxGeometry(0.4, 0.34, 0.4)), a.accentMat(0xffd27a, 1.6));
      lamp.position.set(x, 1.0, z);
      const roof = new THREE.Mesh(a.d.add(new THREE.ConeGeometry(0.42, 0.3, 4)), a.pedestalTop);
      roof.position.set(x, 1.3, z);
      roof.rotation.y = Math.PI / 4;
      parent.add(base, lamp, roof);
    }
  }
  return animated;
}

export interface PedestalParts {
  group: THREE.Group;
  body: THREE.Mesh;
  ring: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshStandardMaterial;
  baseBody: THREE.Color;
  baseRing: THREE.Color;
}

export function makePedestal(a: Assets, accent: number): PedestalParts {
  const group = new THREE.Group();
  const bodyMat = a.d.add(new THREE.MeshStandardMaterial({ color: a.theme.pedestal, roughness: 0.55, metalness: a.theme.metalness * 0.5 }));
  const ringMat = a.d.add(new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1, roughness: 0.4 }));
  const body = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(0.42, 0.52, PEDESTAL_HEIGHT - 0.08, 24)), bodyMat);
  body.position.y = (PEDESTAL_HEIGHT - 0.08) / 2;
  const top = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 24)), a.trim);
  top.position.y = PEDESTAL_HEIGHT - 0.04;
  const ring = new THREE.Mesh(a.d.add(new THREE.TorusGeometry(0.46, 0.03, 8, 40)), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = PEDESTAL_HEIGHT + 0.005;
  group.add(body, top, ring);
  enableShadow(group, a.shadows, true);
  return { group, body, ring, bodyMat, ringMat, baseBody: bodyMat.color.clone(), baseRing: ringMat.color.clone() };
}

export interface RoomParts {
  group: THREE.Group;
  motes: THREE.Points;
  animated: THREE.Object3D[];
}

export function buildRoom(room: RoomLayout, count: number, a: Assets, accent: number, seed: number): RoomParts {
  const group = new THREE.Group();
  group.position.set(room.center.x, 0, room.center.z);
  circleFloor(room.radius, a, group, accent);
  const half = Math.asin(Math.min(0.9, (CORRIDOR_WIDTH / 2 + 0.1) / room.radius));
  roundWall(room.radius, [{ c: room.doorAngle, h: half }], a, group);
  doorFrame(room.radius, room.doorAngle, a, group);
  const animated = addProps({ radius: room.radius, doorAngle: room.doorAngle, count }, a, group, accent, seed);
  const motes = dustMotes(room.radius, accent, 70, a, seed ^ 0x51);
  group.add(motes);
  return { group, motes, animated };
}

export function buildFoyer(doorAngles: number[], a: Assets, accent: number): RoomParts {
  const group = new THREE.Group();
  circleFloor(FOYER_RADIUS, a, group, accent);
  const half = Math.asin((CORRIDOR_WIDTH / 2 + 0.1) / FOYER_RADIUS);
  roundWall(FOYER_RADIUS, doorAngles.map((c) => ({ c, h: half })), a, group);
  for (const ang of doorAngles) doorFrame(FOYER_RADIUS, ang, a, group);
  // armillary sphere at the centre
  const core = new THREE.Mesh(a.d.add(new THREE.SphereGeometry(0.28, 24, 16)), a.accentMat(accent, 2));
  core.position.y = 1.7;
  const plinth = new THREE.Mesh(a.d.add(new THREE.CylinderGeometry(0.7, 0.85, 0.9, 28)), a.pedestalTop);
  plinth.position.y = 0.45;
  const armillary = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(a.d.add(new THREE.TorusGeometry(0.55 + i * 0.16, 0.025, 8, 56)), a.accentMat(accent, 1.4));
    ring.rotation.set(i * 1.05, i * 0.6, 0);
    armillary.add(ring);
  }
  armillary.position.y = 1.7;
  group.add(plinth, core, armillary);
  enableShadow(plinth, a.shadows, true);
  const motes = dustMotes(FOYER_RADIUS, accent, 50, a, 7);
  group.add(motes);
  return { group, motes, animated: [armillary, core] };
}

export function buildCorridor(c: Corridor, a: Assets, accent: number): THREE.Group {
  const group = new THREE.Group();
  const mid = { x: (c.a.x + c.b.x) / 2, z: (c.a.z + c.b.z) / 2 };
  group.position.set(mid.x, 0, mid.z);
  group.rotation.y = c.heading; // local +z runs along the corridor a -> b
  const len = c.length + 1.2;
  const fg = a.d.add(new THREE.PlaneGeometry(c.width, len));
  fg.rotateX(-Math.PI / 2);
  scaleUv(fg, 1.6);
  const floor = new THREE.Mesh(fg, a.floor);
  floor.receiveShadow = true;
  const wallH = 3.4;
  const wg = a.d.add(new THREE.BoxGeometry(0.2, wallH, len));
  const left = new THREE.Mesh(wg, a.wall);
  left.position.set(-c.width / 2 - 0.1, wallH / 2, 0);
  const right = new THREE.Mesh(wg, a.wall);
  right.position.set(c.width / 2 + 0.1, wallH / 2, 0);
  const sg = a.d.add(new THREE.BoxGeometry(0.06, 0.04, len));
  const s1 = new THREE.Mesh(sg, a.accentMat(accent, 2));
  s1.position.set(-c.width / 2 + 0.25, 0.03, 0);
  const s2 = new THREE.Mesh(sg, a.accentMat(accent, 2));
  s2.position.set(c.width / 2 - 0.25, 0.03, 0);
  const s3 = new THREE.Mesh(a.d.add(new THREE.BoxGeometry(0.12, 0.05, len)), a.accentMat(accent, 1.2));
  s3.position.set(0, 0.025, 0);
  const cap = new THREE.Mesh(a.d.add(new THREE.BoxGeometry(c.width + 0.6, 0.15, len)), a.trim);
  cap.position.set(0, wallH, 0);
  group.add(floor, left, right, s1, s2, s3, cap);
  enableShadow(left, a.shadows, false);
  enableShadow(right, a.shadows, false);
  return group;
}
