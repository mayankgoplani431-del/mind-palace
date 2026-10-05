import * as THREE from 'three';
import type { ObjectDef } from '../types';
import { C, geo, grp, mat, mesh, named } from '../kit';
import { PI, arc, blob, flicker, makeGetter, star } from './culture-util';

const hourglass: ObjectDef = {
  key: 'hourglass',
  name: { en: 'Hourglass', hi: 'रेत घड़ी', mr: 'वाळूचे घड्याळ' },
  tags: {
    en: [
      'hourglass',
      'time',
      'sand',
      'deadline',
      'patience',
      'duration',
      'period',
      'age',
      'past',
      'history',
      'temporary',
      'transition',
      'epoch',
      'waiting',
      'countdown',
      'limited',
      'lifecycle',
      'era',
    ],
    hi: ['रेत घड़ी', 'समय', 'रेत', 'प्रतीक्षा', 'अवधि', 'अतीत', 'युग', 'धैर्य', 'समयसीमा', 'इतिहास'],
    mr: ['वाळूचे घड्याळ', 'वेळ', 'वाळू', 'प्रतीक्षा', 'कालावधी', 'भूतकाळ', 'युग', 'संयम', 'मुदत', 'इतिहास'],
  },
  build() {
    const glass = mat(C.glass, { opacity: 0.25, rough: 0.05, clearcoat: 1, side: THREE.DoubleSide });
    const wood = mat(C.darkWood, { rough: 0.5, clearcoat: 0.4 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.3 });
    const sand = mat(0xf2b84b, { rough: 0.8, emissive: 0xf2a020, glow: 0.12 });
    const g = grp();
    g.add(
      mesh(
        geo.lathe(
          [
            [0.001, 0],
            [0.12, 0.01],
            [0.2, 0.05],
            [0.25, 0.12],
            [0.26, 0.2],
            [0.23, 0.3],
            [0.15, 0.4],
            [0.07, 0.46],
            [0.03, 0.5],
            [0.07, 0.54],
            [0.15, 0.6],
            [0.23, 0.7],
            [0.26, 0.8],
            [0.25, 0.88],
            [0.2, 0.95],
            [0.12, 0.99],
            [0.001, 1.0],
          ],
          32,
        ),
        glass,
        [0, 0.06, 0],
      ),
    );
    for (const y of [0.03, 1.09]) {
      g.add(mesh(geo.cyl(0.36, 0.36, 0.07, 6), wood, [0, y, 0]));
      g.add(mesh(geo.torus(0.3, 0.015, 6, 6), gold, [0, y < 0.5 ? 0.07 : 1.05, 0], [PI / 2, 0, 0]));
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2 + PI / 6;
      g.add(mesh(geo.cyl(0.025, 0.025, 1.06, 8), gold, [Math.sin(a) * 0.3, 0.56, Math.cos(a) * 0.3]));
    }
    const top = named(grp(), 'sandTop');
    top.position.y = 0.56;
    top.add(mesh(geo.cone(0.22, 0.4, 20), sand, [0, 0.2, 0], [PI, 0, 0]));
    const bot = named(grp(), 'sandBot');
    bot.position.y = 0.08;
    bot.add(mesh(geo.cone(0.22, 0.36, 20), sand, [0, 0.18, 0]));
    const stream = named(mesh(geo.cyl(0.008, 0.008, 0.46, 6), sand, [0, 0.33, 0]), 'stream');
    g.add(top, bot, stream);
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const f = Math.max(0.04, 1 - ((t / 9) % 1));
      const top = get(model, 'sandTop');
      const bot = get(model, 'sandBot');
      const st = get(model, 'stream');
      if (top) top.scale.set(f, f, f);
      if (bot) {
        const b = Math.max(0.04, 1 - f + 0.04);
        bot.scale.set(b, b, b);
      }
      if (st) st.visible = f > 0.05;
    };
  })(),
};

const wheel = (
  x: number,
  z: number,
  rim: THREE.Material,
  wood: THREE.Material,
  gold: THREE.Material,
): THREE.Group => {
  const w = grp();
  w.position.set(x, 0.3, z);
  w.add(mesh(geo.torus(0.27, 0.04, 10, 32), rim));
  w.add(mesh(geo.cyl(0.06, 0.06, 0.1, 12), gold, [0, 0, 0], [PI / 2, 0, 0]));
  for (let i = 0; i < 6; i++) w.add(mesh(geo.box(0.03, 0.54, 0.035), wood, [0, 0, 0], [0, 0, (i * PI) / 6]));
  return w;
};

