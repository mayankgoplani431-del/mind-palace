import type { ObjectDef } from '../types';
import { natureA } from './nature-a';
import { natureB } from './nature-b';

export const natureObjects: ObjectDef[] = [...natureA, ...natureB];
