import * as THREE from 'three';
import type { ObjectDef } from './types';
import { FALLBACK_OBJECT_KEY } from './keys';
import { scienceObjects } from './builders/science';
import { cultureObjects } from './builders/culture';

export const OBJECTS: ObjectDef[] = [...scienceObjects, ...cultureObjects];

const byKey = new Map<string, ObjectDef>(OBJECTS.map((o) => [o.key, o]));

/** Last-resort def so nothing ever crashes if a builder file is missing a key. */
const emergency: ObjectDef = {
  key: FALLBACK_OBJECT_KEY,
  name: { en: 'Mystery crystal', hi: 'रहस्य क्रिस्टल', mr: 'रहस्य क्रिस्टल' },
  tags: { en: [], hi: [], mr: [] },
  build() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4),
      new THREE.MeshStandardMaterial({ color: 0x8b7bff, roughness: 0.2, metalness: 0.3 }),
    );
    m.position.y = 0.5;
    g.add(m);
    return g;
  },
};

export function hasObject(key: string): boolean {
  return byKey.has(key);
}

export function getObjectDef(key: string): ObjectDef {
  return byKey.get(key) ?? byKey.get(FALLBACK_OBJECT_KEY) ?? emergency;
}
