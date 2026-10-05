import type { ObjectDef } from '../types';
import { cultureA } from './culture-a';
import { cultureB } from './culture-b';
import { cultureC } from './culture-c';

export const cultureObjects: ObjectDef[] = [...cultureA, ...cultureB, ...cultureC];
