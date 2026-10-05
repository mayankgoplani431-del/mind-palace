import * as THREE from 'three';
import { C, at, geo, grp, mesh, named } from '../kit';
import type { ObjectDef } from '../types';
import { mat, part, slab, polyShape } from './nature-util';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- tree
const tree: ObjectDef = {
  key: 'tree',
  name: { en: 'Tree', hi: 'वृक्ष', mr: 'झाड' },
  tags: {
    en: [
      'tree',
      'trees',
      'forest',
      'photosynthesis',
      'plant',
      'roots',
      'ecosystem',
      'botany',
      'oxygen',
      'deforestation',
      'timber',
      'canopy',
      'afforestation',
      'biodiversity',
      'family tree',
      'genealogy',
    ],
    hi: [
      'पेड़',
      'वृक्ष',
      'जंगल',
      'वन',
      'प्रकाश संश्लेषण',
      'पौधा',
      'जड़',
      'वनस्पति',
      'ऑक्सीजन',
      'वनों की कटाई',
      'पर्यावरण',
    ],
    mr: [
      'झाड',
      'वृक्ष',
      'जंगल',
      'वन',
      'प्रकाश संश्लेषण',
      'वनस्पती',
      'मूळ',
      'झाडे',
      'ऑक्सिजन',
      'जंगलतोड',
      'पर्यावरण',
    ],
  },
  build() {
    const bark = mat(0x7a4a26, { rough: 0.9, flat: true });
    const g = grp(mesh(geo.cyl(0.66, 0.72, 0.08, 28), mat(0x2f8a3a, { rough: 0.95 }), [0, 0.04, 0]));
    g.add(
      mesh(
        geo.lathe(
          [
            [0.24, 0],
            [0.14, 0.1],
            [0.095, 0.3],
            [0.08, 0.55],
            [0.07, 0.78],
          ],
          14,
        ),
        bark,
        [0, 0.08, 0],
      ),
    );
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.5;
      g.add(
        mesh(
          geo.cone(0.05, 0.3, 6),
          bark,
          [Math.cos(a) * 0.2, 0.15, Math.sin(a) * 0.2],
          [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1],
        ),
      );
    }
    g.add(mesh(geo.cyl(0.03, 0.045, 0.36, 8), bark, [0.13, 0.75, 0], [0, 0, -0.75]));
    g.add(mesh(geo.cyl(0.03, 0.045, 0.36, 8), bark, [-0.13, 0.8, 0.03], [0, 0, 0.75]));

    const dark = mat(0x1c6f2e, { flat: true, rough: 0.8 });
    const mid = mat(0x2c9440, { flat: true, rough: 0.8 });
    const light = mat(0x4fb548, { flat: true, rough: 0.8 });
    const canopy = named(new THREE.Group(), 'canopy');
    canopy.position.y = 0.9;
    const blobs: Array<[number, number, number, number, THREE.Material]> = [
      [0, 0.0, 0, 0.44, dark],
      [0.32, -0.1, 0.12, 0.3, mid],
      [-0.32, -0.12, -0.05, 0.3, mid],
      [0.02, -0.1, -0.32, 0.28, dark],
      [0.1, -0.1, 0.32, 0.28, mid],
      [0.02, 0.36, 0, 0.3, light],
      [0.2, 0.26, -0.12, 0.2, light],
      [-0.18, 0.28, 0.14, 0.2, mid],
    ];
    for (const [x, y, z, r, m] of blobs) canopy.add(mesh(geo.icosa(r, 1), m, [x, y, z]));
    const apple = mat(C.red, { rough: 0.3, emissive: 0x551111, glow: 0.3 });
    for (const [x, y, z] of [
      [0.34, -0.12, 0.36],
      [-0.3, -0.18, 0.32],
      [0.4, 0.05, -0.2],
      [-0.15, 0.1, 0.42],
    ] as const) {
      canopy.add(mesh(geo.sphere(0.05, 12, 8), apple, [x, y, z]));
    }
    g.add(canopy);
    return g;
  },
  update(model, t) {
    const c = part(model, 'canopy');
    if (c) {
      c.rotation.z = Math.sin(t * 1.3) * 0.035;
      c.rotation.x = Math.cos(t * 1.1) * 0.025;
    }
  },
};

