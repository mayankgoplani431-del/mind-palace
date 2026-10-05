import * as THREE from 'three';
import type { ObjectDef } from '../types';
import { C, at, geo, grp, mat, mesh, named } from '../kit';
import { PI, arc, makeGetter, roundRect, rod, waveFlag } from './culture-util';

const book: ObjectDef = {
  key: 'book',
  name: { en: 'Book', hi: 'किताब', mr: 'पुस्तक' },
  tags: {
    en: [
      'book',
      'read',
      'reading',
      'textbook',
      'chapter',
      'literature',
      'novel',
      'library',
      'study',
      'knowledge',
      'author',
      'education',
      'story',
      'text',
    ],
    hi: ['किताब', 'पुस्तक', 'पढ़ाई', 'अध्याय', 'साहित्य', 'ग्रंथ', 'लेखक', 'शिक्षा', 'उपन्यास'],
    mr: ['पुस्तक', 'पुस्तके', 'अध्याय', 'साहित्य', 'ग्रंथ', 'लेखक', 'शिक्षण', 'वाचन', 'कादंबरी'],
  },
  build() {
    const cover = mat(C.crimson, { rough: 0.5, metal: 0.05, clearcoat: 0.4 });
    const navy = mat(C.navy, { rough: 0.5, clearcoat: 0.3 });
    const pg = mat(0xfff6dc, { rough: 0.9 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.3 });
    const ink = mat(0x5b3a1e, { rough: 0.9 });
    const teal = mat(C.teal, { rough: 0.7 });
    const sun = mat(C.yellow, { rough: 0.6, emissive: C.orange, glow: 0.2 });
    const g = grp();
    g.add(mesh(geo.box(0.95, 0.14, 0.7), navy, [0.02, 0.07, 0]));
    g.add(mesh(geo.box(0.92, 0.1, 0.64), pg, [0.06, 0.07, 0]));
    g.add(mesh(geo.box(0.02, 0.12, 0.5), gold, [-0.46, 0.07, 0]));
    const open = grp();
    open.position.y = 0.14;
    for (const s of [-1, 1]) {
      const half = grp();
      half.rotation.z = s * 0.13;
      half.add(mesh(geo.box(0.6, 0.035, 0.82), cover, [s * 0.31, 0.0175, 0]));
      half.add(mesh(geo.box(0.56, 0.09, 0.76), pg, [s * 0.3, 0.08, 0]));
      half.add(mesh(geo.box(0.6, 0.01, 0.03), gold, [s * 0.31, 0.04, 0.4]));
      if (s === 1) {
        for (let i = 0; i < 7; i++)
          half.add(
            mesh(geo.box(i % 3 === 2 ? 0.3 : 0.44, 0.004, 0.02), ink, [s * 0.3, 0.127, -0.3 + i * 0.1]),
          );
      } else {
        half.add(mesh(geo.box(0.4, 0.004, 0.3), teal, [s * 0.3, 0.127, -0.17]));
        half.add(mesh(geo.cyl(0.07, 0.07, 0.006, 20), sun, [s * 0.36, 0.13, -0.2]));
        for (let i = 0; i < 3; i++)
          half.add(mesh(geo.box(0.42, 0.004, 0.02), ink, [s * 0.3, 0.127, 0.1 + i * 0.1]));
      }
      open.add(half);
    }
    open.add(mesh(geo.box(0.04, 0.004, 0.36), mat(C.red, { rough: 0.5 }), [0.05, 0.12, 0.58]));
    g.add(open);
    return g;
  },
};

