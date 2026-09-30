import type * as THREE from 'three';
import type { Lang } from '../extract/types';

export type IdleKind = 'float' | 'rotate' | 'pulse';

export interface ObjectDef {
  /** Must be one of OBJECT_KEYS. */
  key: string;
  /** Display name per language (Devanagari for hi/mr). */
  name: Record<Lang, string>;
  /** Keywords that should map a concept to this object (lowercase en; Devanagari for hi/mr). Used by the heuristic extractor. */
  tags: Record<Lang, string[]>;
  /** Generic idle animations applied by ObjectInstance. Default ['float','rotate']. */
  idle?: IdleKind[];
  /**
   * Build a NEW model each call (fresh materials; geometries from the kit cache are shared).
   * Modelled with the base on y=0 and centred on x/z; size is normalised afterwards by ObjectInstance,
   * so only proportions matter.
   */
  build(): THREE.Group;
  /** Optional object-specific animation (spinning electrons, swinging pendulum...). t = seconds since start. */
  update?(model: THREE.Group, t: number, dt: number): void;
}