// ---------------------------------------------------------------- mountain
const mountain: ObjectDef = {
  key: 'mountain',
  name: { en: 'Mountain', hi: 'पर्वत', mr: 'डोंगर' },
  tags: {
    en: [
      'mountain',
      'mountains',
      'peak',
      'himalaya',
      'range',
      'highland',
      'plateau',
      'altitude',
      'glacier',
      'summit',
      'geography',
      'tectonic',
      'fold mountains',
      'everest',
      'hill',
      'ghats',
      'alps',
    ],
    hi: ['पर्वत', 'पहाड़', 'हिमालय', 'चोटी', 'पठार', 'पर्वतमाला', 'ऊँचाई', 'हिमनद', 'शिखर', 'घाट'],
    mr: ['पर्वत', 'डोंगर', 'हिमालय', 'शिखर', 'पठार', 'पर्वतरांग', 'सह्याद्री', 'उंची', 'हिमनदी', 'घाट'],
  },
  build() {
    const g = grp(mesh(geo.cyl(1.05, 1.1, 0.08, 32), mat(0x2f8a3a, { rough: 0.95 }), [0, 0.04, 0]));
    const snow = mat(0xf6f9ff, { rough: 0.45, flat: true, emissive: 0x88aaff, glow: 0.12 });
    const foot = mat(0x2d6a36, { rough: 0.95, flat: true });
    const peaks: Array<[number, number, number, number, number, number]> = [
      [0, 0, 0.62, 1.15, 0x525a78, 0.3],
      [-0.55, 0.2, 0.42, 0.78, 0x7a5646, 1.1],
      [0.5, -0.22, 0.4, 0.62, 0x41587a, 0.7],
    ];
    for (const [x, z, R, H, col, rot] of peaks) {
      const rock = mat(col, { rough: 0.9, flat: true });
      g.add(mesh(geo.cone(R * 1.45, H * 0.4, 8), foot, [x, 0.08 + H * 0.2, z], [0, rot, 0]));
      g.add(mesh(geo.cone(R, H, 7), rock, [x, 0.08 + H / 2, z], [0, rot, 0]));
      const k = 0.4;
      g.add(
        mesh(
          geo.cone(R * k, H * k, 7),
          snow,
          [x, 0.08 + H - (H * k) / 2 + 0.012, z],
          [0, rot, 0],
          [1.06, 1, 1.06],
        ),
      );
    }
    const pine = mat(0x1d6b3a, { flat: true, rough: 0.9 });
    for (const [x, z, s] of [
      [0.15, 0.78, 1],
      [-0.25, 0.72, 0.8],
      [0.6, 0.55, 0.9],
      [-0.85, -0.3, 0.8],
      [0.25, -0.75, 0.9],
    ] as const) {
      g.add(mesh(geo.cone(0.07 * s, 0.22 * s, 7), pine, [x, 0.08 + 0.11 * s, z]));
    }
    return g;
  },
};

// ---------------------------------------------------------------- pyramid
const pyramid: ObjectDef = {
  key: 'pyramid',
  name: { en: 'Pyramid', hi: 'पिरामिड', mr: 'पिरॅमिड' },
  tags: {
    en: [
      'pyramid',
      'pyramids',
      'egypt',
      'egyptian',
      'pharaoh',
      'mummy',
      'giza',
      'ancient civilization',
      'tomb',
      'nile',
      'hieroglyphs',
      'sphinx',
      'mesopotamia',
      'mayan',
      'ancient history',
    ],
    hi: ['पिरामिड', 'मिस्र', 'फिरौन', 'ममी', 'नील नदी', 'प्राचीन सभ्यता', 'मकबरा', 'गीज़ा', 'हाइरोग्लिफ'],
    mr: ['पिरॅमिड', 'पिरामिड', 'इजिप्त', 'मिस्र', 'फॅरो', 'ममी', 'नाईल नदी', 'प्राचीन संस्कृती', 'थडगे'],
  },
  build() {
    const g = grp(mesh(geo.cyl(1.0, 1.05, 0.06, 40), mat(0xc98e4a, { rough: 1 }), [0, 0.03, 0]));
    const n = 9;
    for (let i = 0; i < n; i++) {
      const s = 1.3 * (1 - i / (n + 0.6));
      const col = i % 2 ? 0xb5702a : 0xe3a64c;
      g.add(mesh(geo.box(s, 0.085, s), mat(col, { rough: 0.95 }), [0, 0.06 + 0.0425 + i * 0.085, 0]));
    }
    const gold = mat(0xffc938, { metal: 0.9, rough: 0.25, emissive: 0xff9900, glow: 0.35 });
    g.add(mesh(geo.cone(0.11, 0.16, 4), gold, [0, 0.06 + n * 0.085 + 0.08 - 0.004, 0], [0, Math.PI / 4, 0]));
    // little smooth pyramids
    const smooth = mat(0xd08f3e, { rough: 0.85 });
    g.add(mesh(geo.cone(0.3, 0.42, 4), smooth, [0.85, 0.27, 0.5], [0, Math.PI / 4 + 0.2, 0]));
    g.add(mesh(geo.cone(0.2, 0.28, 4), smooth, [-0.8, 0.2, 0.55], [0, Math.PI / 4 - 0.1, 0]));
    // sun disc with ring
    const sunM = mat(0xff9d1e, { emissive: 0xff7a00, glow: 1.1, rough: 0.4 });
    const sun = grp(
      mesh(geo.sphere(0.12, 24, 14), sunM),
      mesh(
        geo.torus(0.2, 0.018, 8, 40),
        mat(0xffc938, { metal: 0.8, rough: 0.3, emissive: 0xffaa00, glow: 0.6 }),
      ),
    );
    sun.position.set(0, 1.38, 0);
    g.add(sun);
    // doorway
    g.add(mesh(geo.box(0.16, 0.12, 0.05), mat(0x2a1f18), [0, 0.12, 0.5]));
    g.add(mesh(geo.box(0.22, 0.04, 0.06), gold, [0, 0.2, 0.5]));
    return g;
  },
};