const scroll: ObjectDef = {
  key: 'scroll',
  name: { en: 'Scroll', hi: 'पांडुलिपि', mr: 'हस्तलिखित' },
  tags: {
    en: [
      'scroll',
      'manuscript',
      'document',
      'treaty',
      'edict',
      'decree',
      'charter',
      'inscription',
      'ancient',
      'record',
      'law',
      'proclamation',
      'declaration',
      'manifesto',
    ],
    hi: ['पांडुलिपि', 'अभिलेख', 'शिलालेख', 'संधि', 'फरमान', 'घोषणा', 'दस्तावेज़', 'आज्ञापत्र'],
    mr: ['हस्तलिखित', 'अभिलेख', 'शिलालेख', 'तह', 'जाहीरनामा', 'फर्मान', 'दस्तऐवज', 'करार'],
  },
  build() {
    const parch = mat(C.parchment, { rough: 0.85 });
    const parchD = mat(0xe2c890, { rough: 0.9 });
    const wood = mat(C.darkWood, { rough: 0.5, clearcoat: 0.3 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.3 });
    const red = mat(C.crimson, { rough: 0.35, clearcoat: 0.6 });
    const ink = mat(0x5b3a1e, { rough: 0.9 });
    const g = grp();
    for (const y of [1.0, 0.08]) {
      const rad = y > 0.5 ? 0.11 : 0.07;
      g.add(mesh(geo.cyl(rad, rad, 0.78, 24), parchD, [0, y, 0], [0, 0, PI / 2]));
      g.add(mesh(geo.cyl(0.03, 0.03, 0.98, 10), wood, [0, y, 0], [0, 0, PI / 2]));
      for (const s of [-1, 1]) g.add(mesh(geo.sphere(0.06, 14, 10), gold, [s * 0.5, y, 0]));
    }
    g.add(mesh(geo.box(0.74, 0.88, 0.012), parch, [0, 0.54, 0]));
    for (const s of [-1, 1]) {
      g.add(mesh(geo.box(0.02, 0.84, 0.016), gold, [-0.33, 0.54, s * 0.001]));
      g.add(mesh(geo.box(0.02, 0.84, 0.016), gold, [0.33, 0.54, s * 0.001]));
      for (let i = 0; i < 6; i++)
        g.add(mesh(geo.box(i % 3 === 2 ? 0.34 : 0.5, 0.028, 0.004), ink, [0, 0.83 - i * 0.087, s * 0.008]));
      const seal = grp(mesh(geo.cyl(0.075, 0.075, 0.02, 20), red, [0, 0, 0], [PI / 2, 0, 0]));
      seal.add(mesh(geo.torus(0.045, 0.01, 8, 20), gold, [0, 0, 0.012]));
      seal.position.set(0.1, 0.26, s * 0.012);
      g.add(seal);
      g.add(mesh(geo.box(0.04, 0.17, 0.008), red, [0.05, 0.16, s * 0.01], [0, 0, 0.3]));
      g.add(mesh(geo.box(0.04, 0.17, 0.008), red, [0.15, 0.16, s * 0.01], [0, 0, -0.3]));
    }
    return g;
  },
};

const sword: ObjectDef = {
  key: 'sword',
  name: { en: 'Sword', hi: 'तलवार', mr: 'तलवार' },
  tags: {
    en: [
      'sword',
      'blade',
      'weapon',
      'war',
      'battle',
      'warrior',
      'knight',
      'duel',
      'conquest',
      'army',
      'bravery',
      'valour',
      'military',
      'samurai',
    ],
    hi: ['तलवार', 'युद्ध', 'योद्धा', 'शस्त्र', 'वीरता', 'लड़ाई', 'सेना', 'हथियार'],
    mr: ['तलवार', 'युद्ध', 'योद्धा', 'शस्त्र', 'शौर्य', 'लढाई', 'सैन्य', 'हत्यार', 'पराक्रम'],
  },
  build() {
    const steel = mat(0xe4eaf0, { metal: 0.95, rough: 0.12 });
    const steelD = mat(0x6b7785, { metal: 0.9, rough: 0.3 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.25 });
    const red = mat(C.crimson, { rough: 0.7 });
    const gem = mat(C.red, { rough: 0.1, emissive: C.red, glow: 0.4, clearcoat: 1 });
    const stone = mat(C.darkStone, { rough: 0.95, flat: true });
    const g = grp(mesh(geo.dodeca(0.3), stone, [0, 0.08, 0], [0, 0.4, 0], [1.1, 0.5, 1.05]));
    const s = grp();
    s.position.y = 1.2;
    const blade = mesh(
      geo.extrude(
        [
          [-0.08, 0],
          [-0.08, -1.0],
          [0, -1.2],
          [0.08, -1.0],
          [0.08, 0],
        ],
        0.03,
        0.008,
      ),
      steel,
      [0, 0, -0.023],
    );
    s.add(blade);
    for (const z of [-1, 1]) s.add(mesh(geo.box(0.02, 0.85, 0.012), steelD, [0, -0.5, z * 0.03]));
    s.add(mesh(geo.box(0.56, 0.065, 0.1), gold, [0, 0.0325, 0]));
    for (const x of [-1, 1]) s.add(mesh(geo.sphere(0.06, 16, 12), gold, [x * 0.28, 0.0325, 0]));
    for (const z of [-1, 1]) s.add(mesh(geo.sphere(0.032, 14, 10), gem, [0, 0.0325, z * 0.055]));
    s.add(mesh(geo.cyl(0.032, 0.032, 0.25, 16), red, [0, 0.18, 0]));
    for (const y of [0.11, 0.18, 0.25])
      s.add(mesh(geo.torus(0.034, 0.008, 6, 16), gold, [0, y, 0], [PI / 2, 0, 0]));
    s.add(mesh(geo.sphere(0.06, 16, 12), gold, [0, 0.34, 0]));
    g.add(s);
    return g;
  },
};

