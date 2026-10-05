import * as THREE from 'three';
import type { ObjectDef } from '../types';
import { C, at, geo, grp, mat, mesh, named } from '../kit';
import { PI, arc, flicker, makeGetter, rod, star, wave, waveFlag } from './culture-util';

const coin: ObjectDef = {
  key: 'coin',
  name: { en: 'Coin', hi: 'सिक्का', mr: 'नाणे' },
  tags: {
    en: [
      'coin',
      'money',
      'currency',
      'economy',
      'economics',
      'trade',
      'finance',
      'mint',
      'rupee',
      'price',
      'wealth',
      'tax',
      'bank',
      'inflation',
      'profit',
      'market',
      'budget',
    ],
    hi: [
      'सिक्का',
      'मुद्रा',
      'धन',
      'अर्थव्यवस्था',
      'व्यापार',
      'अर्थशास्त्र',
      'कर',
      'बाज़ार',
      'महँगाई',
      'बजट',
      'रुपया',
    ],
    mr: [
      'नाणे',
      'चलन',
      'पैसा',
      'अर्थव्यवस्था',
      'व्यापार',
      'अर्थशास्त्र',
      'कर',
      'बाजार',
      'महागाई',
      'अंदाजपत्रक',
      'रुपया',
    ],
  },
  idle: ['float'],
  build() {
    const gold = mat(C.gold, { metal: 0.95, rough: 0.22, clearcoat: 0.4 });
    const goldD = mat(0xc98f1c, { metal: 0.95, rough: 0.3 });
    const g = grp();
    const c = named(grp(), 'spinner');
    c.position.set(-0.12, 0.46, 0);
    c.add(mesh(geo.cyl(0.4, 0.4, 0.07, 40), gold, [0, 0, 0], [PI / 2, 0, 0]));
    c.add(mesh(geo.torus(0.4, 0.038, 10, 40), gold));
    for (const s of [-1, 1]) {
      c.add(mesh(geo.torus(0.3, 0.013, 6, 40), goldD, [0, 0, s * 0.036]));
      c.add(
        mesh(
          geo.extrude(star(5, 0.23, 0.095), 0.014, 0),
          goldD,
          [0, -0.01, s * 0.036],
          [0, s > 0 ? 0 : PI, 0],
        ),
      );
    }
    g.add(c);
    for (let i = 0; i < 6; i++) {
      g.add(
        mesh(
          geo.cyl(0.22, 0.22, 0.05, 28),
          i % 2 ? gold : goldD,
          [0.62 + (i % 3) * 0.008, 0.028 + i * 0.053, 0.05],
          [0, i * 0.7, 0],
        ),
      );
    }
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const s = get(model, 'spinner');
      if (s) s.rotation.y = t * 2.2;
    };
  })(),
};

