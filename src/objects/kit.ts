import * as THREE from 'three';

/** Named palette so builders look consistent. */
export const C = {
  gold: 0xf5c542,
  silver: 0xcfd6de,
  steel: 0x8d99a6,
  bronze: 0xb0793a,
  copper: 0xc8683a,
  wood: 0x9a6a3a,
  darkWood: 0x5b3a1e,
  stone: 0x9aa0a8,
  darkStone: 0x555b66,
  marble: 0xeeeae0,
  sand: 0xe3c98a,
  parchment: 0xf0e0b8,
  red: 0xe5484d,
  crimson: 0xb3202b,
  orange: 0xff8a2a,
  yellow: 0xffd93b,
  green: 0x3fbf5f,
  darkGreen: 0x1f7a3e,
  teal: 0x19b5a5,
  cyan: 0x3cd7f0,
  blue: 0x3b82f6,
  navy: 0x1f3a8a,
  purple: 0x8b5cf6,
  pink: 0xf472b6,
  white: 0xffffff,
  black: 0x15161a,
  glass: 0xbfe9ff,
} as const;

export interface MatOpts {
  metal?: number;
  rough?: number;
  emissive?: THREE.ColorRepresentation;
  /** emissiveIntensity shorthand (default 1 when emissive is given). */
  glow?: number;
  opacity?: number;
  side?: THREE.Side;
  flat?: boolean;
  clearcoat?: number;
  /** 0..1 glass-like transmission (uses MeshPhysicalMaterial). */
  transmission?: number;
}

/** Creates a NEW material each call (instances fade independently). */
export function mat(color: THREE.ColorRepresentation, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const params: THREE.MeshPhysicalMaterialParameters = {
    color,
    metalness: o.metal ?? 0.1,
    roughness: o.rough ?? 0.5,
    flatShading: o.flat ?? false,
    side: o.side ?? THREE.FrontSide,
  };
  if (o.emissive !== undefined) {
    params.emissive = new THREE.Color(o.emissive);
    params.emissiveIntensity = o.glow ?? 1;
  }
  if (o.opacity !== undefined && o.opacity < 1) {
    params.opacity = o.opacity;
    params.transparent = true;
  }
  if (o.clearcoat !== undefined || o.transmission !== undefined) {
    params.clearcoat = o.clearcoat ?? 0;
    params.transmission = o.transmission ?? 0;
    params.thickness = 0.3;
    return new THREE.MeshPhysicalMaterial(params);
  }
  return new THREE.MeshStandardMaterial(params);
}

// ---- cached primitive geometries (shared across every instance; never dispose these) ----
const cache = new Map<string, THREE.BufferGeometry>();
const shared = new WeakSet<THREE.BufferGeometry>();

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined;
  if (!g) {
    g = make();
    cache.set(key, g);
    shared.add(g);
  }
  return g;
}

export function isSharedGeometry(g: THREE.BufferGeometry): boolean {
  return shared.has(g);
}

const r = (n: number): string => n.toFixed(4);

export const geo = {
  box: (w: number, h: number, d: number) =>
    cached(`box${r(w)},${r(h)},${r(d)}`, () => new THREE.BoxGeometry(w, h, d)),
  sphere: (rad: number, ws = 32, hs = 20) =>
    cached(`sph${r(rad)},${ws},${hs}`, () => new THREE.SphereGeometry(rad, ws, hs)),
  cyl: (rt: number, rb: number, h: number, seg = 32) =>
    cached(`cyl${r(rt)},${r(rb)},${r(h)},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
  cone: (rad: number, h: number, seg = 32) =>
    cached(`cone${r(rad)},${r(h)},${seg}`, () => new THREE.ConeGeometry(rad, h, seg)),
  torus: (R: number, rad: number, rs = 16, ts = 48) =>
    cached(`tor${r(R)},${r(rad)},${rs},${ts}`, () => new THREE.TorusGeometry(R, rad, rs, ts)),
  capsule: (rad: number, len: number) =>
    cached(`cap${r(rad)},${r(len)}`, () => new THREE.CapsuleGeometry(rad, len, 8, 20)),
  plane: (w: number, h: number) => cached(`pl${r(w)},${r(h)}`, () => new THREE.PlaneGeometry(w, h)),
  ring: (ri: number, ro: number, seg = 48) =>
    cached(`ring${r(ri)},${r(ro)},${seg}`, () => new THREE.RingGeometry(ri, ro, seg)),
  dodeca: (rad: number) => cached(`dod${r(rad)}`, () => new THREE.DodecahedronGeometry(rad)),
  octa: (rad: number) => cached(`oct${r(rad)}`, () => new THREE.OctahedronGeometry(rad)),
  icosa: (rad: number, detail = 0) =>
    cached(`ico${r(rad)},${detail}`, () => new THREE.IcosahedronGeometry(rad, detail)),
  /** Half sphere (dome) – top half of a sphere. */
  dome: (rad: number, seg = 32) =>
    cached(
      `dome${r(rad)},${seg}`,
      () => new THREE.SphereGeometry(rad, seg, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    ),
  /** Lathe profile: points are [radius, y] pairs, bottom to top. NOT cached. */
  lathe: (pts: Array<[number, number]>, seg = 40) =>
    new THREE.LatheGeometry(
      pts.map(([x, y]) => new THREE.Vector2(x, y)),
      seg,
    ),
  /** Tube along a curve. NOT cached. */
  tube: (curve: THREE.Curve<THREE.Vector3>, segs: number, rad: number, radial = 10) =>
    new THREE.TubeGeometry(curve, segs, rad, radial, false),
  /** Extruded 2D outline (points in x/y), depth along z, small bevel. NOT cached. */
  extrude: (pts: Array<[number, number]>, depth: number, bevel = 0.01) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 2,
      curveSegments: 12,
    });
  },
};

type Vec3 = [number, number, number];

/** Convenience mesh factory: position, rotation (radians), scale. Shadows on. */
export function mesh(
  g: THREE.BufferGeometry,
  m: THREE.Material,
  pos: Vec3 = [0, 0, 0],
  rot: Vec3 = [0, 0, 0],
  scale: Vec3 | number = 1,
): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(...pos);
  o.rotation.set(...rot);
  if (typeof scale === 'number') o.scale.setScalar(scale);
  else o.scale.set(...scale);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

export function grp(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

/** Mark a child so ObjectDef.update can find it: `named(obj, 'hand')` then `model.getObjectByName('hand')`. */
export function named<T extends THREE.Object3D>(o: T, name: string): T {
  o.name = name;
  return o;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}