const cannon: ObjectDef = {
  key: 'cannon',
  name: { en: 'Cannon', hi: 'तोप', mr: 'तोफ' },
  tags: {
    en: [
      'cannon',
      'artillery',
      'gunpowder',
      'war',
      'battle',
      'siege',
      'panipat',
      'mughal',
      'babur',
      'fort',
      'weapon',
      'military',
      'ammunition',
      'plassey',
      'invasion',
    ],
    hi: [
      'तोप',
      'बारूद',
      'युद्ध',
      'पानीपत',
      'मुगल',
      'बाबर',
      'तोपख़ाना',
      'घेराबंदी',
      'आक्रमण',
      'हथियार',
      'गोला',
    ],
    mr: ['तोफ', 'दारूगोळा', 'युद्ध', 'पानिपत', 'मुघल', 'बाबर', 'तोफखाना', 'वेढा', 'आक्रमण', 'शस्त्र'],
  },
  build() {
    const iron = mat(0x2f343c, { metal: 0.85, rough: 0.35, clearcoat: 0.3 });
    const bronze = mat(C.bronze, { metal: 0.9, rough: 0.3 });
    const wood = mat(C.wood, { rough: 0.7 });
    const woodD = mat(C.darkWood, { rough: 0.7 });
    const ball = mat(0x1c1f25, { metal: 0.9, rough: 0.3 });
    const fire = mat(C.orange, { rough: 0.5, emissive: C.orange, glow: 1.8 });
    const smoke = mat(0xd8dde3, { rough: 1, opacity: 0.5 });
    const g = grp();
    const barrel = grp();
    barrel.position.set(-0.4, 0.56, 0);
    barrel.rotation.z = -PI / 2 + 0.14;
    barrel.add(
      mesh(
        geo.lathe(
          [
            [0.001, -0.02],
            [0.09, 0.0],
            [0.14, 0.06],
            [0.17, 0.14],
            [0.185, 0.25],
            [0.175, 0.45],
            [0.16, 0.7],
            [0.14, 0.88],
            [0.135, 0.93],
            [0.17, 0.96],
            [0.18, 1.0],
            [0.1, 1.0],
          ],
          28,
        ),
        iron,
      ),
    );
    barrel.add(mesh(geo.sphere(0.07, 12, 10), iron, [0, -0.08, 0]));
    for (const y of [0.2, 0.5, 0.9])
      barrel.add(
        mesh(
          geo.torus(y < 0.3 ? 0.185 : y < 0.6 ? 0.172 : 0.14, 0.02, 8, 28),
          bronze,
          [0, y, 0],
          [PI / 2, 0, 0],
        ),
      );
    barrel.add(mesh(geo.cyl(0.09, 0.09, 0.02, 16), mat(C.black), [0, 0.995, 0]));
    barrel.add(mesh(geo.cyl(0.045, 0.045, 0.55, 10), bronze, [0, 0.45, 0], [PI / 2, 0, 0]));
    const flash = named(mesh(geo.icosa(0.2, 1), fire, [0, 1.2, 0]), 'flash');
    flash.scale.setScalar(0.001);
    barrel.add(flash);
    for (let i = 0; i < 3; i++) {
      const s = named(mesh(geo.sphere(0.12, 10, 8), smoke, [0, 1.1, 0]), `smoke${i}`);
      s.scale.setScalar(0.001);
      barrel.add(s);
    }
    g.add(barrel);
    for (const s of [-1, 1]) {
      g.add(mesh(geo.box(0.95, 0.14, 0.06), wood, [-0.05, 0.36, s * 0.2], [0, 0, 0.1]));
      g.add(wheel(0.0, s * 0.33, bronze, woodD, bronze));
    }
    g.add(mesh(geo.box(0.07, 0.16, 0.46), woodD, [-0.5, 0.33, 0]));
    g.add(mesh(geo.cyl(0.04, 0.04, 0.66, 10), iron, [0, 0.3, 0], [PI / 2, 0, 0]));
    for (const [x, y, z] of [
      [0.5, 0.075, 0.5],
      [0.66, 0.075, 0.5],
      [0.58, 0.075, 0.66],
      [0.58, 0.21, 0.56],
    ] as const) {
      g.add(mesh(geo.sphere(0.078, 14, 10), ball, [x, y, z]));
    }
    return g;
  },
  update: (() => {
    const get = makeGetter();
    return (model, t) => {
      const p = (t % 4) / 1.2;
      const fl = get(model, 'flash');
      if (fl) fl.scale.setScalar(p < 1 ? Math.max(0.001, Math.sin(p * PI) * 1.4) : 0.001);
      for (let i = 0; i < 3; i++) {
        const s = get(model, `smoke${i}`);
        if (!s) continue;
        const q = (t % 4) / 2.5 - i * 0.08;
        const on = q > 0 && q < 1;
        s.scale.setScalar(on ? 0.4 + q * 1.2 : 0.001);
        s.position.set(Math.sin(i * 2) * 0.1 * q, 1.1 + q * (0.5 + i * 0.12), Math.cos(i * 2) * 0.1 * q);
      }
    };
  })(),
};