const clock: ObjectDef = {
  key: 'clock',
  name: { en: 'Clock', hi: 'घड़ी', mr: 'घड्याळ' },
  tags: {
    en: [
      'clock',
      'time',
      'hour',
      'minute',
      'schedule',
      'timeline',
      'deadline',
      'era',
      'period',
      'chronology',
      'duration',
      'age',
      'punctuality',
      'routine',
      'timetable',
      'date',
    ],
    hi: ['घड़ी', 'समय', 'घंटा', 'मिनट', 'कालक्रम', 'युग', 'अवधि', 'समयसारणी', 'तारीख'],
    mr: ['घड्याळ', 'वेळ', 'तास', 'मिनिट', 'कालक्रम', 'युग', 'कालावधी', 'वेळापत्रक', 'तारीख'],
  },
  build() {
    const red = mat(C.red, { rough: 0.3, clearcoat: 0.8 });
    const chrome = mat(C.silver, { metal: 1, rough: 0.12 });
    const face = mat(0xfffaf0, { rough: 0.5 });
    const black = mat(C.black, { rough: 0.5 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.3 });
    const secM = mat(C.crimson, { rough: 0.4, emissive: C.crimson, glow: 0.2 });
    const g = grp();
    g.add(mesh(geo.cyl(0.42, 0.42, 0.22, 40), red, [0, 0, 0], [PI / 2, 0, 0]));
    g.add(mesh(geo.torus(0.42, 0.035, 10, 40), chrome, [0, 0, 0.11]));
    g.add(mesh(geo.cyl(0.37, 0.37, 0.02, 40), face, [0, 0, 0.115], [PI / 2, 0, 0]));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      const big = i % 3 === 0;
      g.add(
        mesh(
          geo.box(big ? 0.035 : 0.02, big ? 0.075 : 0.045, 0.01),
          black,
          [Math.sin(a) * 0.31, Math.cos(a) * 0.31, 0.128],
          [0, 0, -a],
        ),
      );
    }
    const hand = (name: string, len: number, w: number, z: number, m: THREE.Material): THREE.Group => {
      const h = named(grp(mesh(geo.box(w, len, 0.012), m, [0, len / 2 - 0.03, 0])), name);
      h.position.z = z;
      return h;
    };
    g.add(
      hand('hHour', 0.19, 0.04, 0.133, black),
      hand('hMin', 0.29, 0.028, 0.14, black),
      hand('hSec', 0.32, 0.01, 0.147, secM),
    );
    g.add(mesh(geo.sphere(0.03, 12, 10), gold, [0, 0, 0.155]));
    const bells = named(grp(), 'bells');
    for (const s of [-1, 1]) {
      bells.add(mesh(geo.dome(0.15, 20), chrome, [s * 0.25, 0.42, 0], [0, 0, -s * 0.55], [1, 0.8, 1]));
      g.add(mesh(geo.cyl(0.015, 0.015, 0.12, 6), chrome, [s * 0.2, 0.4, 0], [0, 0, -s * 0.5]));
    }
    bells.add(mesh(geo.cyl(0.012, 0.012, 0.14, 6), chrome, [0, 0.5, 0]));
    bells.add(mesh(geo.sphere(0.04, 10, 8), chrome, [0, 0.58, 0]));
    g.add(bells);
    for (const s of [-1, 1])
      g.add(mesh(geo.cyl(0.025, 0.04, 0.2, 8), chrome, [s * 0.3, -0.42, 0], [0, 0, s * 0.45]));
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const h = get(model, 'hHour');
      const m = get(model, 'hMin');
      const s = get(model, 'hSec');
      if (h) h.rotation.z = -t * 0.1;
      if (m) m.rotation.z = -t * 1.2;
      if (s) s.rotation.z = -Math.floor(t * 2) * (PI / 30) * 2;
      const b = get(model, 'bells');
      if (b) b.rotation.z = t % 6 < 1.2 ? Math.sin(t * 60) * 0.05 : 0;
    };
  })(),
};