const crown: ObjectDef = {
  key: 'crown',
  name: { en: 'Crown', hi: 'मुकुट', mr: 'मुकुट' },
  tags: {
    en: [
      'crown',
      'king',
      'queen',
      'monarchy',
      'emperor',
      'empire',
      'royal',
      'throne',
      'coronation',
      'ruler',
      'sovereign',
      'kingdom',
      'dynasty',
      'reign',
    ],
    hi: ['मुकुट', 'राजा', 'रानी', 'सम्राट', 'राजतिलक', 'राजवंश', 'साम्राज्य', 'राज्याभिषेक', 'सिंहासन'],
    mr: ['मुकुट', 'राजा', 'राणी', 'सम्राट', 'राज्याभिषेक', 'राजवंश', 'साम्राज्य', 'सिंहासन', 'छत्रपती'],
  },
  build() {
    const gold = mat(C.gold, { metal: 0.95, rough: 0.2, clearcoat: 0.5 });
    const velvet = mat(C.crimson, { rough: 0.9 });
    const pearl = mat(C.white, { rough: 0.15, clearcoat: 1 });
    const gems = [C.red, C.blue, C.green].map((c) =>
      mat(c, { rough: 0.08, emissive: c, glow: 0.35, clearcoat: 1 }),
    );
    const g = grp();
    g.add(
      mesh(
        geo.lathe(
          [
            [0.36, 0],
            [0.4, 0.04],
            [0.43, 0.2],
            [0.42, 0.24],
          ],
          40,
        ),
        mat(C.gold, { metal: 0.95, rough: 0.2, side: THREE.DoubleSide }),
      ),
    );
    for (const y of [0.01, 0.23])
      g.add(mesh(geo.torus(y < 0.1 ? 0.37 : 0.425, 0.026, 8, 40), gold, [0, y, 0], [PI / 2, 0, 0]));
    g.add(mesh(geo.dome(0.4, 24), velvet, [0, 0.15, 0], [0, 0, 0], [1, 0.95, 1]));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * PI * 2;
      const x = Math.sin(a) * 0.42;
      const z = Math.cos(a) * 0.42;
      g.add(mesh(geo.cone(0.075, 0.3, 4), gold, [x, 0.38, z], [0, a, 0]));
      g.add(mesh(geo.sphere(0.045, 14, 10), pearl, [x, 0.55, z]));
      const b = a + PI / 5;
      const gem = gems[k % 3];
      if (gem)
        g.add(
          mesh(
            geo.sphere(0.055, 14, 10),
            gem,
            [Math.sin(b) * 0.43, 0.12, Math.cos(b) * 0.43],
            [0, 0, 0],
            [1, 1.2, 0.6],
          ),
        );
    }
    for (const r of [0, PI / 2]) {
      const a = mesh(arc(0.4, 0.024, PI), gold, [0, 0.22, 0], [0, r, 0], [1, 0.85, 1]);
      g.add(a);
    }
    g.add(mesh(geo.sphere(0.065, 18, 12), gold, [0, 0.58, 0]));
    g.add(mesh(geo.box(0.03, 0.14, 0.03), gold, [0, 0.69, 0]));
    g.add(mesh(geo.box(0.09, 0.03, 0.03), gold, [0, 0.71, 0]));
    return g;
  },
};