const quill: ObjectDef = {
  key: 'quill',
  name: { en: 'Quill & Ink', hi: 'कलम', mr: 'लेखणी' },
  tags: {
    en: [
      'quill',
      'pen',
      'write',
      'writing',
      'author',
      'poet',
      'poetry',
      'literature',
      'ink',
      'essay',
      'poem',
      'novel',
      'letter',
      'signature',
      'scribe',
      'shakespeare',
      'grammar',
      'language',
      'journalism',
    ],
    hi: [
      'कलम',
      'लेखनी',
      'कवि',
      'कविता',
      'साहित्य',
      'लेखक',
      'स्याही',
      'निबंध',
      'पत्र',
      'हस्ताक्षर',
      'व्याकरण',
      'भाषा',
    ],
    mr: ['लेखणी', 'कवी', 'कविता', 'साहित्य', 'लेखक', 'शाई', 'निबंध', 'पत्र', 'स्वाक्षरी', 'व्याकरण', 'भाषा'],
  },
  build() {
    const paper = mat(C.parchment, { rough: 0.9 });
    const ink = mat(0x3a2a1a, { rough: 0.9 });
    const inkPool = mat(0x0b1130, { rough: 0.1, clearcoat: 1 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.25 });
    const vane = mat(0xf2f6ff, { rough: 0.6, side: THREE.DoubleSide });
    const vane2 = mat(C.cyan, { rough: 0.6, side: THREE.DoubleSide });
    const shaft = mat(0xe8dcc0, { rough: 0.5 });
    const g = grp();
    g.add(mesh(geo.box(1.0, 0.02, 0.76), paper, [0.0, 0.01, 0.05], [0, 0.12, 0]));
    for (let i = 0; i < 4; i++)
      g.add(
        mesh(
          geo.box(i === 3 ? 0.3 : 0.55, 0.004, 0.018),
          ink,
          [0.05 - (i === 3 ? 0.12 : 0), 0.022, 0.12 + i * 0.1],
          [0, 0.12, 0],
        ),
      );
    g.add(mesh(geo.cyl(0.05, 0.05, 0.004, 14), inkPool, [-0.3, 0.022, 0.3]));
    const well = grp();
    well.position.set(-0.05, 0.02, -0.15);
    well.add(
      mesh(
        geo.lathe(
          [
            [0.001, 0],
            [0.25, 0],
            [0.29, 0.05],
            [0.29, 0.2],
            [0.25, 0.3],
            [0.16, 0.35],
            [0.12, 0.37],
            [0.12, 0.42],
            [0.09, 0.42],
          ],
          28,
        ),
        mat(C.navy, { rough: 0.1, metal: 0.2, clearcoat: 1, side: THREE.DoubleSide }),
      ),
    );
    well.add(mesh(geo.torus(0.115, 0.022, 8, 24), gold, [0, 0.42, 0], [PI / 2, 0, 0]));
    well.add(mesh(geo.cyl(0.092, 0.092, 0.01, 18), inkPool, [0, 0.39, 0]));
    well.add(mesh(geo.torus(0.29, 0.012, 6, 28), gold, [0, 0.12, 0], [PI / 2, 0, 0]));
    const fe = grp();
    fe.position.set(0, 0.36, 0);
    fe.rotation.set(0.1, 0, -0.32);
    fe.scale.set(1.8, 0.85, 1);
    fe.add(mesh(geo.cyl(0.013, 0.008, 1.5, 8), shaft, [0, 0.65, 0]));
    const out: Array<[number, number]> = [
      [0.01, 0.4],
      [0.07, 0.5],
      [0.12, 0.65],
      [0.15, 0.85],
      [0.14, 1.05],
      [0.1, 1.25],
      [0.04, 1.4],
      [0, 1.47],
    ];
    const pts: Array<[number, number]> = [
      ...out,
      ...[...out].reverse().map(([x, y]): [number, number] => [-x, y]),
    ];
    fe.add(mesh(geo.extrude(pts, 0.008, 0.002), vane, [0, 0, -0.005]));
    const inner: Array<[number, number]> = pts.map(([x, y]): [number, number] => [
      x * 0.45,
      0.5 + (y - 0.4) * 0.8,
    ]);
    fe.add(mesh(geo.extrude(inner, 0.008, 0.002), vane2, [0, 0, 0.0]));
    const eye = mesh(
      geo.sphere(0.04, 12, 10),
      mat(C.teal, { rough: 0.2, metal: 0.4, clearcoat: 1 }),
      [0, 0.98, 0.004],
      [0, 0, 0],
      [1, 1.5, 0.3],
    );
    fe.add(eye);
    well.add(fe);
    g.add(well);
    return g;
  },
};

