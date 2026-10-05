import * as THREE from 'three';
import { C, at, geo, grp, mesh, named } from '../kit';
import type { ObjectDef } from '../types';
import { mat, part, polyShape, slab } from './nature-util';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- bridge
const bridge: ObjectDef = {
  key: 'bridge',
  name: { en: 'Bridge', hi: 'पुल', mr: 'पूल' },
  tags: {
    en: [
      'bridge',
      'bridges',
      'connection',
      'link',
      'river',
      'crossing',
      'span',
      'arch',
      'suspension',
      'civil engineering',
      'structure',
      'truss',
      'transition',
      'connect',
      'cantilever',
    ],
    hi: ['पुल', 'सेतु', 'नदी', 'जोड़', 'संपर्क', 'मेहराब', 'निर्माण', 'सिविल इंजीनियरिंग'],
    mr: ['पूल', 'सेतू', 'नदी', 'जोड', 'मेहराब', 'बांधकाम', 'स्थापत्य अभियांत्रिकी', 'दुवा', 'जोडणी'],
  },
  build() {
    const g = new THREE.Group();
    const earth = mat(0x8a5d3b, { rough: 1 });
    const grass = mat(0x2f8a3a, { rough: 0.95 });
    for (const s of [-1, 1]) {
      g.add(mesh(geo.box(1.1, 0.3, 1.6), earth, [s * 0.95, -0.15, 0]));
      g.add(mesh(geo.box(1.1, 0.04, 1.6), grass, [s * 0.95, 0.02, 0]));
    }
    // river
    g.add(
      mesh(
        geo.box(0.8, 0.1, 1.6),
        mat(0x2f8fe0, { rough: 0.12, metal: 0.1, emissive: 0x0a4a9a, glow: 0.35 }),
        [0, -0.2, 0],
      ),
    );
    const foam = mat(0xe8f6ff, { rough: 0.3, emissive: 0xaad4ff, glow: 0.3 });
    for (let i = 0; i < 3; i++)
      g.add(
        at(named(mesh(geo.box(0.3 + i * 0.08, 0.012, 0.035), foam), `ripple${i}`), (i - 1) * 0.22, -0.145, 0),
      );
    // bridge body: arch + sloped approaches, one extrusion
    const shape = new THREE.Shape();
    shape.moveTo(-1.1, -0.3);
    shape.lineTo(-0.4, -0.3);
    shape.lineTo(-0.4, 0);
    shape.absarc(0, 0, 0.4, Math.PI, 0, true);
    shape.lineTo(0.4, -0.3);
    shape.lineTo(1.1, -0.3);
    shape.lineTo(1.1, 0.02);
    shape.lineTo(0.45, 0.44);
    shape.lineTo(-0.45, 0.44);
    shape.lineTo(-1.1, 0.02);
    shape.closePath();
    g.add(mesh(slab(shape, 0.44, 0.01), mat(0xd9a77a, { rough: 0.85 })));
    const archM = mat(0xa8703f, { rough: 0.8 });
    for (const z of [-0.22, 0.22]) {
      g.add(mesh(new THREE.TorusGeometry(0.4, 0.028, 8, 28, Math.PI), archM, [0, 0, z]));
      g.add(mesh(geo.box(0.09, 0.1, 0.05), mat(C.gold, { metal: 0.8, rough: 0.3 }), [0, 0.41, z]));
    }
    // road + rails
    const road = mat(0xf0dcae, { rough: 0.95 });
    g.add(mesh(geo.box(0.92, 0.025, 0.3), road, [0, 0.45, 0]));
    const ramp = Math.hypot(0.65, 0.42);
    const rail = mat(0x8b5a2b, { rough: 0.7 });
    for (const s of [-1, 1]) {
      g.add(mesh(geo.box(ramp, 0.025, 0.3), road, [s * 0.775, 0.235, 0], [0, 0, -s * 0.573]));
      for (const z of [-0.2, 0.2]) {
        g.add(mesh(geo.box(0.92, 0.05, 0.04), rail, [0, 0.5, z]));
        g.add(mesh(geo.box(ramp, 0.05, 0.04), rail, [s * 0.775, 0.29, z], [0, 0, -s * 0.573]));
        g.add(mesh(geo.box(0.06, 0.12, 0.06), rail, [s * 0.46, 0.5, z]));
      }
    }
    const pine = mat(0x1f7a3e, { flat: true, rough: 0.9 });
    for (const [x, z, h] of [
      [1.2, 0.55, 0.3],
      [-1.2, -0.55, 0.26],
      [1.35, -0.5, 0.22],
      [-1.0, 0.6, 0.2],
    ] as const) {
      g.add(mesh(geo.cone(0.1, h, 7), pine, [x, 0.04 + h / 2, z]));
    }
    return g;
  },
  update(model, t) {
    for (let i = 0; i < 3; i++) {
      const p = part(model, `ripple${i}`);
      if (p) p.position.z = (((t * 0.25 + i / 3) % 1) - 0.5) * 1.4;
    }
  },
};

