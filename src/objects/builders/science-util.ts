import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { geo, mesh } from '../kit';

const lookup = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D>>();

/** Cached getObjectByName so update() never traverses the model every frame. */
export function part(model: THREE.Object3D, name: string): THREE.Object3D | undefined {
  let m = lookup.get(model);
  if (!m) {
    m = new Map();
    lookup.set(model, m);
  }
  let o = m.get(name);
  if (!o) {
    o = model.getObjectByName(name);
    if (o) m.set(name, o);
  }
  return o;
}

/** Teardrop lathe: base at y=0, pointed tip at y=h. Max radius is ~0.75*r. */
export function teardrop(r: number, h: number, sharp = 1, n = 20): THREE.LatheGeometry {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (1 - i / n);
    pts.push([
      Math.max(1e-4, r * Math.sin(a) * Math.pow(Math.sin(a / 2), sharp)),
      (h * (1 + Math.cos(a))) / 2,
    ]);
  }
  return geo.lathe(pts, 28);
}

/** Smooth a profile through control points (radius,y) for lathe use. */
export function smooth(pts: Array<[number, number]>, n = 24): Array<[number, number]> {
  const c = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return c.getPoints(n).map((v) => [Math.max(1e-4, v.x), v.y] as [number, number]);
}

/** Cylinder mesh between two points. */
export function limb(a: THREE.Vector3, b: THREE.Vector3, radius: number, m: THREE.Material): THREE.Mesh {
  const d = b.clone().sub(a);
  const len = d.length();
  const o = mesh(geo.cyl(radius, radius, 1, 12), m);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.scale.y = len;
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return o;
}

/** n roughly even unit directions on a sphere (Fibonacci). */
export function fibDirs(n: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    out.push(new THREE.Vector3(Math.cos(ga * i) * r, y, Math.sin(ga * i) * r));
  }
  return out;
}

/** Orient an object so its +y axis points along dir. */
export function aim<T extends THREE.Object3D>(o: T, dir: THREE.Vector3): T {
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return o;
}

/** Make a transparent material not write depth (clean glass/fluid layering). */
export function glassy<T extends THREE.Material>(m: T): T {
  m.depthWrite = false;
  return m;
}

/** Indexed, smooth-normal icosphere (Three's icosahedron is non-indexed = flat shaded). */
export function smoothIco(radius: number, detail: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  return mergeVertices(g, 1e-4);
}

/** Weld + recompute normals so extruded/bevelled shapes shade smoothly. */
export function smoothen(g: THREE.BufferGeometry): THREE.BufferGeometry {
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  return m;
}

/** Translucent parts must not cast (opaque) shadows onto themselves. */
export function softShadows<T extends THREE.Object3D>(root: T): T {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const mm = m.material as THREE.Material | undefined;
    if (mm && mm.transparent && mm.opacity < 0.5) {
      m.castShadow = false;
      m.receiveShadow = false;
    }
  });
  return root;
}