const fort: ObjectDef = {
  key: 'fort',
  name: { en: 'Fort', hi: 'किला', mr: 'किल्ला' },
  tags: {
    en: [
      'fort',
      'castle',
      'fortress',
      'shivaji',
      'maratha',
      'battle',
      'defence',
      'empire',
      'siege',
      'dynasty',
      'rampart',
      'rajput',
      'mughal',
      'stronghold',
    ],
    hi: [
      'किला',
      'दुर्ग',
      'गढ़',
      'शिवाजी',
      'मराठा',
      'युद्ध',
      'साम्राज्य',
      'रक्षा',
      'घेराबंदी',
      'राजपूत',
      'मुगल',
    ],
    mr: [
      'किल्ला',
      'गड',
      'दुर्ग',
      'शिवाजी',
      'मराठा',
      'युद्ध',
      'स्वराज्य',
      'तट',
      'बुरूज',
      'छत्रपती',
      'संरक्षण',
    ],
  },
  build() {
    const rock = mat(0x6f5640, { rough: 0.95, flat: true });
    const grass = mat(0x3c9e48, { rough: 0.9 });
    const wall = mat(0xd98a55, { rough: 0.85 });
    const tower = mat(0xc4683a, { rough: 0.85 });
    const dark = mat(0x3a2414, { rough: 0.7 });
    const saff = mat(C.orange, { rough: 0.6, emissive: C.orange, glow: 0.15, side: THREE.DoubleSide });
    const dome = mat(0xfff0d0, { rough: 0.45 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.3 });
    const g = grp();
    g.add(mesh(geo.cyl(0.55, 0.88, 0.42, 14), rock, [0, 0.21, 0]));
    g.add(mesh(geo.dome(0.57, 20), grass, [0, 0.42, 0], [0, 0, 0], [1, 0.2, 1]));
    const y0 = 0.45;
    g.add(mesh(geo.cyl(0.46, 0.5, 0.26, 24), wall, [0, y0 + 0.13, 0]));
    const top = y0 + 0.26;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2;
      if (Math.abs(((a + PI) % (PI * 2)) - PI) < 0.3) continue;
      g.add(
        mesh(geo.box(0.1, 0.06, 0.04), wall, [Math.sin(a) * 0.45, top + 0.03, Math.cos(a) * 0.45], [0, a, 0]),
      );
    }
    for (const a of [0.95, -0.95, 2.2, -2.2]) {
      const x = Math.sin(a) * 0.48;
      const z = Math.cos(a) * 0.48;
      g.add(mesh(geo.cyl(0.1, 0.125, 0.4, 14), tower, [x, y0 + 0.2, z]));
      g.add(mesh(geo.cyl(0.125, 0.11, 0.05, 14), wall, [x, y0 + 0.42, z]));
      g.add(mesh(geo.dome(0.09, 14), dome, [x, y0 + 0.44, z], [0, 0, 0], [1, 1.1, 1]));
      g.add(mesh(geo.sphere(0.014, 8, 6), gold, [x, y0 + 0.55, z]));
    }
    g.add(mesh(geo.box(0.3, 0.34, 0.14), tower, [0, y0 + 0.17, 0.47]));
    g.add(mesh(geo.box(0.1, 0.17, 0.03), dark, [0, y0 + 0.085, 0.545]));
    g.add(mesh(geo.cyl(0.05, 0.05, 0.03, 12), dark, [0, y0 + 0.17, 0.545], [PI / 2, 0, 0]));
    for (const x of [-0.11, 0, 0.11]) g.add(mesh(geo.box(0.07, 0.06, 0.05), tower, [x, y0 + 0.37, 0.47]));
    g.add(mesh(geo.box(0.26, 0.3, 0.26), tower, [0, top + 0.15, -0.02]));
    g.add(mesh(geo.box(0.3, 0.05, 0.3), wall, [0, top + 0.32, -0.02]));
    g.add(mesh(geo.dome(0.12, 16), dome, [0, top + 0.345, -0.02], [0, 0, 0], [1, 1.2, 1]));
    g.add(mesh(geo.cyl(0.01, 0.01, 0.34, 6), dark, [0, top + 0.54, -0.02]));
    const cloth = new THREE.PlaneGeometry(0.34, 0.2, 10, 3);
    cloth.translate(0.17, 0, 0);
    g.add(at(named(mesh(cloth, saff), 'flag'), 0.008, top + 0.62, -0.02));
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const f = get(model, 'flag');
      if (f) waveFlag(f, 0.34, t, 0.05);
    };
  })(),
};