const trophy: ObjectDef = {
  key: 'trophy',
  name: { en: 'Trophy', hi: 'ट्रॉफी', mr: 'चषक' },
  tags: {
    en: [
      'trophy',
      'winner',
      'victory',
      'champion',
      'prize',
      'award',
      'achievement',
      'success',
      'cup',
      'medal',
      'sports',
      'olympics',
      'competition',
      'first place',
      'triumph',
      'merit',
      'glory',
    ],
    hi: [
      'ट्रॉफी',
      'विजेता',
      'विजय',
      'पुरस्कार',
      'उपलब्धि',
      'सफलता',
      'कप',
      'पदक',
      'खेल',
      'प्रतियोगिता',
      'ओलंपिक',
    ],
    mr: ['चषक', 'विजेता', 'विजय', 'पुरस्कार', 'यश', 'सफलता', 'पदक', 'खेळ', 'स्पर्धा', 'ऑलिंपिक', 'ट्रॉफी'],
  },
  build() {
    const gold = mat(C.gold, { metal: 1, rough: 0.16, clearcoat: 0.6, side: THREE.DoubleSide });
    const goldS = mat(C.gold, { metal: 1, rough: 0.16, clearcoat: 0.6 });
    const wood = mat(C.darkWood, { rough: 0.35, clearcoat: 0.7 });
    const gem = mat(C.red, { rough: 0.08, emissive: C.red, glow: 0.4, clearcoat: 1 });
    const g = grp();
    g.add(mesh(geo.cyl(0.3, 0.34, 0.14, 8), wood, [0, 0.07, 0], [0, PI / 8, 0]));
    g.add(mesh(geo.box(0.26, 0.07, 0.02), goldS, [0, 0.07, 0.3]));
    const cup = grp();
    cup.position.y = 0.14;
    cup.add(
      mesh(
        geo.lathe(
          [
            [0.2, 0],
            [0.22, 0.03],
            [0.16, 0.07],
            [0.07, 0.12],
            [0.045, 0.2],
            [0.05, 0.28],
            [0.09, 0.32],
            [0.06, 0.35],
            [0.1, 0.38],
            [0.2, 0.44],
            [0.28, 0.56],
            [0.32, 0.72],
            [0.32, 0.86],
            [0.3, 0.88],
            [0.29, 0.86],
            [0.29, 0.72],
            [0.25, 0.58],
            [0.17, 0.5],
            [0.001, 0.46],
          ],
          36,
        ),
        gold,
      ),
    );
    for (const s of [-1, 1]) {
      cup.add(
        mesh(arc(0.15, 0.03, PI), goldS, [s * 0.3, 0.68, 0], [0, 0, s > 0 ? -PI / 2 : PI / 2], [1.1, 1, 1]),
      );
    }
    cup.add(mesh(geo.sphere(0.055, 14, 10), gem, [0, 0.6, 0.26]));
    cup.add(mesh(geo.torus(0.31, 0.02, 8, 36), goldS, [0, 0.87, 0], [PI / 2, 0, 0]));
    cup.add(mesh(geo.extrude(star(5, 0.11, 0.045), 0.02, 0), goldS, [0, 0.96, -0.01]));
    g.add(cup);
    return g;
  },
};