const compass: ObjectDef = {
  key: 'compass',
  name: { en: 'Compass', hi: 'दिशासूचक', mr: 'होकायंत्र' },
  tags: {
    en: [
      'compass',
      'direction',
      'navigation',
      'north',
      'south',
      'east',
      'west',
      'explorer',
      'voyage',
      'discovery',
      'magnet',
      'magnetism',
      'columbus',
      'vasco da gama',
      'exploration',
      'geography',
      'guide',
    ],
    hi: [
      'दिशा',
      'दिशासूचक',
      'कंपास',
      'उत्तर',
      'दक्षिण',
      'पूर्व',
      'पश्चिम',
      'खोज',
      'समुद्री यात्रा',
      'नौवहन',
      'चुंबक',
      'मार्गदर्शन',
    ],
    mr: [
      'दिशा',
      'होकायंत्र',
      'उत्तर',
      'दक्षिण',
      'पूर्व',
      'पश्चिम',
      'शोध',
      'सागरी प्रवास',
      'दिशादर्शन',
      'चुंबक',
      'मार्गदर्शन',
    ],
  },
  build() {
    const brass = mat(0xc9973a, { metal: 0.9, rough: 0.28, clearcoat: 0.3 });
    const gold = mat(C.gold, { metal: 0.95, rough: 0.2 });
    const cream = mat(0xfff3d6, { rough: 0.6 });
    const navy = mat(C.navy, { rough: 0.5 });
    const rose = mat(0xa0632a, { rough: 0.5 });
    const red = mat(C.red, { rough: 0.3, emissive: C.red, glow: 0.25 });
    const white = mat(C.white, { rough: 0.3 });
    const glass = mat(C.glass, { opacity: 0.22, rough: 0.05, clearcoat: 1 });
    const t = grp();
    t.rotation.x = 1.0;
    t.add(mesh(geo.cyl(0.5, 0.5, 0.1, 44), brass, [0, 0.05, 0]));
    t.add(mesh(geo.torus(0.45, 0.035, 10, 44), gold, [0, 0.1, 0], [PI / 2, 0, 0]));
    t.add(mesh(geo.cyl(0.42, 0.42, 0.02, 44), cream, [0, 0.105, 0]));
    t.add(mesh(geo.ring(0.34, 0.4, 44), navy, [0, 0.1165, 0], [-PI / 2, 0, 0]));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2;
      t.add(
        mesh(
          geo.box(0.012, 0.004, i % 4 === 0 ? 0.05 : 0.03),
          cream,
          [Math.sin(a) * 0.37, 0.119, Math.cos(a) * 0.37],
          [0, a, 0],
        ),
      );
    }
    t.add(mesh(geo.extrude(star(8, 0.32, 0.08), 0.01, 0), rose, [0, 0.118, 0], [-PI / 2, 0, 0]));
    t.add(
      mesh(
        geo.extrude(
          [
            [-0.06, 0.05],
            [0, 0.34],
            [0.06, 0.05],
          ],
          0.012,
          0,
        ),
        red,
        [0, 0.12, 0],
        [-PI / 2, 0, 0],
      ),
    );
    const needle = named(grp(), 'needle');
    needle.position.y = 0.15;
    needle.add(mesh(geo.cone(0.05, 0.3, 4), red, [0, 0, -0.15], [-PI / 2, PI / 4, 0], [1, 1, 0.45]));
    needle.add(mesh(geo.cone(0.05, 0.3, 4), white, [0, 0, 0.15], [PI / 2, PI / 4, 0], [1, 1, 0.45]));
    needle.add(mesh(geo.sphere(0.04, 12, 10), gold, [0, 0.01, 0]));
    t.add(needle);
    t.add(mesh(geo.cyl(0.44, 0.44, 0.008, 44), glass, [0, 0.19, 0]));
    t.add(mesh(geo.cyl(0.05, 0.05, 0.1, 12), gold, [0, 0.05, -0.54], [PI / 2, 0, 0]));
    t.add(mesh(geo.torus(0.07, 0.022, 8, 20), gold, [0, 0.05, -0.62], [0, PI / 2, 0]));
    return grp(t);
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const n = get(model, 'needle');
      if (n) n.rotation.y = Math.sin(t * 1.7) * 0.35 + Math.sin(t * 4.3) * 0.12;
    };
  })(),
};