// ---------------------------------------------------------------- globe
type Land = [number, number, number, number, number];
const GLOBE_R = 0.42;
const globe: ObjectDef = {
  key: 'globe',
  name: { en: 'Globe', hi: 'ग्लोब', mr: 'ग्लोब' },
  tags: {
    en: [
      'globe',
      'earth',
      'world',
      'geography',
      'continents',
      'latitude',
      'longitude',
      'equator',
      'ocean',
      'global',
      'international',
      'countries',
      'hemisphere',
      'climate',
      'globalization',
      'axis',
    ],
    hi: [
      'ग्लोब',
      'पृथ्वी',
      'विश्व',
      'दुनिया',
      'भूगोल',
      'महाद्वीप',
      'अक्षांश',
      'देशांतर',
      'भूमध्य रेखा',
      'महासागर',
      'वैश्वीकरण',
      'गोलार्ध',
    ],
    mr: [
      'ग्लोब',
      'पृथ्वी',
      'जग',
      'विश्व',
      'भूगोल',
      'खंड',
      'खंडे',
      'अक्षांश',
      'रेखांश',
      'विषुववृत्त',
      'महासागर',
      'जागतिकीकरण',
      'गोलार्ध',
    ],
  },
  build() {
    const brass = mat(0xc99a3e, { metal: 0.9, rough: 0.28 });
    const g = grp(
      mesh(
        geo.lathe(
          [
            [0.42, 0],
            [0.42, 0.04],
            [0.36, 0.08],
            [0.14, 0.12],
            [0.07, 0.2],
            [0.05, 0.4],
          ],
          32,
        ),
        brass,
      ),
      mesh(geo.sphere(0.07, 16, 10), brass, [0, 0.42, 0]),
    );
    const tiltG = new THREE.Group();
    const tilt = 0.41;
    tiltG.rotation.z = tilt;
    tiltG.position.set(-0.5 * Math.sin(tilt), 0.42 + 0.5 * Math.cos(tilt) + 0.02, 0);
    tiltG.add(mesh(geo.torus(0.5, 0.02, 12, 64), brass));
    tiltG.add(mesh(geo.cyl(0.014, 0.014, 1.26, 10), brass));
    tiltG.add(mesh(geo.sphere(0.035, 10, 8), brass, [0, 0.63, 0]));
    tiltG.add(mesh(geo.sphere(0.035, 10, 8), brass, [0, -0.63, 0]));
    const spin = named(new THREE.Group(), 'spin');
    spin.add(
      mesh(
        geo.sphere(GLOBE_R, 40, 28),
        mat(0x1f72d6, { rough: 0.3, clearcoat: 0.7, emissive: 0x0a2a6a, glow: 0.25 }),
      ),
    );
    const green = mat(0x45b649, { rough: 0.75 });
    const tan = mat(0xdcb45a, { rough: 0.8 });
    const ice = mat(0xf4f8ff, { rough: 0.5 });
    const lands: Array<[Land, THREE.Material]> = [
      [[48, -100, 0.17, 0.12, 0], green],
      [[22, -101, 0.06, 0.08, 0], green],
      [[72, -42, 0.06, 0.07, 0], ice],
      [[-10, -60, 0.09, 0.15, 0], green],
      [[-40, -68, 0.03, 0.08, 0], green],
      [[8, 20, 0.15, 0.14, 0], tan],
      [[-20, 25, 0.08, 0.11, 0], tan],
      [[50, 15, 0.09, 0.06, 0], green],
      [[55, 85, 0.22, 0.11, 0], green],
      [[24, 80, 0.06, 0.08, 0], tan],
      [[30, 112, 0.11, 0.09, 0], green],
      [[-25, 135, 0.1, 0.07, 0], tan],
      [[-84, 0, 0.3, 0.06, 0], ice],
      [[88, 0, 0.12, 0.12, 0], ice],
    ];
    const east = new THREE.Vector3();
    const north = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const m4 = new THREE.Matrix4();
    for (const [[lat, lon, sx, sy], m] of lands) {
      const la = (lat * Math.PI) / 180;
      const lo = (lon * Math.PI) / 180;
      dir.set(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
      east.crossVectors(up, dir);
      if (east.lengthSq() < 1e-4) east.set(1, 0, 0);
      east.normalize();
      north.crossVectors(dir, east);
      const blob = mesh(geo.sphere(1, 14, 10), m, [0, 0, 0], [0, 0, 0], [sx, sy, 0.05]);
      blob.position.copy(dir).multiplyScalar(GLOBE_R * 0.985);
      blob.quaternion.setFromRotationMatrix(m4.makeBasis(east, north, dir));
      spin.add(blob);
    }
    tiltG.add(spin);
    g.add(tiltG);
    return g;
  },
  update(model, t) {
    const s = part(model, 'spin');
    if (s) s.rotation.y = t * 0.8;
  },
};

// ---------------------------------------------------------------- temple
const temple: ObjectDef = {
  key: 'temple',
  name: { en: 'Temple', hi: 'मंदिर', mr: 'मंदिर' },
  tags: {
    en: [
      'temple',
      'greek',
      'greece',
      'parthenon',
      'acropolis',
      'pillar',
      'column',
      'architecture',
      'worship',
      'ancient greece',
      'athens',
      'democracy',
      'shrine',
      'religion',
      'colonnade',
      'classical',
      'mythology',
    ],
    hi: [
      'मंदिर',
      'देवालय',
      'यूनान',
      'ग्रीस',
      'स्तंभ',
      'वास्तुकला',
      'पूजा',
      'धर्म',
      'देवता',
      'पौराणिक कथा',
      'एथेंस',
    ],
    mr: [
      'मंदिर',
      'देऊळ',
      'ग्रीस',
      'यूनान',
      'स्तंभ',
      'वास्तुकला',
      'पूजा',
      'धर्म',
      'देवता',
      'पुराणकथा',
      'अथेन्स',
    ],
  },
  build() {
    const marble = mat(0xf4efe4, { rough: 0.55 });
    const step = mat(0xdcd3c0, { rough: 0.7 });
    const gold = mat(0xe0b64a, { metal: 0.7, rough: 0.35, emissive: 0x7a5200, glow: 0.3 });
    const g = grp(
      mesh(
        geo.cyl(1.1, 1.12, 0.05, 40),
        mat(0x2f8a3a, { rough: 1 }),
        [0, 0.025, 0],
        [0, 0, 0],
        [0.8, 1, 1.0],
      ),
    );
    const tiers: Array<[number, number]> = [
      [1.5, 1.95],
      [1.4, 1.85],
      [1.3, 1.75],
    ];
    tiers.forEach(([w, d], i) => g.add(mesh(geo.box(w, 0.055, d), step, [0, 0.05 + 0.0275 + i * 0.055, 0])));
    const y0 = 0.05 + 3 * 0.055;
    // cella (inner room) + door
    g.add(mesh(geo.box(0.72, 0.56, 1.3), mat(0xd8c7a0, { rough: 0.8 }), [0, y0 + 0.28, 0]));
    g.add(mesh(geo.box(0.2, 0.3, 0.05), mat(0x2b1f3a), [0, y0 + 0.15, 0.66]));
    // columns (one lathe profile reused)
    const colGeo = geo.lathe(
      [
        [0.062, 0],
        [0.066, 0.025],
        [0.05, 0.05],
        [0.042, 0.3],
        [0.045, 0.48],
        [0.06, 0.52],
        [0.08, 0.56],
        [0.08, 0.6],
      ],
      16,
    );
    const xs = [-0.55, -0.33, -0.11, 0.11, 0.33, 0.55];
    const zs = [-0.78, -0.47, -0.16, 0.16, 0.47, 0.78];
    for (const z of [-0.78, 0.78]) for (const x of xs) g.add(mesh(colGeo, marble, [x, y0, z]));
    for (const x of [-0.55, 0.55]) for (const z of zs.slice(1, 5)) g.add(mesh(colGeo, marble, [x, y0, z]));
    const top = y0 + 0.6;
    g.add(mesh(geo.box(1.3, 0.09, 1.75), gold, [0, top + 0.045, 0]));
    g.add(mesh(geo.box(1.34, 0.03, 1.8), marble, [0, top + 0.105, 0]));
    // gable roof
    const gy = top + 0.12;
    g.add(
      mesh(
        slab(
          polyShape([
            [-0.67, 0],
            [0.67, 0],
            [0, 0.4],
          ]),
          1.78,
          0,
        ),
        marble,
        [0, gy, 0],
      ),
    );
    g.add(
      mesh(
        slab(
          polyShape([
            [-0.52, 0.04],
            [0.52, 0.04],
            [0, 0.3],
          ]),
          1.82,
          0,
        ),
        mat(0x2b6fc0, { rough: 0.5, emissive: 0x0a2a6a, glow: 0.3 }),
        [0, gy, 0],
      ),
    );
    const slope = Math.atan2(0.4, 0.67);
    const roofM = mat(0xc4573a, { rough: 0.7 });
    const hyp = Math.hypot(0.67, 0.4);
    for (const s of [-1, 1]) {
      g.add(
        mesh(
          geo.box(hyp + 0.04, 0.035, 1.9),
          roofM,
          [s * (0.335 + 0.02 * Math.sin(slope)), gy + 0.2 + 0.02 * Math.cos(slope), 0],
          [0, 0, -s * slope],
        ),
      );
    }
    for (const z of [-0.91, 0.91]) {
      g.add(mesh(geo.cyl(0.055, 0.055, 0.02, 20), gold, [0, gy + 0.15, z], [Math.PI / 2, 0, 0]));
    }
    g.add(mesh(geo.sphere(0.04, 12, 8), gold, [0, gy + 0.46, 0.88]));
    g.add(mesh(geo.sphere(0.04, 12, 8), gold, [0, gy + 0.46, -0.88]));
    return g;
  },
};

// ---------------------------------------------------------------- ship
const ship: ObjectDef = {
  key: 'ship',
  name: { en: 'Ship', hi: 'जहाज़', mr: 'जहाज' },
  tags: {
    en: [
      'ship',
      'ships',
      'boat',
      'voyage',
      'sailing',
      'navigation',
      'explorer',
      'columbus',
      'vasco da gama',
      'sea route',
      'trade',
      'colonial',
      'navy',
      'maritime',
      'pirate',
      'discovery',
      'harbour',
      'age of exploration',
    ],
    hi: [
      'जहाज',
      'नाव',
      'समुद्री यात्रा',
      'नौसेना',
      'नाविक',
      'समुद्र',
      'बंदरगाह',
      'व्यापार',
      'खोज',
      'कोलंबस',
      'वास्को दा गामा',
      'समुद्री मार्ग',
    ],
    mr: [
      'जहाज',
      'नाव',
      'सागरी प्रवास',
      'नौदल',
      'खलाशी',
      'समुद्र',
      'बंदर',
      'व्यापार',
      'शोध',
      'कोलंबस',
      'वास्को द गामा',
      'सागरी मार्ग',
    ],
  },
  build() {
    const g = grp(
      mesh(
        geo.cyl(1.2, 1.2, 0.26, 40),
        mat(0x1f8ad6, { rough: 0.2, opacity: 0.88, emissive: 0x0a3a7a, glow: 0.3 }),
        [0, -0.17, 0],
        [0, 0, 0],
        [1, 1, 0.68],
      ),
    );
    g.add(
      mesh(
        geo.torus(0.35, 0.03, 8, 48),
        mat(0xffffff, { rough: 0.4, emissive: 0xaaccee, glow: 0.3 }),
        [0, -0.04, 0],
        [Math.PI / 2, 0, 0],
        [2.4, 1, 1],
      ),
    );
    const s = named(new THREE.Group(), 'ship');
    const wood = mat(0x8a4f26, { rough: 0.7 });
    const dark = mat(0x4f2c14, { rough: 0.8 });
    const sailM = mat(0xfff3d6, { rough: 0.85, side: THREE.DoubleSide });
    const gold = mat(C.gold, { metal: 0.8, rough: 0.3 });
    // hull
    s.add(
      mesh(
        geo.lathe(
          [
            [0, -0.22],
            [0.14, -0.21],
            [0.26, -0.13],
            [0.33, -0.01],
            [0.35, 0.12],
            [0.35, 0.16],
          ],
          32,
        ),
        mat(0x8a4f26, { rough: 0.7, side: THREE.DoubleSide }),
        [0, 0, 0],
        [0, 0, 0],
        [2.3, 1, 1],
      ),
    );
    s.add(
      mesh(
        geo.cyl(0.33, 0.33, 0.02, 32),
        mat(0xc79a62, { rough: 0.8 }),
        [0, 0.12, 0],
        [0, 0, 0],
        [2.3, 1, 1],
      ),
    );
    s.add(mesh(geo.torus(0.35, 0.02, 8, 48), gold, [0, 0.16, 0], [Math.PI / 2, 0, 0], [2.3, 1, 1]));
    s.add(mesh(geo.torus(0.3, 0.014, 8, 48), gold, [0, 0.0, 0], [Math.PI / 2, 0, 0], [2.3, 1, 1]));
    // prow
    const prow = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.75, 0.05, 0),
      new THREE.Vector3(0.92, 0.2, 0),
      new THREE.Vector3(1.08, 0.3, 0),
    ]);
    s.add(mesh(geo.tube(prow, 10, 0.03, 8), dark));
    // stern castle
    s.add(mesh(geo.box(0.3, 0.2, 0.4), dark, [-0.56, 0.22, 0]));
    s.add(mesh(geo.box(0.34, 0.03, 0.44), wood, [-0.56, 0.33, 0]));
    const win = mat(0xffd36b, { emissive: 0xffaa22, glow: 1.2 });
    for (const z of [-0.1, 0.1]) s.add(mesh(geo.box(0.02, 0.07, 0.07), win, [-0.715, 0.24, z]));
    // masts, sails
    const masts: Array<[number, number]> = [
      [0.02, 1.15],
      [0.52, 0.85],
      [-0.5, 0.75],
    ];
    for (const [x, h] of masts) s.add(mesh(geo.cyl(0.022, 0.03, h, 10), dark, [x, 0.12 + h / 2, 0]));
    const sail = (x: number, y: number, sy: number, sz: number): void => {
      s.add(mesh(geo.sphere(1, 18, 12), sailM, [x + 0.04, y, 0], [0, 0, 0], [0.07, sy, sz]));
      s.add(mesh(geo.cyl(0.014, 0.014, sz * 2.1, 6), dark, [x, y + sy, 0], [Math.PI / 2, 0, 0]));
    };
    sail(0.02, 0.6, 0.27, 0.3);
    sail(0.02, 1.0, 0.15, 0.22);
    sail(0.52, 0.55, 0.2, 0.24);
    // mizzen gaff sail + jib (flat triangles)
    s.add(
      mesh(
        slab(
          polyShape([
            [0, 0],
            [-0.4, 0],
            [0, 0.5],
          ]),
          0.02,
          0,
        ),
        sailM,
        [-0.5, 0.26, 0],
      ),
    );
    s.add(
      mesh(
        slab(
          polyShape([
            [0, 0],
            [0, 0.6],
            [0.45, 0],
          ]),
          0.02,
          0,
        ),
        sailM,
        [0.55, 0.22, 0],
      ),
    );
    // flag
    const flag = named(new THREE.Group(), 'flag');
    flag.position.set(0.02, 1.3, 0);
    flag.add(
      mesh(geo.plane(0.24, 0.14), mat(C.crimson, { side: THREE.DoubleSide, rough: 0.7 }), [0.12, 0, 0]),
    );
    flag.add(
      mesh(geo.plane(0.24, 0.04), mat(C.gold, { side: THREE.DoubleSide, rough: 0.5 }), [0.12, 0, 0.001]),
    );
    s.add(mesh(geo.cyl(0.008, 0.008, 0.16, 6), gold, [0.02, 1.27, 0]));
    s.add(flag);
    g.add(s);
    return g;
  },
  update(model, t) {
    const s = part(model, 'ship');
    if (s) {
      s.position.y = Math.sin(t * 1.6) * 0.03;
      s.rotation.x = Math.sin(t * 1.3) * 0.05;
      s.rotation.z = Math.sin(t * 1.6 + 1) * 0.035;
    }
    const f = part(model, 'flag');
    if (f) f.rotation.y = Math.sin(t * 5) * 0.3;
  },
};