const key: ObjectDef = {
  key: 'key',
  name: { en: 'Key', hi: 'चाबी', mr: 'किल्ली' },
  tags: {
    en: [
      'key',
      'unlock',
      'access',
      'answer',
      'solution',
      'important',
      'secret',
      'password',
      'security',
      'legend',
      'code',
      'critical',
      'main',
      'essential',
      'solve',
    ],
    hi: ['चाबी', 'कुंजी', 'रहस्य', 'समाधान', 'महत्वपूर्ण', 'मुख्य', 'सुरक्षा'],
    mr: ['किल्ली', 'चावी', 'गुरुकिल्ली', 'रहस्य', 'उपाय', 'महत्त्वाचे', 'मुख्य', 'सुरक्षा'],
  },
  build() {
    const gold = mat(C.gold, { metal: 0.95, rough: 0.2, clearcoat: 0.4 });
    const gem = mat(C.red, { rough: 0.08, emissive: C.red, glow: 0.4, clearcoat: 1 });
    const g = grp();
    g.add(mesh(geo.torus(0.19, 0.05, 14, 40), gold, [0, 1.0, 0]));
    g.add(mesh(geo.sphere(0.075, 18, 14), gem, [0, 1.0, 0]));
    for (const a of [PI / 2, PI / 2 + (2 * PI) / 3, PI / 2 + (4 * PI) / 3]) {
      g.add(mesh(geo.sphere(0.075, 16, 12), gold, [Math.cos(a) * 0.27, 1.0 + Math.sin(a) * 0.27, 0]));
    }
    g.add(mesh(geo.cyl(0.042, 0.042, 0.82, 16), gold, [0, 0.42, 0]));
    for (const y of [0.73, 0.64]) g.add(mesh(geo.torus(0.06, 0.022, 8, 20), gold, [0, y, 0], [PI / 2, 0, 0]));
    g.add(mesh(geo.sphere(0.06, 14, 10), gold, [0, 0.83, 0]));
    g.add(mesh(geo.box(0.17, 0.07, 0.06), gold, [0.1, 0.03, 0]));
    g.add(mesh(geo.box(0.12, 0.07, 0.06), gold, [0.08, 0.16, 0]));
    g.add(mesh(geo.box(0.2, 0.07, 0.06), gold, [0.12, 0.29, 0]));
    g.add(mesh(geo.box(0.06, 0.07, 0.06), gold, [0.07, 0.42, 0]));
    return g;
  },
};

const lock: ObjectDef = {
  key: 'lock',
  name: { en: 'Padlock', hi: 'ताला', mr: 'कुलूप' },
  tags: {
    en: [
      'lock',
      'security',
      'privacy',
      'secure',
      'safe',
      'protection',
      'encryption',
      'password',
      'restricted',
      'private',
      'closed',
      'vault',
      'confidential',
      'copyright',
    ],
    hi: ['ताला', 'सुरक्षा', 'गोपनीयता', 'बंद', 'सुरक्षित', 'तिजोरी', 'एन्क्रिप्शन', 'पासवर्ड'],
    mr: ['कुलूप', 'सुरक्षा', 'गोपनीयता', 'बंद', 'सुरक्षित', 'तिजोरी', 'संरक्षण', 'पासवर्ड'],
  },
  build() {
    const gold = mat(C.gold, { metal: 0.92, rough: 0.25, clearcoat: 0.4 });
    const plate = mat(C.navy, { rough: 0.35, metal: 0.3, clearcoat: 0.6 });
    const steel = mat(C.silver, { metal: 1, rough: 0.15 });
    const black = mat(C.black, { rough: 0.6 });
    const g = grp();
    g.add(mesh(geo.extrude(roundRect(0.72, 0.56, 0.1), 0.2, 0.015), gold, [0, 0.28, -0.1]));
    for (const x of [-0.2, 0.2]) g.add(mesh(geo.cyl(0.045, 0.045, 0.16, 14), steel, [x, 0.62, 0]));
    g.add(mesh(arc(0.2, 0.045, PI), steel, [0, 0.69, 0]));
    for (const s of [-1, 1]) {
      g.add(
        mesh(geo.extrude(roundRect(0.56, 0.4, 0.07), 0.012, 0.004), plate, [0, 0.28, s > 0 ? 0.114 : -0.126]),
      );
      g.add(mesh(geo.cyl(0.06, 0.06, 0.012, 20), black, [0, 0.33, s * 0.126], [PI / 2, 0, 0]));
      g.add(mesh(geo.box(0.04, 0.15, 0.012), black, [0, 0.22, s * 0.126]));
      for (const [x, y] of [
        [-0.23, 0.1],
        [0.23, 0.1],
        [-0.23, 0.46],
        [0.23, 0.46],
      ] as const) {
        g.add(mesh(geo.sphere(0.022, 8, 6), gold, [x, y, s * 0.125]));
      }
    }
    return g;
  },
};

