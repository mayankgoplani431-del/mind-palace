import * as THREE from 'three';
import { mat as kitMat, type MatOpts } from '../kit';

const lookups = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D | undefined>>();

/** Cached getObjectByName (animated parts are looked up once per model). */
export function part(model: THREE.Object3D, name: string): THREE.Object3D | undefined {
  let m = lookups.get(model);
  if (!m) {
    m = new Map();
    lookups.set(model, m);
  }
  if (!m.has(name)) m.set(name, model.getObjectByName(name));
  return m.get(name);
}

/** Flat 2D outline -> extruded solid centred on z. NOT cached. */
export function slab(shape: THREE.Shape, depth: number, bevel = 0.008): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    curveSegments: 10,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function polyShape(pts: Array<[number, number]>): THREE.Shape {
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
}

const ALBEDO = 0.3;
/** kit mat() with albedo toned down (the lit scenes blow out pastel colours). */
export function mat(color: THREE.ColorRepresentation, o: MatOpts = {}): THREE.MeshStandardMaterial {
  return kitMat(new THREE.Color(color).multiplyScalar(ALBEDO), o);
}