// ---------------------------------------------------------------- volcano
const SMOKE = 5;
const volcanoProfile: Array<[number, number]> = [
  [0.78, 0],
  [0.64, 0.12],
  [0.44, 0.38],
  [0.3, 0.6],
  [0.23, 0.7],
];
function coneRadius(y: number): number {
  for (let i = 0; i < volcanoProfile.length - 1; i++) {
    const a = volcanoProfile[i];
    const b = volcanoProfile[i + 1];
    if (a && b && y <= b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  }
  return 0.23;
}
const volcano: ObjectDef = {
  key: 'volcano',
  name: { en: 'Volcano', hi: 'ज्वालामुखी', mr: 'ज्वालामुखी' },
  tags: {
    en: [
      'volcano',
      'volcanic',
      'eruption',
      'lava',
      'magma',
      'crater',
      'tectonic',
      'igneous',
      'earthquake',
      'ash',
      'pompeii',
      'geology',
      'ring of fire',
      'basalt',
    ],
    hi: ['ज्वालामुखी', 'लावा', 'मैग्मा', 'विस्फोट', 'क्रेटर', 'भूकंप', 'राख', 'आग्नेय चट्टान', 'भूगर्भ'],
    mr: ['ज्वालामुखी', 'लाव्हा', 'मॅग्मा', 'उद्रेक', 'विवर', 'भूकंप', 'राख', 'अग्निजन्य खडक', 'भूगर्भ'],
  },
  build() {
    const g = grp(mesh(geo.cyl(0.86, 0.9, 0.08, 32), mat(0x6a6870, { rough: 1 }), [0, 0.04, 0]));
    const rock = mat(0x7a4636, { rough: 0.95, flat: true });
    const pts: Array<[number, number]> = [...volcanoProfile, [0.17, 0.68], [0.13, 0.58], [0, 0.56]];
    g.add(mesh(geo.lathe(pts, 24), rock, [0, 0.08, 0]));
    const lava = mat(0xff6a00, { emissive: 0xff4400, glow: 1.6, rough: 0.5 });
    g.add(mesh(geo.cyl(0.14, 0.14, 0.03, 20), lava, [0, 0.08 + 0.575, 0]));
    const streams: number[] = [0.4, 2.3, 4.2];
    for (const a0 of streams) {
      const cp: THREE.Vector3[] = [];
      for (let i = 0; i <= 9; i++) {
        const s = i / 9;
        const y = 0.68 - s * (0.5 + 0.1 * Math.sin(a0));
        const a = a0 + 0.14 * Math.sin(s * 7 + a0);
        const r = coneRadius(y) + 0.02;
        cp.push(new THREE.Vector3(Math.cos(a) * r, y + 0.08, Math.sin(a) * r));
      }
      g.add(mesh(geo.tube(new THREE.CatmullRomCurve3(cp), 24, 0.034, 6), lava));
    }
    // scattered hot rocks
    const hot = mat(0xff8a2a, { emissive: 0xff5500, glow: 0.9 });
    g.add(mesh(geo.icosa(0.05), hot, [0.55, 0.12, 0.65]));
    g.add(mesh(geo.icosa(0.04), hot, [-0.6, 0.11, 0.55]));
    g.add(mesh(geo.icosa(0.06), rock, [0.85, 0.12, -0.2]));
    const smoke = mat(0x9a98a8, { rough: 1, opacity: 0.8 });
    for (let i = 0; i < SMOKE; i++) {
      g.add(at(named(mesh(geo.sphere(0.13, 14, 10), smoke), `smoke${i}`), 0, 0.8 + i * 0.16, 0));
    }
    return g;
  },
  update(model, t) {
    for (let i = 0; i < SMOKE; i++) {
      const p = part(model, `smoke${i}`);
      if (!p) continue;
      const k = (t * 0.17 + i / SMOKE) % 1;
      p.position.set(
        Math.sin(t * 0.6 + i * 2) * 0.05 + k * 0.25,
        0.8 + k * 0.8,
        Math.cos(t * 0.5 + i) * 0.04,
      );
      p.scale.setScalar(Math.max(0.01, (0.45 + k * 1.3) * Math.sin(Math.min(1, k * 1.1) * Math.PI) ** 0.5));
    }
  },
};

// ---------------------------------------------------------------- leaf
const leafHalfWidth = (u: number): number =>
  0.34 * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 + 0.035 * Math.sin(u * 46));
