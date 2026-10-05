import * as THREE from 'three';
import { geo, mesh } from '../kit';

export type V3 = [number, number, number];
export type Pt = [number, number];
export const PI = Math.PI;

/** Rounded rectangle outline (CCW), centred on the origin. */
export function roundRect(w: number, h: number, r: number, seg = 5): Pt[] {
  const pts: Pt[] = [];
  const corners: Array<[number, number, number]> = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, 90],
    [-w / 2 + r, -h / 2 + r, 180],
    [w / 2 - r, -h / 2 + r, 270],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = ((a0 + (90 * i) / seg) * PI) / 180;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/** n-pointed star outline, first point straight up. */
export function star(n: number, ro: number, ri: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = PI / 2 + (i * PI) / n;
    const r = i % 2 === 0 ? ro : ri;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** Deterministic lumpy island outline. */
export function blob(rad: number, seed: number, n = 12): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const r = rad * (0.7 + 0.3 * Math.sin(i * 2.3 + seed) * Math.cos(i * 1.1 + seed * 1.7));
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** Cylinder stretched between two points. */
export function rod(a: V3, b: V3, r: number, m: THREE.Material, seg = 8): THREE.Mesh {
  const va = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(va);
  const o = mesh(geo.cyl(r, r, d.length(), seg), m);
  o.position.copy(va).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return o;
}

/** Partial torus (arc in the xy plane, starting at +x going CCW). NOT cached. */
export function arc(R: number, r: number, angle = PI): THREE.TorusGeometry {
  return new THREE.TorusGeometry(R, r, 10, 28, angle);
}

/** Cheap per-model lookup of named children for update(). */
export function makeGetter(): (model: THREE.Object3D, name: string) => THREE.Object3D | undefined {
  const cache = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D | undefined>>();
  return (model, name) => {
    let m = cache.get(model);
    if (!m) {
      m = new Map();
      cache.set(model, m);
    }
    if (!m.has(name)) m.set(name, model.getObjectByName(name));
    return m.get(name);
  };
}

/** z displacement of a flag cloth point at distance x from the pole. */
export function wave(x: number, len: number, t: number, amp: number): number {
  return Math.sin((x / len) * 5 - t * 4) * amp * (x / len);
}

/** Ripple a flag plane whose left edge sits on x = 0. */
export function waveFlag(m: THREE.Object3D, len: number, t: number, amp = 0.05): void {
  const g = (m as THREE.Mesh).geometry;
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, wave(p.getX(i), len, t, amp));
  p.needsUpdate = true;
  g.computeVertexNormals();
}

export const flicker = (t: number, k = 0): number =>
  1 + 0.12 * Math.sin(t * 13 + k) + 0.08 * Math.sin(t * 23 + k * 2) + 0.05 * Math.sin(t * 37 + k * 3);