// ---------------------------------------------------------------- gear
function gearGeo(
  n: number,
  pitch: number,
  tooth: number,
  holeAt: number,
  holeN: number,
  holeR: number,
): THREE.ExtrudeGeometry {
  const root = pitch - tooth / 2;
  const outer = pitch + tooth / 2;
  const p = TAU / n;
  const pts: Array<[number, number]> = [];
  const at2 = (a: number, r: number): void => {
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  };
  for (let i = 0; i < n; i++) {
    const a = i * p;
    at2(a - 0.27 * p, root);
    at2(a - 0.15 * p, outer);
    at2(a + 0.15 * p, outer);
    at2(a + 0.27 * p, root);
    at2(a + 0.5 * p, root);
  }
  const shape = polyShape(pts);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.06, 0, TAU, true);
  shape.holes.push(bore);
  for (let i = 0; i < holeN; i++) {
    const a = (i / holeN) * TAU;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * holeAt, Math.sin(a) * holeAt, holeR, 0, TAU, true);
    shape.holes.push(h);
  }
  return slab(shape, 0.1, 0.01);
}

const N1 = 14;
const N2 = 9;
const PITCH1 = 0.42;
const PITCH2 = (PITCH1 * N2) / N1;
const GEAR_PHI0 = Math.PI - Math.PI / N2;
const gear: ObjectDef = {
  key: 'gear',
  name: { en: 'Gear', hi: 'गियर', mr: 'गियर' },
  tags: {
    en: [
      'gear',
      'gears',
      'cog',
      'machine',
      'machinery',
      'mechanism',
      'engineering',
      'industry',
      'industrial revolution',
      'automation',
      'mechanical',
      'factory',
      'transmission',
      'torque',
      'technology',
      'clockwork',
      'manufacturing',
    ],
    hi: [
      'गियर',
      'चक्का',
      'मशीन',
      'यंत्र',
      'तंत्र',
      'अभियांत्रिकी',
      'इंजीनियरिंग',
      'उद्योग',
      'औद्योगिक क्रांति',
      'स्वचालन',
      'कारखाना',
      'यांत्रिकी',
    ],
    mr: [
      'गियर',
      'चाक',
      'यंत्र',
      'मशीन',
      'यंत्रणा',
      'अभियांत्रिकी',
      'उद्योग',
      'औद्योगिक क्रांती',
      'स्वयंचलन',
      'कारखाना',
      'यांत्रिकी',
    ],
  },
  build() {
    const g = grp(
      mesh(geo.cyl(0.6, 0.66, 0.1, 40), mat(C.darkStone, { rough: 0.6, metal: 0.3 }), [0, 0.05, 0]),
      mesh(geo.cyl(0.055, 0.07, 0.82, 12), mat(C.steel, { metal: 0.9, rough: 0.3 }), [0, 0.46, -0.08]),
    );
    const rig = new THREE.Group();
    rig.position.set(0, 0.92, 0);
    rig.rotation.x = -1.0;
    const gold = mat(0xf0b72b, { metal: 0.95, rough: 0.25 });
    const copper = mat(0xd2693a, { metal: 0.9, rough: 0.3 });
    const steel = mat(C.silver, { metal: 1, rough: 0.2 });
    const cx = (PITCH1 + PITCH2) / 2;
    rig.add(mesh(geo.box(1.65, 0.95, 0.04), mat(0x3a2a4a, { rough: 0.7, metal: 0.2 }), [0, 0, -0.1]));
    const a = named(new THREE.Group(), 'gearA');
    a.position.x = -cx;
    a.add(mesh(gearGeo(N1, PITCH1, 0.09, 0.22, 5, 0.06), gold));
    a.add(mesh(geo.cyl(0.11, 0.11, 0.16, 18), steel, [0, 0, 0], [Math.PI / 2, 0, 0]));
    const b = named(new THREE.Group(), 'gearB');
    b.position.x = PITCH1 + PITCH2 - cx;
    b.add(mesh(gearGeo(N2, PITCH2, 0.09, 0.14, 4, 0.04), copper));
    b.add(mesh(geo.cyl(0.08, 0.08, 0.16, 18), steel, [0, 0, 0], [Math.PI / 2, 0, 0]));
    b.rotation.z = GEAR_PHI0;
    rig.add(a, b);
    const bolt = mat(C.steel, { metal: 1, rough: 0.3 });
    for (const [x, y] of [
      [-0.72, 0.4],
      [0.72, 0.4],
      [-0.72, -0.4],
      [0.72, -0.4],
    ] as const) {
      rig.add(mesh(geo.sphere(0.03, 8, 6), bolt, [x, y, -0.07]));
    }
    g.add(rig);
    return g;
  },
  update(model, t) {
    const a = part(model, 'gearA');
    const b = part(model, 'gearB');
    const th = t * 0.6;
    if (a) a.rotation.z = th;
    if (b) b.rotation.z = GEAR_PHI0 - (th * N1) / N2;
  },
};

