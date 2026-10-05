import type { ObjectDef } from '../types';
import { scienceA } from './science-a';
import { scienceB } from './science-b';
import { softShadows } from './science-util';

export const scienceObjects: ObjectDef[] = [...scienceA, ...scienceB].map((d) => ({
  ...d,
  build: () => softShadows(d.build()),
}));