const lantern: ObjectDef = {
  key: 'lantern',
  name: { en: 'Lantern', hi: 'लालटेन', mr: 'कंदील' },
  tags: {
    en: [
      'lantern',
      'light',
      'lamp',
      'guide',
      'enlightenment',
      'night',
      'darkness',
      'renaissance',
      'reform',
      'awareness',
      'hope',
      'wisdom',
      'discovery',
      'revolution',
    ],
    hi: ['लालटेन', 'दीपक', 'प्रकाश', 'ज्ञान', 'मार्गदर्शन', 'अंधकार', 'प्रबोधन', 'जागरूकता', 'सुधार'],
    mr: ['कंदील', 'दिवा', 'प्रकाश', 'ज्ञान', 'मार्गदर्शन', 'अंधार', 'प्रबोधन', 'जागृती', 'सुधारणा'],
  },
  build() {
    const brass = mat(0xb8862f, { metal: 0.85, rough: 0.35 });
    const roof = mat(C.teal, { metal: 0.5, rough: 0.35, clearcoat: 0.5 });
    const glass = mat(0xffe9b0, { opacity: 0.3, rough: 0.05, clearcoat: 1, side: THREE.DoubleSide });
    const wax = mat(0xfff1d6, { rough: 0.8 });
    const flameO = mat(C.orange, { rough: 0.4, emissive: C.orange, glow: 1.4, opacity: 0.8 });
    const flameI = mat(C.yellow, { rough: 0.4, emissive: 0xfff3a0, glow: 1.8 });
    const g = grp();
    g.add(mesh(geo.cyl(0.27, 0.32, 0.1, 6), brass, [0, 0.05, 0]));
    g.add(mesh(geo.cyl(0.25, 0.25, 0.7, 6), glass, [0, 0.45, 0]));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + PI / 6;
      g.add(mesh(geo.cyl(0.017, 0.017, 0.74, 6), brass, [Math.sin(a) * 0.255, 0.47, Math.cos(a) * 0.255]));
    }
    g.add(mesh(geo.cyl(0.29, 0.29, 0.05, 6), brass, [0, 0.83, 0]));
    g.add(mesh(geo.cone(0.34, 0.24, 6), roof, [0, 0.97, 0]));
    g.add(mesh(geo.cyl(0.07, 0.07, 0.06, 12), brass, [0, 1.11, 0]));
    g.add(mesh(arc(0.17, 0.02, PI), brass, [0, 1.14, 0]));
    g.add(mesh(geo.cyl(0.05, 0.05, 0.3, 12), wax, [0, 0.25, 0]));
    g.add(mesh(geo.cyl(0.006, 0.006, 0.05, 6), mat(C.black), [0, 0.42, 0]));
    const fl = named(grp(), 'flame');
    fl.position.y = 0.43;
    fl.scale.setScalar(1.35);
    fl.add(
      mesh(
        geo.lathe(
          [
            [0.001, 0],
            [0.05, 0.04],
            [0.055, 0.1],
            [0.035, 0.19],
            [0.012, 0.26],
            [0.001, 0.29],
          ],
          14,
        ),
        flameO,
      ),
    );
    fl.add(
      mesh(
        geo.lathe(
          [
            [0.001, 0],
            [0.028, 0.03],
            [0.03, 0.07],
            [0.015, 0.13],
            [0.001, 0.16],
          ],
          12,
        ),
        flameI,
        [0, 0.005, 0],
      ),
    );
    g.add(fl);
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const f = get(model, 'flame');
      if (f)
        f.scale.set(
          1.35 * (0.95 + (flicker(t) - 1) * 0.5),
          1.35 * flicker(t, 1),
          1.35 * (0.95 + (flicker(t, 2) - 1) * 0.5),
        );
    };
  })(),
};

