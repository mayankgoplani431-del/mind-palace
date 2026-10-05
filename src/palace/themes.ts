import * as THREE from 'three';
import type { Lang, RoomSpec, StyleKey } from '../extract/types';

export interface ThemeDef {
  key: StyleKey;
  name: Record<Lang, string>;
  floor: number;
  floor2: number;
  wall: number;
  trim: number;
  pedestal: number;
  accent: number;
  roughness: number;
  metalness: number;
  props: 'columns' | 'tubes' | 'stones';
  sky: { day: [number, number]; night: [number, number] };
  fog: { day: number; night: number };
  sun: { day: number; night: number };
  hemi: { day: [number, number]; night: [number, number] };
}

export const THEMES: Record<StyleKey, ThemeDef> = {
  temple: {
    key: 'temple',
    name: { en: 'Ancient Temple', hi: 'प्राचीन मंदिर', mr: 'प्राचीन मंदिर' },
    floor: 0xcdbb94,
    floor2: 0xa48f66,
    wall: 0xd9c9a3,
    trim: 0xb8892e,
    pedestal: 0xe6dcc5,
    accent: 0xffb347,
    roughness: 0.75,
    metalness: 0.05,
    props: 'columns',
    sky: { day: [0x5aa7e8, 0xfbe3b0], night: [0x0a0f2e, 0x3b2a52] },
    fog: { day: 0xf0dcb0, night: 0x120f2a },
    sun: { day: 0xfff0d0, night: 0x7d8cff },
    hemi: { day: [0xbfdcff, 0x9b8458], night: [0x3a4a9a, 0x1c1633] },
  },
  lab: {
    key: 'lab',
    name: { en: 'Sci-Fi Lab', hi: 'साइ-फाई प्रयोगशाला', mr: 'साय-फाय प्रयोगशाळा' },
    floor: 0x2b3350,
    floor2: 0x1b2036,
    wall: 0x3a4670,
    trim: 0x22d3ee,
    pedestal: 0x1d2440,
    accent: 0x22d3ee,
    roughness: 0.3,
    metalness: 0.55,
    props: 'tubes',
    sky: { day: [0x274a8a, 0x8fd6ff], night: [0x02030c, 0x13204d] },
    fog: { day: 0x9fc6ea, night: 0x060a1c },
    sun: { day: 0xe6f3ff, night: 0x5b7cff },
    hemi: { day: [0xcfe6ff, 0x37406a], night: [0x284a8f, 0x0b1026] },
  },
  zen: {
    key: 'zen',
    name: { en: 'Zen Garden', hi: 'ज़ेन उद्यान', mr: 'झेन बाग' },
    floor: 0xb9c7a4,
    floor2: 0x8da37a,
    wall: 0xe8e2d0,
    trim: 0x6b4f32,
    pedestal: 0x8c8f86,
    accent: 0xff9ebd,
    roughness: 0.9,
    metalness: 0.0,
    props: 'stones',
    sky: { day: [0x6fb7e9, 0xeaf6e0], night: [0x071326, 0x284a4a] },
    fog: { day: 0xdcebd5, night: 0x0a1820 },
    sun: { day: 0xfff6dc, night: 0x88a8ff },
    hemi: { day: [0xcfeaff, 0x6f8a55], night: [0x35508a, 0x10201a] },
  },
};

export type RoomKind = 'science' | 'history' | 'nature' | 'library' | 'generic';

const KIND_RE: Array<[RoomKind, RegExp]> = [
  [
    'science',
    /physic|chemi|science|atom|energy|force|electric|magnet|wave|भौतिक|रसायन|विज्ञान|ऊर्जा|विद्युत|चुंबक|चुंबकीय|लहर|तरंग/i,
  ],
  [
    'history',
    /histor|empire|war\b|king|dynast|revolution|freedom|independ|fort|इतिहास|साम्राज्य|युद्ध|राजा|स्वातंत्र्य|स्वतंत्रता|मराठ|पेशव|किल्ल|लढा|क्रांति|शिवाजी/i,
  ],
  [
    'nature',
    /biolog|plant|cell|animal|ecosystem|nature|geograph|environment|human body|जीव|वनस्पती|पौधे|कोशिका|प्राणी|निसर्ग|भूगोल|पर्यावरण|शरीर|आनुवंशिक/i,
  ],
  ['library', /literature|grammar|poem|language|novel|author|साहित्य|व्याकरण|कविता|भाषा/i],
];

export const KIND_ACCENT: Record<RoomKind, number> = {
  science: 0x4cc9f0,
  history: 0xf59e0b,
  nature: 0x4ade80,
  library: 0xc084fc,
  generic: 0x8b7bff,
};

export function roomKind(room: RoomSpec): RoomKind {
  const probe = `${room.topic} ${room.concepts.map((c) => `${c.title} ${c.keywords.join(' ')}`).join(' ')}`;
  for (const [kind, re] of KIND_RE) if (re.test(probe)) return kind;
  return 'generic';
}

export const toColor = (hex: number): THREE.Color => new THREE.Color(hex);