const candle: ObjectDef = {
  key: 'candle',
  name: { en: 'Candle', hi: 'मोमबत्ती', mr: 'मेणबत्ती' },
  tags: {
    en: [
      'candle',
      'flame',
      'light',
      'memory',
      'remembrance',
      'birthday',
      'vigil',
      'prayer',
      'diwali',
      'festival',
      'hope',
      'sacrifice',
      'martyr',
      'tribute',
      'peace',
      'wax',
      'ritual',
    ],
    hi: [
      'मोमबत्ती',
      'लौ',
      'दीया',
      'श्रद्धांजलि',
      'शहीद',
      'प्रार्थना',
      'दिवाली',
      'त्योहार',
      'आशा',
      'प्रकाश',
      'बलिदान',
    ],
    mr: [
      'मेणबत्ती',
      'ज्योत',
      'दिवा',
      'श्रद्धांजली',
      'हुतात्मा',
      'प्रार्थना',
      'दिवाळी',
      'सण',
      'आशा',
      'प्रकाश',
      'बलिदान',
    ],
  },
  build() {
    const brass = mat(0xc9973a, { metal: 0.9, rough: 0.3, clearcoat: 0.3 });
    const wax = mat(0xfaf0dc, { rough: 0.6, emissive: 0xffc070, glow: 0.12 });
    const flameO = mat(C.orange, { rough: 0.4, emissive: C.orange, glow: 1.4, opacity: 0.8 });
    const flameI = mat(C.yellow, { rough: 0.4, emissive: 0xfff3a0, glow: 1.8 });
    const g = grp();
    g.add(mesh(geo.cyl(0.38, 0.4, 0.05, 32), brass, [0, 0.025, 0]));
    g.add(mesh(geo.torus(0.38, 0.03, 8, 36), brass, [0, 0.06, 0], [PI / 2, 0, 0]));
    g.add(mesh(geo.cyl(0.16, 0.12, 0.12, 20), brass, [0, 0.11, 0]));
    g.add(mesh(geo.torus(0.17, 0.02, 8, 20), brass, [0, 0.17, 0], [PI / 2, 0, 0]));
    g.add(mesh(arc(0.12, 0.022, PI * 1.5), brass, [0.5, 0.1, 0], [0, 0, PI * 0.25]));
    g.add(mesh(geo.cyl(0.11, 0.11, 0.56, 28), wax, [0, 0.45, 0]));
    g.add(mesh(geo.sphere(0.11, 20, 10), wax, [0, 0.73, 0], [0, 0, 0], [1, 0.25, 1]));
    for (const [a, l] of [
      [0.5, 0.14],
      [2.3, 0.2],
      [4.1, 0.1],
    ] as const) {
      g.add(mesh(geo.capsule(0.022, l), wax, [Math.sin(a) * 0.105, 0.68 - l / 2, Math.cos(a) * 0.105]));
    }
    g.add(mesh(geo.cyl(0.008, 0.008, 0.07, 6), mat(C.black), [0, 0.76, 0]));
    const fl = named(grp(), 'flame');
    fl.position.y = 0.78;
    fl.add(
      mesh(
        geo.lathe(
          [
            [0.001, 0],
            [0.04, 0.03],
            [0.055, 0.09],
            [0.04, 0.17],
            [0.015, 0.24],
            [0.001, 0.28],
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
            [0.001, 0.17],
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
      if (f) {
        f.scale.set(0.95 + (flicker(t) - 1) * 0.5, flicker(t, 1), 0.95 + (flicker(t, 2) - 1) * 0.5);
        f.rotation.z = Math.sin(t * 3) * 0.06;
      }
    };
  })(),
};

const map: ObjectDef = {
  key: 'map',
  name: { en: 'Map', hi: 'नक्शा', mr: 'नकाशा' },
  tags: {
    en: [
      'map',
      'atlas',
      'geography',
      'world',
      'continent',
      'country',
      'region',
      'boundary',
      'border',
      'route',
      'treasure',
      'exploration',
      'cartography',
      'location',
      'latitude',
      'longitude',
      'territory',
      'silk route',
      'island',
      'ocean',
    ],
    hi: [
      'नक्शा',
      'मानचित्र',
      'भूगोल',
      'महाद्वीप',
      'देश',
      'सीमा',
      'समुद्र',
      'द्वीप',
      'अक्षांश',
      'देशांतर',
      'व्यापार मार्ग',
      'खोज',
    ],
    mr: [
      'नकाशा',
      'भूगोल',
      'खंड',
      'देश',
      'सीमा',
      'समुद्र',
      'बेट',
      'अक्षांश',
      'रेखांश',
      'व्यापारी मार्ग',
      'शोध',
    ],
  },
  build() {
    const wood = mat(C.darkWood, { rough: 0.55, clearcoat: 0.3 });
    const gold = mat(C.gold, { metal: 0.9, rough: 0.3 });
    const parch = mat(C.parchment, { rough: 0.9 });
    const sea = mat(0x4aa3c7, { rough: 0.5, clearcoat: 0.3 });
    const land = mat(C.green, { rough: 0.85 });
    const land2 = mat(C.sand, { rough: 0.85 });
    const rock = mat(0x7a5a3a, { rough: 0.9, flat: true });
    const red = mat(C.red, { rough: 0.4, emissive: C.red, glow: 0.2 });
    const rose = mat(0x8a3a20, { rough: 0.5 });
    const g = grp();
    for (const s of [-1, 1]) {
      g.add(mesh(geo.cyl(0.035, 0.035, 1.4, 10), wood, [s * 0.74, 0.7, 0]));
      g.add(mesh(geo.box(0.12, 0.05, 0.55), wood, [s * 0.74, 0.025, 0]));
      g.add(mesh(geo.sphere(0.05, 10, 8), gold, [s * 0.74, 1.42, 0]));
    }
    g.add(mesh(geo.box(1.48, 0.05, 0.05), wood, [0, 0.12, 0]));
    const panel = grp();
    panel.position.set(0, -0.18, 0);
    panel.scale.set(1.3, 1.25, 1);
    panel.add(mesh(geo.box(0.86, 0.66, 0.012), parch, [0, 0.72, 0]));
    for (const y of [1.06, 0.39]) {
      panel.add(mesh(geo.cyl(0.04, 0.04, 0.96, 12), wood, [0, y, 0], [0, 0, PI / 2]));
      for (const s of [-1, 1]) panel.add(mesh(geo.sphere(0.05, 10, 8), gold, [s * 0.49, y, 0]));
    }
    panel.add(mesh(geo.box(0.76, 0.54, 0.004), sea, [0, 0.72, 0.008]));
    const isl: Array<[number, number, number, number, THREE.Material]> = [
      [-0.2, 0.8, 0.17, 1, land],
      [0.17, 0.6, 0.13, 2, land2],
      [0.22, 0.88, 0.1, 3, land],
    ];
    for (const [x, y, r, seed, m] of isl)
      panel.add(mesh(geo.extrude(blob(r, seed), 0.006, 0.002), m, [x, y, 0.01]));
    panel.add(mesh(geo.cone(0.05, 0.1, 5), rock, [-0.25, 0.83, 0.065]));
    panel.add(mesh(geo.cone(0.04, 0.07, 5), rock, [-0.16, 0.77, 0.05]));
    panel.add(mesh(geo.cone(0.03, 0.06, 6), mat(C.darkGreen, { rough: 0.8 }), [0.22, 0.89, 0.05]));
    const path: Array<[number, number]> = [
      [-0.08, 0.72],
      [-0.02, 0.67],
      [0.04, 0.63],
      [0.09, 0.6],
      [0.0, 0.76],
      [-0.06, 0.78],
    ];
    path.slice(0, 4).forEach(([x, y]) => panel.add(mesh(geo.sphere(0.014, 8, 6), red, [x, y, 0.016])));
    for (const r of [PI / 4, -PI / 4])
      panel.add(mesh(geo.box(0.1, 0.022, 0.006), red, [0.18, 0.56, 0.016], [0, 0, r]));
    panel.add(mesh(geo.extrude(star(8, 0.085, 0.03), 0.006, 0), rose, [-0.27, 0.5, 0.012]));
    panel.add(mesh(geo.box(0.22, 0.008, 0.004), rose, [-0.27, 0.5, 0.012]));
    g.add(panel);
    return g;
  },
};

const mortar: ObjectDef = {
  key: 'mortar',
  name: { en: 'Mortar & Pestle', hi: 'खल-बट्टा', mr: 'खलबत्ता' },
  tags: {
    en: [
      'mortar',
      'pestle',
      'grind',
      'herbs',
      'medicine',
      'pharmacy',
      'ayurveda',
      'spices',
      'chemistry',
      'ingredient',
      'crush',
      'powder',
      'remedy',
      'herbal',
      'apothecary',
      'cooking',
      'traditional',
    ],
    hi: ['खल-बट्टा', 'औषधि', 'आयुर्वेद', 'जड़ी-बूटी', 'मसाले', 'पीसना', 'दवा', 'रसायन', 'चूर्ण', 'वैद्य'],
    mr: ['खलबत्ता', 'औषध', 'आयुर्वेद', 'जडीबुटी', 'मसाले', 'वाटणे', 'दवा', 'रसायन', 'चूर्ण', 'वैद्य'],
  },
  build() {
    const brass = mat(0xb8862f, { metal: 0.85, rough: 0.35, side: THREE.DoubleSide });
    const stone = mat(0x4f5d73, { rough: 0.45, clearcoat: 0.4 });
    const tur = mat(0xf4b400, { rough: 0.95 });
    const chili = mat(C.red, { rough: 0.95 });
    const leaf = mat(C.green, { rough: 0.6 });
    const g = grp();
    g.add(
      mesh(
        geo.lathe(
          [
            [0.001, 0],
            [0.22, 0],
            [0.26, 0.03],
            [0.3, 0.12],
            [0.38, 0.3],
            [0.42, 0.42],
            [0.4, 0.44],
            [0.36, 0.42],
            [0.3, 0.3],
            [0.22, 0.18],
            [0.1, 0.13],
            [0.001, 0.12],
          ],
          36,
        ),
        brass,
      ),
    );
    g.add(mesh(geo.torus(0.41, 0.022, 8, 36), brass, [0, 0.43, 0], [PI / 2, 0, 0]));
    g.add(mesh(geo.dome(0.25, 18), tur, [-0.08, 0.12, 0.05], [0, 0, 0], [1, 0.7, 1]));
    g.add(mesh(geo.dome(0.15, 14), chili, [0.18, 0.15, -0.1], [0, 0, 0], [1, 0.8, 1]));
    const leaves: Array<[number, number, number]> = [
      [-0.22, 0.2, -0.1],
      [-0.12, 0.25, 0.18],
      [0.1, 0.2, 0.2],
      [-0.3, 0.27, 0.05],
    ];
    leaves.forEach(([x, y, z], i) =>
      g.add(mesh(geo.sphere(0.07, 10, 8), leaf, [x, y, z], [0.4 * i, i, 0.3], [1, 0.25, 0.6])),
    );
    const pe = grp();
    pe.position.set(-0.05, 0.16, 0.0);
    pe.rotation.z = -0.5;
    pe.scale.set(0.8, 1, 0.8);
    pe.add(
      mesh(
        geo.lathe(
          [
            [0.001, 0],
            [0.06, 0.01],
            [0.075, 0.1],
            [0.055, 0.3],
            [0.045, 0.5],
            [0.06, 0.62],
            [0.065, 0.7],
            [0.04, 0.75],
            [0.001, 0.76],
          ],
          20,
        ),
        stone,
      ),
    );
    g.add(pe);
    return g;
  },
};

export const cultureC: ObjectDef[] = [hourglass, cannon, quill, trophy, candle, map, mortar];