const anvil: ObjectDef = {
  key: 'anvil',
  name: { en: 'Anvil', hi: 'निहाई', mr: 'ऐरण' },
  tags: {
    en: [
      'anvil',
      'blacksmith',
      'forge',
      'iron',
      'metal',
      'industry',
      'industrial revolution',
      'factory',
      'hammer',
      'steel',
      'manufacturing',
      'craft',
      'labour',
      'mining',
      'tools',
    ],
    hi: [
      'निहाई',
      'लोहार',
      'लोहा',
      'उद्योग',
      'औद्योगिक क्रांति',
      'कारखाना',
      'हथौड़ा',
      'इस्पात',
      'धातु',
      'श्रम',
    ],
    mr: ['ऐरण', 'लोहार', 'लोखंड', 'उद्योग', 'औद्योगिक क्रांती', 'कारखाना', 'हातोडा', 'पोलाद', 'धातू', 'श्रम'],
  },
  idle: ['float'],
  build() {
    const iron = mat(0x4a5059, { metal: 0.9, rough: 0.35 });
    const face = mat(C.steel, { metal: 0.95, rough: 0.15 });
    const wood = mat(C.wood, { rough: 0.85 });
    const woodD = mat(C.darkWood, { rough: 0.8 });
    const hot = mat(0xff5a1f, { rough: 0.5, emissive: C.orange, glow: 1.6 });
    const spark = mat(C.yellow, { rough: 0.3, emissive: 0xffd93b, glow: 2 });
    const g = grp();
    g.add(mesh(geo.cyl(0.32, 0.36, 0.3, 14), wood, [0.05, 0.15, 0]));
    for (const y of [0.08, 0.22])
      g.add(mesh(geo.torus(0.345, 0.012, 6, 24), iron, [0.05, y, 0], [PI / 2, 0, 0]));
    const pts: Array<[number, number]> = [
      [-0.3, 0],
      [0.3, 0],
      [0.3, 0.05],
      [0.14, 0.1],
      [0.14, 0.25],
      [0.3, 0.28],
      [0.6, 0.31],
      [0.66, 0.35],
      [0.6, 0.39],
      [0.36, 0.4],
      [-0.36, 0.4],
      [-0.36, 0.32],
      [-0.14, 0.28],
      [-0.14, 0.1],
      [-0.3, 0.05],
    ];
    g.add(mesh(geo.extrude(pts, 0.3, 0.012), iron, [0.0, 0.3, -0.15]));
    g.add(mesh(geo.box(0.62, 0.012, 0.3), face, [-0.05, 0.718, 0]));
    g.add(mesh(geo.cyl(0.03, 0.03, 0.02, 10), mat(C.black), [-0.22, 0.73, 0]));
    g.add(mesh(geo.box(0.34, 0.05, 0.09), hot, [0.0, 0.75, 0], [0, 0.3, 0]));
    g.add(mesh(geo.cyl(0.02, 0.02, 0.6, 8), woodD, [0.05, 0.03, 0.5], [0, 0, PI / 2]));
    g.add(mesh(geo.box(0.12, 0.12, 0.24), iron, [-0.27, 0.06, 0.5]));
    for (let i = 0; i < 6; i++) g.add(named(mesh(geo.sphere(0.02, 6, 6), spark, [0, 0.8, 0]), `sp${i}`));
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      for (let i = 0; i < 6; i++) {
        const s = get(model, `sp${i}`);
        if (!s) continue;
        const p = (t * 0.8 + i / 6) % 1;
        s.position.set(
          Math.cos(i * 2.4) * p * 0.45,
          0.8 + p * 0.45 - p * p * 0.35,
          Math.sin(i * 2.4) * p * 0.3,
        );
        s.scale.setScalar(Math.max(0.01, 1 - p));
      }
    };
  })(),
};

const bell: ObjectDef = {
  key: 'bell',
  name: { en: 'Bell', hi: 'घंटी', mr: 'घंटा' },
  tags: {
    en: [
      'bell',
      'ring',
      'alarm',
      'alert',
      'church',
      'temple',
      'school',
      'announce',
      'freedom',
      'liberty bell',
      'signal',
      'warning',
      'toll',
      'call',
      'revolution',
      'celebration',
    ],
    hi: ['घंटी', 'घंटा', 'मंदिर', 'चेतावनी', 'सूचना', 'स्वतंत्रता', 'विद्यालय', 'आवाज़', 'क्रांति'],
    mr: ['घंटा', 'घंटी', 'मंदिर', 'इशारा', 'सूचना', 'स्वातंत्र्य', 'शाळा', 'आवाज', 'क्रांती'],
  },
  idle: ['float'],
  build() {
    const gold = mat(C.gold, { metal: 0.95, rough: 0.25, clearcoat: 0.3 });
    const bronze = mat(C.bronze, { metal: 0.9, rough: 0.35 });
    const wood = mat(C.darkWood, { rough: 0.6, clearcoat: 0.2 });
    const g = grp();
    for (const s of [-1, 1]) {
      g.add(mesh(geo.cyl(0.05, 0.06, 1.1, 10), wood, [s * 0.55, 0.55, 0]));
      g.add(mesh(geo.box(0.2, 0.06, 0.55), wood, [s * 0.55, 0.03, 0]));
      g.add(mesh(geo.sphere(0.06, 10, 8), gold, [s * 0.55, 1.13, 0]));
      g.add(rod([s * 0.55, 0.12, 0.2], [s * 0.55, 0.85, 0.02], 0.02, wood, 6));
    }
    g.add(mesh(geo.cyl(0.05, 0.05, 1.2, 10), wood, [0, 1.0, 0], [0, 0, PI / 2]));
    const sw = named(grp(), 'swing');
    sw.position.y = 1.0;
    sw.add(mesh(geo.box(0.14, 0.09, 0.1), wood, [0, -0.04, 0]));
    const b = grp();
    b.position.y = -0.92;
    b.add(
      mesh(
        geo.lathe(
          [
            [0.43, 0],
            [0.4, 0.05],
            [0.31, 0.14],
            [0.24, 0.32],
            [0.2, 0.5],
            [0.14, 0.62],
            [0.06, 0.69],
            [0.001, 0.7],
          ],
          36,
        ),
        gold,
      ),
    );
    b.add(mesh(geo.torus(0.42, 0.03, 8, 36), bronze, [0, 0.02, 0], [PI / 2, 0, 0]));
    b.add(mesh(geo.torus(0.305, 0.015, 8, 32), bronze, [0, 0.16, 0], [PI / 2, 0, 0]));
    b.add(mesh(geo.torus(0.2, 0.014, 8, 28), bronze, [0, 0.46, 0], [PI / 2, 0, 0]));
    b.add(mesh(geo.sphere(0.055, 12, 10), bronze, [0, 0.72, 0]));
    const cl = named(grp(), 'clapper');
    cl.position.y = 0.6;
    cl.add(mesh(geo.cyl(0.012, 0.012, 0.6, 6), bronze, [0, -0.3, 0]));
    cl.add(mesh(geo.sphere(0.06, 12, 10), bronze, [0, -0.64, 0]));
    b.add(cl);
    sw.add(b);
    g.add(sw);
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const s = get(model, 'swing');
      if (s) s.rotation.z = Math.sin(t * 2.2) * 0.3;
      const c = get(model, 'clapper');
      if (c) c.rotation.z = Math.sin(t * 2.2 - 1.1) * 0.45;
    };
  })(),
};