const leaf: ObjectDef = {
  key: 'leaf',
  name: { en: 'Leaf', hi: 'पत्ती', mr: 'पान' },
  tags: {
    en: [
      'leaf',
      'leaves',
      'chlorophyll',
      'photosynthesis',
      'stomata',
      'transpiration',
      'veins',
      'foliage',
      'autumn',
      'botany',
      'chloroplast',
      'herbal',
      'green',
    ],
    hi: [
      'पत्ता',
      'पत्ती',
      'पर्ण',
      'पर्णहरित',
      'क्लोरोफिल',
      'प्रकाश संश्लेषण',
      'रंध्र',
      'वाष्पोत्सर्जन',
      'शिरा',
    ],
    mr: [
      'पान',
      'पर्ण',
      'पाने',
      'हरितद्रव्य',
      'क्लोरोफिल',
      'प्रकाशसंश्लेषण',
      'पर्णरंध्र',
      'बाष्पोत्सर्जन',
      'शीर',
    ],
  },
  build() {
    const steps = 16;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) pts.push([leafHalfWidth(i / steps), i / steps]);
    for (let i = steps - 1; i >= 1; i--) pts.push([-leafHalfWidth(i / steps), i / steps]);
    const lf = new THREE.Group();
    lf.add(
      mesh(slab(polyShape(pts), 0.03, 0.012), mat(0x39b54a, { rough: 0.55, emissive: 0x0b4a1a, glow: 0.3 })),
    );
    const vein = mat(0xb5e36b, { rough: 0.6 });
    lf.add(mesh(geo.box(0.03, 0.96, 0.075), vein, [0, 0.49, 0]));
    const ang = 0.72;
    for (let j = 1; j <= 6; j++) {
      const u = 0.1 + j * 0.12;
      const len = (leafHalfWidth(Math.min(1, u + 0.14)) * 0.82) / Math.cos(ang);
      const b = geo.box(len, 0.016, 0.07);
      for (const side of [1, -1]) {
        lf.add(
          mesh(
            b,
            vein,
            [(side * Math.cos(ang) * len) / 2, u + (Math.sin(ang) * len) / 2, 0],
            [0, 0, side * ang],
          ),
        );
      }
    }
    // dewdrops
    const dew = mat(0xbfe9ff, { rough: 0.05, metal: 0, emissive: 0x6fc3ff, glow: 0.25, opacity: 0.75 });
    lf.add(mesh(geo.sphere(0.045, 16, 12), dew, [0.1, 0.5, 0.045], [0, 0, 0], [1, 1.25, 0.8]));
    lf.add(mesh(geo.sphere(0.028, 12, 8), dew, [-0.12, 0.3, 0.04]));
    lf.add(mesh(geo.sphere(0.03, 12, 8), dew, [0.04, 0.72, -0.04]));
    lf.position.set(0, 0.4, 0);
    lf.rotation.x = -0.22;
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0, 0.04),
      new THREE.Vector3(0.02, 0.2, 0.01),
      new THREE.Vector3(0, 0.42, 0),
    ]);
    const g = grp(
      mesh(geo.tube(stemCurve, 12, 0.024, 8), mat(0x5a9a3a, { rough: 0.7 })),
      mesh(geo.dome(0.26, 24), mat(0x5b3b22, { rough: 1 }), [0.08, 0, 0.04], [0, 0, 0], [1, 0.3, 1]),
      lf,
    );
    return g;
  },
};