// ---------------------------------------------------------------- crystal
const SHARDS = 4;
const crystal: ObjectDef = {
  key: 'crystal',
  name: { en: 'Mystery crystal', hi: 'रहस्य क्रिस्टल', mr: 'रहस्य क्रिस्टल' },
  tags: { en: [], hi: [], mr: [] },
  build() {
    const g = grp(
      mesh(
        geo.dodeca(0.4),
        mat(0x3b3550, { rough: 0.9, flat: true }),
        [0, 0.08, 0],
        [0, 0.5, 0],
        [1.3, 0.45, 1.1],
      ),
    );
    const pebble = mat(0x52486e, { rough: 0.9, flat: true });
    g.add(mesh(geo.dodeca(0.09), pebble, [0.52, 0.08, 0.25]));
    g.add(mesh(geo.dodeca(0.07), pebble, [-0.5, 0.06, 0.3]));
    g.add(mesh(geo.dodeca(0.06), pebble, [0.1, 0.05, -0.55]));
    const cr = (
      x: number,
      z: number,
      r: number,
      h: number,
      tiltAz: number,
      tilt: number,
      col: number,
      glow: number,
    ): void => {
      const m = mat(col, {
        rough: 0.3,
        metal: 0.05,
        flat: true,
        emissive: col,
        glow: glow * 0.55,
        opacity: 0.88,
      });
      const c = grp(
        mesh(geo.cyl(r * 0.92, r, h * 0.7, 6), m, [0, h * 0.35, 0]),
        mesh(geo.cone(r * 0.92, h * 0.3, 6), m, [0, h * 0.7 + h * 0.15, 0]),
      );
      c.position.set(x, 0.12, z);
      c.rotation.set(tilt * Math.sin(tiltAz), 0.4 * x, -tilt * Math.cos(tiltAz));
      g.add(c);
    };
    cr(0, 0, 0.15, 1.05, 0, 0, 0x7c3aed, 0.6);
    cr(0.27, 0.06, 0.1, 0.65, 0.2, 0.35, 0x06b6d4, 0.8);
    cr(-0.25, 0.1, 0.11, 0.75, 3.3, 0.3, 0xe11d74, 0.8);
    cr(0.05, -0.27, 0.09, 0.55, 4.7, 0.35, 0x10b981, 0.8);
    cr(-0.1, 0.3, 0.08, 0.45, 1.6, 0.5, 0x2563eb, 0.8);
    cr(0.4, -0.22, 0.07, 0.4, 5.6, 0.55, 0xa855f7, 0.8);
    cr(-0.42, -0.15, 0.07, 0.42, 4.0, 0.5, 0x06b6d4, 0.8);
    cr(0.15, 0.38, 0.06, 0.32, 0.9, 0.55, 0xe11d74, 0.8);
    const core = mat(0xffffff, { emissive: 0xd9c8ff, glow: 1.6 });
    g.add(at(named(mesh(geo.octa(0.1), core, [0, 0, 0], [0, 0, 0], [1, 1.6, 1]), 'core'), 0, 0.5, 0));
    const shardM = mat(0xc4b5fd, { rough: 0.1, emissive: 0xa78bfa, glow: 1, opacity: 0.9, flat: true });
    for (let i = 0; i < SHARDS; i++) {
      g.add(
        at(
          named(mesh(geo.octa(0.055), shardM, [0, 0, 0], [0, 0, 0], [0.8, 1.5, 0.8]), `shard${i}`),
          Math.cos((i / SHARDS) * TAU) * 0.6,
          0.6,
          Math.sin((i / SHARDS) * TAU) * 0.6,
        ),
      );
    }
    return g;
  },
  update(model, t) {
    const core = part(model, 'core');
    if (core) core.scale.setScalar(1 + Math.sin(t * 2.4) * 0.22);
    for (let i = 0; i < SHARDS; i++) {
      const s = part(model, `shard${i}`);
      if (!s) continue;
      const a = (i / SHARDS) * TAU + t * 0.7;
      s.position.set(Math.cos(a) * 0.62, 0.6 + Math.sin(t * 1.5 + i * 1.7) * 0.15, Math.sin(a) * 0.62);
      s.rotation.y = t * 1.2 + i;
    }
  },
};

export const natureB: ObjectDef[] = [bridge, globe, temple, ship, gear, crystal];