const shieldPts = (k: number): Array<[number, number]> => {
  const half: Array<[number, number]> = [
    [0.42, 0.48],
    [0.42, 0.2],
    [0.38, 0.0],
    [0.28, -0.2],
    [0.14, -0.38],
    [0, -0.5],
  ];
  const right = half.map(([x, y]): [number, number] => [x * k, y * k]);
  const leftUp = [...right]
    .reverse()
    .slice(1)
    .map(([x, y]): [number, number] => [-x, y]);
  const top: Array<[number, number]> = [
    [-0.21 * k, 0.52 * k],
    [0, 0.48 * k],
    [0.21 * k, 0.52 * k],
  ];
  return [...right, ...leftUp, ...top];
};

const shield: ObjectDef = {
  key: 'shield',
  name: { en: 'Shield', hi: 'ढाल', mr: 'ढाल' },
  tags: {
    en: [
      'shield',
      'defence',
      'defense',
      'protection',
      'armour',
      'armor',
      'guard',
      'safe',
      'security',
      'knight',
      'heraldry',
      'coat of arms',
      'immunity',
      'safeguard',
      'army',
      'border',
    ],
    hi: ['ढाल', 'रक्षा', 'सुरक्षा', 'कवच', 'बचाव', 'प्रतिरक्षा', 'सीमा', 'सेना', 'संरक्षण'],
    mr: ['ढाल', 'संरक्षण', 'सुरक्षा', 'कवच', 'बचाव', 'प्रतिकार', 'सीमा', 'सैन्य', 'रक्षण'],
  },
  build() {
    const gold = mat(C.gold, { metal: 0.92, rough: 0.25, clearcoat: 0.4 });
    const navy = mat(C.navy, { rough: 0.35, metal: 0.3, clearcoat: 0.7 });
    const red = mat(C.crimson, { rough: 0.35, metal: 0.2, clearcoat: 0.6 });
    const g = grp();
    g.add(mesh(geo.extrude(shieldPts(1), 0.06, 0.02), gold, [0, 0, -0.03]));
    g.add(mesh(geo.extrude(shieldPts(0.86), 0.03, 0.01), navy, [0, 0, 0.035]));
    g.add(mesh(geo.box(0.11, 0.78, 0.02), red, [0, 0.02, 0.08]));
    g.add(mesh(geo.box(0.6, 0.11, 0.02), red, [0, 0.22, 0.08]));
    g.add(mesh(geo.sphere(0.1, 18, 12), gold, [0, 0.22, 0.09], [0, 0, 0], [1, 1, 0.7]));
    for (const [x, y] of [
      [-0.21, 0.36],
      [0.21, 0.36],
      [-0.14, -0.06],
      [0.14, -0.06],
    ] as const) {
      g.add(mesh(geo.extrude(star(5, 0.075, 0.032), 0.012, 0), gold, [x, y, 0.08]));
    }
    return g;
  },
};