const scales: ObjectDef = {
  key: 'scales',
  name: { en: 'Scales of Justice', hi: 'तराजू', mr: 'तराजू' },
  tags: {
    en: [
      'scales',
      'justice',
      'law',
      'court',
      'balance',
      'judge',
      'constitution',
      'rights',
      'fairness',
      'equality',
      'legal',
      'trial',
      'judiciary',
      'verdict',
      'lawyer',
      'supreme court',
    ],
    hi: [
      'तराजू',
      'न्याय',
      'कानून',
      'अदालत',
      'न्यायालय',
      'न्यायाधीश',
      'संविधान',
      'अधिकार',
      'संतुलन',
      'समानता',
      'निर्णय',
    ],
    mr: [
      'तराजू',
      'न्याय',
      'कायदा',
      'न्यायालय',
      'न्यायाधीश',
      'संविधान',
      'हक्क',
      'अधिकार',
      'समतोल',
      'समानता',
      'निकाल',
    ],
  },
  build() {
    const gold = mat(C.gold, { metal: 0.92, rough: 0.25, clearcoat: 0.4 });
    const marble = mat(C.marble, { rough: 0.3, clearcoat: 0.6 });
    const chain = mat(C.silver, { metal: 1, rough: 0.25 });
    const coin = mat(C.yellow, { metal: 0.95, rough: 0.2 });
    const gem = mat(C.teal, { rough: 0.08, emissive: C.teal, glow: 0.3, clearcoat: 1 });
    const g = grp();
    g.add(mesh(geo.cyl(0.42, 0.48, 0.08, 32), marble, [0, 0.04, 0]));
    g.add(mesh(geo.cyl(0.28, 0.34, 0.08, 32), gold, [0, 0.12, 0]));
    g.add(mesh(geo.cyl(0.05, 0.08, 1.0, 16), gold, [0, 0.66, 0]));
    g.add(mesh(geo.torus(0.07, 0.02, 8, 20), gold, [0, 0.35, 0], [PI / 2, 0, 0]));
    g.add(mesh(geo.sphere(0.09, 16, 12), gold, [0, 1.18, 0]));
    const beam = named(grp(), 'beam');
    beam.position.y = 1.08;
    beam.add(mesh(geo.box(1.0, 0.045, 0.06), gold));
    beam.add(mesh(geo.sphere(0.05, 12, 10), gold, [0, 0.06, 0]));
    for (const [i, s] of [-1, 1].entries()) {
      const pan = named(grp(), i === 0 ? 'panL' : 'panR');
      pan.position.set(s * 0.5, 0, 0);
      pan.add(mesh(geo.sphere(0.035, 10, 8), gold));
      pan.add(
        mesh(
          geo.lathe(
            [
              [0.001, -0.62],
              [0.12, -0.615],
              [0.22, -0.58],
              [0.26, -0.55],
              [0.25, -0.55],
            ],
            28,
          ),
          mat(C.gold, { metal: 0.92, rough: 0.25, side: THREE.DoubleSide }),
        ),
      );
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * PI * 2;
        pan.add(rod([0, 0, 0], [Math.cos(a) * 0.25, -0.55, Math.sin(a) * 0.25], 0.007, chain, 5));
      }
      if (s < 0) {
        for (let k = 0; k < 3; k++)
          pan.add(
            mesh(geo.cyl(0.085, 0.085, 0.022, 18), coin, [k * 0.03 - 0.03, -0.6 + k * 0.022, k * 0.02]),
          );
      } else {
        pan.add(mesh(geo.sphere(0.07, 16, 12), gem, [0, -0.51, 0]));
      }
      beam.add(pan);
    }
    g.add(beam);
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const b = get(model, 'beam');
      if (!b) return;
      const r = 0.06 + Math.sin(t * 1.3) * 0.1;
      b.rotation.z = r;
      const l = get(model, 'panL');
      const rr = get(model, 'panR');
      if (l) l.rotation.z = -r;
      if (rr) rr.rotation.z = -r;
    };
  })(),
};

export const cultureA: ObjectDef[] = [book, scroll, sword, crown, fort, key, lock, scales];