// ---------------------------------------------------------------- flower
const flower: ObjectDef = {
  key: 'flower',
  name: { en: 'Flower', hi: 'फूल', mr: 'फूल' },
  tags: {
    en: [
      'flower',
      'flowers',
      'petal',
      'pollination',
      'pollen',
      'bee',
      'stamen',
      'pistil',
      'reproduction in plants',
      'bloom',
      'blossom',
      'sepal',
      'fertilization',
      'seed',
      'rose',
      'botany',
    ],
    hi: [
      'फूल',
      'पुष्प',
      'पंखुड़ी',
      'परागण',
      'पराग',
      'मधुमक्खी',
      'पुंकेसर',
      'स्त्रीकेसर',
      'बीज',
      'गुलाब',
      'कमल',
    ],
    mr: [
      'फूल',
      'पुष्प',
      'पाकळी',
      'परागीभवन',
      'परागकण',
      'मधमाशी',
      'पुंकेसर',
      'स्त्रीकेसर',
      'बी',
      'गुलाब',
      'कमळ',
    ],
  },
  build() {
    const sway = named(new THREE.Group(), 'sway');
    const stemM = mat(0x3f9a45, { rough: 0.7 });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.03, 0.35, 0),
      new THREE.Vector3(-0.02, 0.7, 0.03),
      new THREE.Vector3(0, 0.93, 0.08),
    ]);
    sway.add(mesh(geo.tube(curve, 20, 0.025, 8), stemM));
    const leafM = mat(0x4cb04f, { rough: 0.6 });
    sway.add(mesh(geo.sphere(0.15, 14, 10), leafM, [0.17, 0.26, 0], [0, 0, 0.55], [1.6, 0.25, 0.7]));
    sway.add(mesh(geo.sphere(0.15, 14, 10), leafM, [-0.17, 0.46, 0.01], [0, 0, -0.55], [1.5, 0.25, 0.7]));

    const head = new THREE.Group();
    head.position.set(0, 0.93, 0.08);
    head.rotation.x = -0.75;
    const outer = mat(0xff4f9a, { rough: 0.45, emissive: 0x7a0a3a, glow: 0.25 });
    const inner = mat(0xff8fc4, { rough: 0.45, emissive: 0x7a2a5a, glow: 0.2 });
    const ring = (
      n: number,
      off: number,
      m: THREE.Material,
      tilt: number,
      reach: number,
      s: number,
    ): void => {
      for (let i = 0; i < n; i++) {
        const pv = grp(
          mesh(
            geo.sphere(0.1, 14, 10),
            m,
            [0, reach * Math.cos(tilt), reach * Math.sin(tilt)],
            [tilt, 0, 0],
            [0.62 * s, 1.25 * s, 0.2],
          ),
        );
        pv.rotation.z = (i / n) * TAU + off;
        head.add(pv);
      }
    };
    ring(10, 0, outer, 0.12, 0.21, 1);
    ring(8, TAU / 16, inner, 0.42, 0.15, 0.85);
    head.add(
      mesh(
        geo.sphere(0.095, 18, 12),
        mat(0xffc728, { rough: 0.5, emissive: 0xff9900, glow: 0.4 }),
        [0, 0, 0.03],
        [0, 0, 0],
        [1, 1, 0.75],
      ),
    );
    const seed = mat(0xc9701a, { rough: 0.6 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      head.add(mesh(geo.sphere(0.022, 8, 6), seed, [Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0.085]));
    }
    head.add(mesh(geo.sphere(0.06, 12, 8), stemM, [0, 0, -0.06], [0, 0, 0], [1, 1, 0.6]));
    sway.add(head);
    return grp(
      mesh(geo.dome(0.3, 24), mat(0x5b3b22, { rough: 1 }), [0, 0, 0], [0, 0, 0], [1, 0.35, 1]),
      sway,
    );
  },
  update(model, t) {
    const s = part(model, 'sway');
    if (s) {
      s.rotation.z = Math.sin(t * 1.4) * 0.045;
      s.rotation.x = Math.cos(t * 1.1) * 0.03;
    }
  },
};

export const natureA: ObjectDef[] = [tree, mountain, pyramid, volcano, leaf, flower];