const FLAG_W = 0.98;
const flag: ObjectDef = {
  key: 'flag',
  name: { en: 'Flag', hi: 'झंडा', mr: 'ध्वज' },
  tags: {
    en: [
      'flag',
      'nation',
      'national',
      'country',
      'independence',
      'freedom',
      'patriotism',
      'tricolour',
      'republic',
      'unity',
      'anthem',
      'tiranga',
      'sovereignty',
      'democracy',
      'identity',
      'swaraj',
    ],
    hi: [
      'झंडा',
      'तिरंगा',
      'ध्वज',
      'राष्ट्र',
      'स्वतंत्रता',
      'आज़ादी',
      'देशभक्ति',
      'गणतंत्र',
      'एकता',
      'स्वराज',
      'राष्ट्रीय',
    ],
    mr: [
      'ध्वज',
      'झेंडा',
      'तिरंगा',
      'राष्ट्र',
      'स्वातंत्र्य',
      'स्वराज्य',
      'देशभक्ती',
      'प्रजासत्ताक',
      'एकता',
      'राष्ट्रीय',
    ],
  },
  build() {
    const pole = mat(C.silver, { metal: 1, rough: 0.2 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.25 });
    const stone = mat(C.stone, { rough: 0.9 });
    const navy = mat(C.navy, { rough: 0.5, side: THREE.DoubleSide });
    const g = grp();
    g.add(mesh(geo.cyl(0.36, 0.42, 0.08, 24), stone, [0, 0.04, 0]));
    g.add(mesh(geo.cyl(0.24, 0.3, 0.08, 24), stone, [0, 0.12, 0]));
    g.add(mesh(geo.cyl(0.025, 0.032, 1.5, 12), pole, [0, 0.86, 0]));
    g.add(mesh(geo.sphere(0.06, 16, 12), gold, [0, 1.64, 0]));
    const cols = [0xff8a1f, 0xffffff, 0x0f9d2a];
    cols.forEach((c, i) => {
      const p = new THREE.PlaneGeometry(FLAG_W, 0.22, 14, 2);
      p.translate(FLAG_W / 2, 0, 0);
      const m = mat(c, { rough: 0.7, side: THREE.DoubleSide, emissive: c, glow: 0.08 });
      g.add(at(named(mesh(p, m), `cloth${i}`), 0.03, 1.42 - 0.11 - i * 0.22, 0));
    });
    const ch = named(grp(), 'chakra');
    ch.position.set(0.03 + FLAG_W / 2, 1.42 - 0.33, 0);
    ch.scale.setScalar(1.45);
    ch.add(mesh(geo.ring(0.058, 0.072, 28), navy));
    ch.add(mesh(geo.box(0.12, 0.008, 0.002), navy));
    ch.add(mesh(geo.box(0.008, 0.12, 0.002), navy));
    ch.add(mesh(geo.box(0.12, 0.008, 0.002), navy, [0, 0, 0], [0, 0, PI / 4]));
    ch.add(mesh(geo.box(0.12, 0.008, 0.002), navy, [0, 0, 0], [0, 0, -PI / 4]));
    g.add(ch);
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      for (let i = 0; i < 3; i++) {
        const c = get(model, `cloth${i}`);
        if (c) waveFlag(c, FLAG_W, t, 0.09);
      }
      const ch = get(model, 'chakra');
      if (ch) ch.position.z = wave(FLAG_W / 2, FLAG_W, t, 0.09);
    };
  })(),
};

export const cultureB: ObjectDef[] = [coin, clock, compass, lantern, anvil, bell, shield, flag];
