import * as THREE from 'three';
import type { ObjectDef } from '../types';
import { C, geo, grp, mat, mesh, named } from '../kit';
import { aim, fibDirs, glassy, part, smoothIco, teardrop } from './science-util';

const PI = Math.PI;
const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

// ───────────────────────── prism ─────────────────────────
const prism: ObjectDef = {
  key: 'prism',
  name: { en: 'Prism', hi: 'प्रिज्म', mr: 'प्रिझम' },
  tags: {
    en: [
      'light',
      'refraction',
      'dispersion',
      'rainbow',
      'spectrum',
      'vibgyor',
      'newton',
      'optics',
      'colour',
      'reflection',
      'wavelength',
      'glass',
      'triangle',
      'white light',
      'ray',
    ],
    hi: [
      'प्रिज्म',
      'अपवर्तन',
      'परावर्तन',
      'वर्ण विक्षेपण',
      'इंद्रधनुष',
      'स्पेक्ट्रम',
      'प्रकाश',
      'किरण',
      'रंग',
      'तरंगदैर्ध्य',
      'न्यूटन',
    ],
    mr: [
      'प्रिझम',
      'अपवर्तन',
      'परावर्तन',
      'वर्णपट',
      'इंद्रधनुष्य',
      'प्रकाश',
      'किरण',
      'रंग',
      'तरंगलांबी',
      'न्यूटन',
      'प्रकाशकिरण',
    ],
  },
  idle: ['float'],
  build() {
    const g = grp();
    const sway = named(grp(), 'sway');
    g.add(sway);
    sway.add(
      mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 0.4, 3),
        glassy(
          mat(0xd8f2ff, {
            rough: 0.03,
            metal: 0.1,
            opacity: 0.55,
            clearcoat: 1,
            emissive: 0x6ab8ff,
            glow: 0.25,
          }),
        ),
        [0, 0.3, 0],
        [-PI / 2, 0, 0],
      ),
    );
    // edges
    const edge = mat(C.white, { emissive: C.white, glow: 0.6, rough: 0.2 });
    for (const z of [0.205, -0.205])
      sway.add(mesh(new THREE.TorusGeometry(0.6, 0.008, 4, 3), edge, [0, 0.3, z], [0, 0, PI / 2]));
    const beam = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      c: THREE.ColorRepresentation,
      w: number,
      glow: number,
    ): THREE.Mesh => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      return mesh(
        geo.box(len, w, w * 1.3),
        mat(c, { emissive: c, glow, rough: 0.4 }),
        [(x1 + x2) / 2, (y1 + y2) / 2, 0],
        [0, 0, Math.atan2(y2 - y1, x2 - x1)],
      );
    };
    sway.add(beam(-0.85, 0.05, -0.17, 0.3, C.white, 0.05, 1.5));
    const cols = [0xff2d2d, 0xff8a1f, 0xffe11f, 0x2fdc4a, 0x22c7ff, 0x3a5cff, 0x9b4dff];
    cols.forEach((c, i) => {
      const a = -0.05 - i * 0.075;
      const x0 = 0.2;
      const y0 = 0.26;
      sway.add(beam(x0, y0, x0 + Math.cos(a) * 0.8, y0 + Math.sin(a) * 0.8 + 0.0, c, 0.035, 1.6));
    });
    return g;
  },
  update(model, t) {
    const s = part(model, 'sway');
    if (s) s.rotation.y = Math.sin(t * 0.6) * 0.5;
  },
};

// ───────────────────────── lightning ─────────────────────────
const lightning: ObjectDef = {
  key: 'lightning',
  name: { en: 'Lightning', hi: 'आकाशीय बिजली', mr: 'वीज' },
  tags: {
    en: [
      'thunder',
      'storm',
      'electricity',
      'static',
      'discharge',
      'cloud',
      'thunderstorm',
      'rain',
      'franklin',
      'lightning rod',
      'charge',
      'electric',
      'weather',
      'flash',
      'bolt',
      'power',
    ],
    hi: [
      'बिजली',
      'आकाशीय बिजली',
      'गर्जना',
      'तूफान',
      'बादल',
      'स्थिर विद्युत',
      'आवेश',
      'तड़ित',
      'तड़ित चालक',
      'बारिश',
    ],
    mr: [
      'वीज',
      'विजांचा कडकडाट',
      'गडगडाट',
      'वादळ',
      'ढग',
      'स्थिर विद्युत',
      'प्रभार',
      'तडित',
      'तडित वाहक',
      'पाऊस',
    ],
  },
  build() {
    const g = grp();
    const cloud = mat(0x4b5567, { rough: 0.95 });
    const dark = mat(0x343c4d, { rough: 0.95 });
    for (const [x, y, z, r, d] of [
      [0, 1.14, 0, 0.3, 0],
      [-0.33, 1.06, 0, 0.24, 1],
      [0.33, 1.06, 0.02, 0.25, 1],
      [-0.14, 1.22, 0.1, 0.22, 0],
      [0.16, 1.24, -0.1, 0.22, 0],
      [0, 1.05, 0.22, 0.22, 1],
      [-0.06, 1.02, -0.22, 0.22, 1],
      [0.05, 1.0, 0, 0.3, 1],
    ] as const)
      g.add(mesh(geo.sphere(r, 20, 14), d ? dark : cloud, [x, y, z], [0, 0, 0], [1, 0.82, 1]));
    const shape: Array<[number, number]> = [
      [-0.12, 1.0],
      [0.26, 1.0],
      [0.1, 0.64],
      [0.34, 0.64],
      [-0.2, 0.0],
      [-0.04, 0.4],
      [-0.32, 0.4],
    ];
    const bolt = named(
      mesh(
        geo.extrude(shape, 0.1, 0.012),
        mat(0xffb300, { emissive: 0xff9900, glow: 0.6, rough: 0.3 }),
        [0, 0, -0.05],
      ),
      'bolt',
    );
    g.add(bolt);
    const glow = named(
      mesh(
        geo.cyl(0.26, 0.26, 0.02, 28),
        mat(0xffd84a, { emissive: 0xffc400, glow: 0.8, opacity: 0.75 }),
        [-0.2, 0.012, 0],
      ),
      'glow',
    );
    g.add(glow);
    const rain = mat(C.cyan, { rough: 0.2, opacity: 0.8 });
    for (const [x, z] of [
      [-0.45, 0.2],
      [0.5, -0.1],
      [0.42, 0.3],
      [-0.4, -0.25],
    ] as const)
      g.add(mesh(geo.capsule(0.015, 0.1), rain, [x, 0.6, z]));
    return g;
  },
  update(model, t) {
    const f = Math.max(0, Math.sin(t * 17) * Math.sin(t * 5.3 + 1));
    const b = part(model, 'bolt');
    if (b) b.scale.set(1 + f * 0.12, 1, 1 + f * 0.8);
    const gl = part(model, 'glow');
    if (gl) gl.scale.setScalar(1 + f * 0.5);
  },
};

// ───────────────────────── brain ─────────────────────────
const smooth01 = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hemisphere(side: 1 | -1): THREE.BufferGeometry {
  const g = smoothIco(1, 14);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const d = new THREE.Vector3();
  const c = new THREE.Color();
  const tc = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const ph =
      7 * (d.x * 0.7 + d.y * 0.5 + d.z * 0.4) +
      3 * Math.sin(5 * d.z + 2 * d.x) +
      2.4 * Math.sin(6 * d.y + 3 * d.z);
    const r = 1 + 0.06 * (Math.pow(Math.abs(Math.sin(ph)), 0.5) - 0.7);
    const mx = side * d.x;
    const lat = mx < 0 ? mx * 0.15 : mx;
    p.setXYZ(i, side * (0.058 + 0.3 * lat * r), 0.42 + d.y * 0.33 * r, d.z * 0.55 * r);
    c.set(0xe8903a);
    c.lerp(tc.set(0x2fb58f), smooth01(0.05, -0.3, d.y));
    c.lerp(tc.set(0xe0456f), smooth01(0.1, 0.5, d.z));
    c.lerp(tc.set(0x4f6fe0), smooth01(-0.3, -0.6, d.z));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const brain: ObjectDef = {
  key: 'brain',
  name: { en: 'Brain', hi: 'मस्तिष्क', mr: 'मेंदू' },
  tags: {
    en: [
      'neuron',
      'nervous system',
      'mind',
      'memory',
      'cerebrum',
      'cerebellum',
      'thinking',
      'intelligence',
      'psychology',
      'cognition',
      'neuroscience',
      'lobe',
      'cortex',
      'nerve',
      'learning',
      'consciousness',
    ],
    hi: [
      'मस्तिष्क',
      'दिमाग',
      'तंत्रिका',
      'तंत्रिका तंत्र',
      'न्यूरॉन',
      'स्मृति',
      'मन',
      'बुद्धि',
      'सेरेब्रम',
      'अनुमस्तिष्क',
      'सोच',
    ],
    mr: [
      'मेंदू',
      'मज्जासंस्था',
      'चेतासंस्था',
      'मज्जापेशी',
      'स्मृती',
      'मन',
      'बुद्धी',
      'प्रमस्तिष्क',
      'अनुमस्तिष्क',
      'विचार',
    ],
  },
  idle: ['float', 'rotate', 'pulse'],
  build() {
    const g = grp();
    for (const s of [1, -1] as const) {
      const m = mat(0xffffff, { rough: 0.5, clearcoat: 0.4, emissive: 0x010101 });
      m.vertexColors = true;
      g.add(mesh(hemisphere(s), m));
    }
    // cerebellum
    const cg = smoothIco(1, 4);
    const p = cg.getAttribute('position') as THREE.BufferAttribute;
    const d = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i).normalize();
      const r = 1 + 0.04 * Math.sin(d.y * 28);
      p.setXYZ(i, d.x * 0.3 * r, 0.2 + d.y * 0.16 * r, -0.42 + d.z * 0.2 * r);
    }
    cg.computeVertexNormals();
    g.add(mesh(cg, mat(0xc0567a, { rough: 0.55, clearcoat: 0.4 })));
    const stem = mesh(
      geo.cyl(0.06, 0.05, 0.3, 16),
      mat(0xe8b4c0, { rough: 0.6 }),
      [0, 0.12, -0.14],
      [-0.35, 0, 0],
    );
    g.add(stem);
    return g;
  },
};

// ───────────────────────── eye ─────────────────────────
const eye: ObjectDef = {
  key: 'eye',
  name: { en: 'Eye', hi: 'आँख', mr: 'डोळा' },
  tags: {
    en: [
      'vision',
      'sight',
      'retina',
      'cornea',
      'lens',
      'pupil',
      'iris',
      'optic nerve',
      'see',
      'optics',
      'eyeball',
      'perception',
      'observe',
      'colour blindness',
      'myopia',
      'light',
    ],
    hi: [
      'आँख',
      'नेत्र',
      'दृष्टि',
      'रेटिना',
      'कॉर्निया',
      'पुतली',
      'परितारिका',
      'दृक तंत्रिका',
      'देखना',
      'निकट दृष्टि',
    ],
    mr: [
      'डोळा',
      'नेत्र',
      'दृष्टी',
      'दृष्टिपटल',
      'स्वच्छपटल',
      'बाहुली',
      'तारका',
      'दृक मज्जा',
      'पाहणे',
      'निकटदृष्टी',
    ],
  },
  idle: ['float'],
  build() {
    const g = grp();
    const ball = named(grp(), 'eyeball');
    ball.position.y = 0.58;
    ball.add(mesh(geo.sphere(0.5, 40, 28), mat(0xf6f1ea, { rough: 0.3, clearcoat: 0.8 })));
    const cap = (
      r: number,
      ang: number,
      c: THREE.ColorRepresentation,
      o: { glow?: number } = {},
    ): THREE.Mesh => {
      const m = mesh(
        new THREE.SphereGeometry(r, 32, 10, 0, PI * 2, 0, ang),
        mat(c, { rough: 0.35, clearcoat: 0.6, ...(o.glow ? { emissive: c, glow: o.glow } : {}) }),
        [0, 0, 0],
        [PI / 2, 0, 0],
      );
      return m;
    };
    ball.add(cap(0.505, 0.62, 0x1f78c8, { glow: 0.2 }));
    ball.add(cap(0.508, 0.42, 0x52cfe6, { glow: 0.3 }));
    ball.add(cap(0.512, 0.2, C.black));
    ball.add(
      mesh(
        new THREE.SphereGeometry(0.54, 32, 10, 0, PI * 2, 0, 0.78),
        glassy(mat(C.white, { rough: 0.02, opacity: 0.22, clearcoat: 1 })),
        [0, 0, 0],
        [PI / 2, 0, 0],
      ),
    );
    ball.add(
      mesh(geo.sphere(0.04, 12, 8), mat(C.white, { emissive: C.white, glow: 1.5 }), [0.09, 0.1, 0.53]),
    );
    ball.add(
      mesh(geo.cyl(0.085, 0.1, 0.45, 16), mat(0xe9c46a, { rough: 0.5 }), [0, 0, -0.66], [PI / 2, 0, 0]),
    );
    const vein = mat(C.crimson, { rough: 0.5 });
    const veins: Array<[[number, number, number], [number, number, number]]> = [
      [
        [0.95, 0.3, 0.15],
        [0.7, -0.5, -0.3],
      ],
      [
        [-0.95, 0.25, 0.1],
        [-0.7, -0.4, -0.4],
      ],
      [
        [0.5, 0.85, 0.1],
        [0.7, 0.4, -0.5],
      ],
      [
        [-0.4, -0.9, 0.2],
        [-0.7, -0.5, -0.4],
      ],
      [
        [0.3, -0.9, 0.2],
        [0.5, -0.6, -0.6],
      ],
    ];
    for (const [a, b] of veins) {
      const A = v3(...a).normalize();
      const B = v3(...b).normalize();
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        pts.push(
          A.clone()
            .lerp(B, u)
            .normalize()
            .multiplyScalar(0.503)
            .add(v3(0.008 * Math.sin(u * 12), 0, 0.008 * Math.cos(u * 9))),
        );
      }
      ball.add(mesh(geo.tube(new THREE.CatmullRomCurve3(pts), 16, 0.007, 5), vein));
    }
    g.add(ball);
    return g;
  },
  update(model, t) {
    const b = part(model, 'eyeball');
    if (b) {
      b.rotation.y = Math.sin(t * 0.8) * 0.55;
      b.rotation.x = Math.sin(t * 0.55 + 1) * 0.15;
    }
  },
};

// ───────────────────────── droplet ─────────────────────────
const droplet: ObjectDef = {
  key: 'droplet',
  name: { en: 'Water drop', hi: 'पानी की बूँद', mr: 'थेंब' },
  tags: {
    en: [
      'water',
      'rain',
      'liquid',
      'hydrology',
      'water cycle',
      'raindrop',
      'tear',
      'dew',
      'h2o',
      'moisture',
      'evaporation',
      'condensation',
      'surface tension',
      'hydrate',
      'fluid',
      'precipitation',
    ],
    hi: ['बूँद', 'पानी', 'जल', 'वर्षा', 'जल चक्र', 'ओस', 'वाष्पीकरण', 'संघनन', 'पृष्ठ तनाव', 'आँसू', 'तरल'],
    mr: ['थेंब', 'पाणी', 'जल', 'पाऊस', 'जलचक्र', 'दव', 'बाष्पीभवन', 'संघनन', 'पृष्ठीय ताण', 'अश्रू', 'द्रव'],
  },
  build() {
    const g = grp();
    g.add(
      mesh(
        teardrop(0.46, 1.0, 1, 24),
        mat(0x2f8fff, {
          rough: 0.05,
          metal: 0.05,
          opacity: 0.85,
          clearcoat: 1,
          emissive: 0x1b6fe0,
          glow: 0.35,
        }),
        [0, 0.24, 0],
      ),
    );
    g.add(
      mesh(
        geo.sphere(1, 12, 8),
        mat(C.white, { emissive: C.white, glow: 1.2, opacity: 0.85 }),
        [-0.17, 0.56, 0.29],
        [0.2, -0.5, 0.2],
        [0.05, 0.13, 0.035],
      ),
    );
    const rip = mat(C.cyan, { emissive: C.cyan, glow: 0.7, rough: 0.3, opacity: 0.75 });
    for (let k = 0; k < 2; k++)
      g.add(named(mesh(geo.torus(0.4, 0.013, 6, 48), rip, [0, 0.02, 0], [PI / 2, 0, 0]), `rip${k}`));
    return g;
  },
  update(model, t) {
    for (let k = 0; k < 2; k++) {
      const r = part(model, `rip${k}`);
      if (r) r.scale.setScalar(0.45 + ((t * 0.5 + k * 0.5) % 1) * 0.75);
    }
  },
};

// ───────────────────────── flame ─────────────────────────
const flame: ObjectDef = {
  key: 'flame',
  name: { en: 'Flame', hi: 'ज्वाला', mr: 'ज्योत' },
  tags: {
    en: [
      'fire',
      'combustion',
      'burn',
      'heat',
      'oxidation',
      'campfire',
      'energy',
      'fuel',
      'candle',
      'inflammation',
      'bonfire',
      'agni',
      'thermal',
      'ignite',
      'warmth',
      'light',
    ],
    hi: ['आग', 'अग्नि', 'ज्वाला', 'दहन', 'ऊष्मा', 'ताप', 'ईंधन', 'अलाव', 'ज्योति', 'गर्मी'],
    mr: ['आग', 'अग्नी', 'ज्योत', 'ज्वाला', 'ज्वलन', 'उष्णता', 'इंधन', 'शेकोटी', 'उष्मा', 'तापमान'],
  },
  build() {
    const g = grp();
    const log = mat(C.darkWood, { rough: 0.9 });
    for (let i = 0; i < 3; i++)
      g.add(
        mesh(
          geo.cyl(0.07, 0.07, 0.75, 12),
          log,
          [0, 0.07 + i * 0.01, 0],
          [0.15 * (i - 1), (i * PI) / 3, PI / 2],
        ),
      );
    const stone = mat(C.darkStone, { rough: 0.9, flat: true });
    for (let i = 0; i < 7; i++) {
      const a = (i * 2 * PI) / 7;
      g.add(
        mesh(
          geo.dodeca(0.09),
          stone,
          [Math.cos(a) * 0.46, 0.06, Math.sin(a) * 0.46],
          [i, i * 2, 0],
          [1, 0.7, 1],
        ),
      );
    }
    const tongue = (
      name: string,
      r: number,
      h: number,
      x: number,
      rz: number,
      c: THREE.ColorRepresentation,
      glow: number,
      sharp = 1.3,
    ): THREE.Group => {
      const p = named(grp(), name);
      p.position.set(x, 0.1, 0);
      p.rotation.z = rz;
      p.add(mesh(teardrop(r, h, sharp, 20), mat(c, { emissive: c, glow, rough: 0.6, opacity: 0.93 })));
      return p;
    };
    g.add(tongue('f1', 0.17, 0.62, -0.17, 0.3, C.red, 1.3));
    g.add(tongue('f2', 0.19, 0.7, 0.18, -0.28, C.red, 1.3));
    g.add(tongue('f0', 0.3, 1.05, 0, 0, C.orange, 1.6));
    g.add(tongue('f3', 0.21, 0.75, 0, 0, C.yellow, 2));
    g.add(tongue('f4', 0.11, 0.4, 0, 0, 0xfffbe0, 2.4));
    g.add(
      mesh(
        geo.sphere(0.15, 14, 10),
        mat(C.blue, { emissive: C.blue, glow: 1.6, opacity: 0.8 }),
        [0, 0.14, 0.12],
        [0, 0, 0],
        [1, 0.5, 1],
      ),
    );
    return g;
  },
  update(model, t) {
    ['f0', 'f1', 'f2', 'f3', 'f4'].forEach((n, i) => {
      const f = part(model, n);
      if (!f) return;
      f.scale.set(
        1 + 0.05 * Math.sin(t * 11 + i),
        1 + 0.12 * Math.sin(t * 9 + i * 1.7) + 0.05 * Math.sin(t * 19 + i),
        1,
      );
      f.rotation.x = Math.sin(t * 6 + i) * 0.06;
    });
  },
};

// ───────────────────────── spring ─────────────────────────
const spring: ObjectDef = {
  key: 'spring',
  name: { en: 'Spring', hi: 'स्प्रिंग', mr: 'स्प्रिंग' },
  tags: {
    en: [
      'hooke',
      'elasticity',
      'coil',
      'oscillation',
      'force',
      'elastic',
      'compression',
      'extension',
      'stretch',
      'potential energy',
      'shm',
      'spring constant',
      'restoring force',
      'bounce',
      'tension',
      'stiffness',
    ],
    hi: [
      'स्प्रिंग',
      'कमानी',
      'हुक का नियम',
      'प्रत्यास्थता',
      'कुंडली',
      'बल',
      'संपीड़न',
      'खिंचाव',
      'स्थितिज ऊर्जा',
      'दोलन',
    ],
    mr: [
      'स्प्रिंग',
      'कमानी',
      'हुकचा नियम',
      'स्थितिस्थापकत्व',
      'बल',
      'संपीडन',
      'ताण',
      'स्थितिज ऊर्जा',
      'दोलन',
      'गुंडाळी',
    ],
  },
  idle: ['float'],
  build() {
    const g = grp();
    g.add(
      mesh(
        geo.cyl(0.4, 0.43, 0.07, 32),
        mat(C.blue, { metal: 0.3, rough: 0.35, clearcoat: 0.6 }),
        [0, 0.035, 0],
      ),
    );
    const coil = named(grp(), 'coil');
    coil.position.y = 0.07;
    const pts: THREE.Vector3[] = [];
    const N = 96;
    const turns = 7;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const a = u * turns * 2 * PI;
      pts.push(v3(Math.cos(a) * 0.28, 0.04 + u * 0.82, Math.sin(a) * 0.28));
    }
    coil.add(
      mesh(
        geo.tube(new THREE.CatmullRomCurve3(pts), 260, 0.036, 8),
        mat(C.copper, { metal: 0.9, rough: 0.28 }),
      ),
    );
    g.add(coil);
    const top = named(grp(), 'top');
    top.position.y = 0.97;
    top.add(mesh(geo.cyl(0.36, 0.36, 0.05, 32), mat(C.blue, { metal: 0.3, rough: 0.35, clearcoat: 0.6 })));
    top.add(
      mesh(geo.sphere(0.22, 28, 18), mat(C.red, { metal: 0.3, rough: 0.2, clearcoat: 1 }), [0, 0.25, 0]),
    );
    top.add(mesh(geo.torus(0.06, 0.018, 8, 16), mat(C.silver, { metal: 0.9, rough: 0.2 }), [0, 0.5, 0]));
    g.add(top);
    return g;
  },
  update(model, t) {
    const o = Math.sin(t * 4);
    const c = part(model, 'coil');
    const tp = part(model, 'top');
    if (c) c.scale.set(1 - 0.1 * o, 1 + 0.25 * o, 1 - 0.1 * o);
    if (tp) tp.position.y = 0.07 + 0.9 * (1 + 0.25 * o);
  },
};

// ───────────────────────── wave ─────────────────────────
const N_BARS = 22;
const barH = (i: number, t: number): number => 0.4 + 0.3 * Math.sin((i / (N_BARS - 1)) * 4 * PI - t * 3);
const wave: ObjectDef = {
  key: 'wave',
  name: { en: 'Wave', hi: 'तरंग', mr: 'तरंग' },
  tags: {
    en: [
      'frequency',
      'wavelength',
      'amplitude',
      'sound',
      'sine',
      'crest',
      'trough',
      'oscillation',
      'transverse',
      'longitudinal',
      'ocean wave',
      'light wave',
      'vibration',
      'signal',
      'radio',
      'tsunami',
      'ripple',
      'electromagnetic',
    ],
    hi: [
      'तरंग',
      'लहर',
      'आवृत्ति',
      'तरंगदैर्ध्य',
      'आयाम',
      'ध्वनि',
      'शृंग',
      'गर्त',
      'अनुप्रस्थ',
      'अनुदैर्ध्य',
      'कंपन',
      'विद्युतचुंबकीय',
    ],
    mr: [
      'तरंग',
      'लाट',
      'कंप्रता',
      'तरंगलांबी',
      'आयाम',
      'ध्वनी',
      'शिखर',
      'गर्त',
      'अनुप्रस्थ',
      'अनुदैर्ध्य',
      'कंपन',
    ],
  },
  idle: ['float'],
  build() {
    const g = grp();
    g.add(mesh(geo.box(1.7, 0.05, 0.42), mat(C.navy, { metal: 0.3, rough: 0.4 }), [0, 0.025, 0]));
    const foam = mat(C.white, { rough: 0.2, emissive: C.white, glow: 0.25, clearcoat: 0.6 });
    for (let i = 0; i < N_BARS; i++) {
      const x = (i / (N_BARS - 1) - 0.5) * 1.5;
      const col = new THREE.Color().setHSL(0.48 + 0.25 * (i / (N_BARS - 1)), 0.85, 0.52);
      const h = barH(i, 0);
      const b = named(
        mesh(
          geo.box(1, 1, 1),
          mat(col, { rough: 0.3, clearcoat: 0.7, emissive: col, glow: 0.25 }),
          [x, 0.05 + h / 2, 0],
          [0, 0, 0],
          [0.058, h, 0.26],
        ),
        `bar${i}`,
      );
      const c = named(mesh(geo.sphere(0.052, 12, 8), foam, [x, 0.05 + h, 0]), `cap${i}`);
      g.add(b, c);
    }
    return g;
  },
  update(model, t) {
    for (let i = 0; i < N_BARS; i++) {
      const h = barH(i, t);
      const b = part(model, `bar${i}`);
      const c = part(model, `cap${i}`);
      if (b) {
        b.scale.y = h;
        b.position.y = 0.05 + h / 2;
      }
      if (c) c.position.y = 0.05 + h;
    }
  },
};

// ───────────────────────── planet ─────────────────────────
const planet: ObjectDef = {
  key: 'planet',
  name: { en: 'Planet', hi: 'ग्रह', mr: 'ग्रह' },
  tags: {
    en: [
      'saturn',
      'solar system',
      'orbit',
      'jupiter',
      'mars',
      'venus',
      'astronomy',
      'rings',
      'gas giant',
      'earth',
      'mercury',
      'neptune',
      'uranus',
      'exoplanet',
      'space',
      'gravity',
      'kepler',
      'revolution',
    ],
    hi: [
      'ग्रह',
      'शनि',
      'सौरमंडल',
      'कक्षा',
      'बृहस्पति',
      'मंगल',
      'शुक्र',
      'बुध',
      'पृथ्वी',
      'उपग्रह',
      'परिक्रमा',
      'केपलर',
    ],
    mr: [
      'ग्रह',
      'शनी',
      'सूर्यमाला',
      'कक्षा',
      'गुरू',
      'मंगळ',
      'शुक्र',
      'बुध',
      'पृथ्वी',
      'उपग्रह',
      'परिभ्रमण',
      'केपलर',
    ],
  },
  idle: ['float'],
  build() {
    const g = grp();
    const cy = 0.75;
    const body = grp();
    body.position.y = cy;
    body.add(mesh(geo.sphere(0.4, 40, 28), mat(0xe39a4a, { rough: 0.6, clearcoat: 0.3 })));
    const bands: Array<[number, number, number]> = [
      [0.4, 0.22, 0xf2d09b],
      [0.85, 0.3, 0xb5651d],
      [1.35, 0.3, 0xf7dfb0],
      [1.95, 0.32, 0xc77b3a],
    ];
    for (const [t0, len, c] of bands)
      body.add(
        mesh(
          new THREE.SphereGeometry(0.404, 40, 4, 0, PI * 2, t0, len),
          mat(c, { rough: 0.6, clearcoat: 0.3 }),
        ),
      );
    const tilt = named(grp(), 'tilt');
    tilt.rotation.z = 0.4;
    const rings = grp();
    rings.rotation.x = PI / 2;
    for (const [a, b, c] of [
      [0.52, 0.64, 0xc9a26b],
      [0.67, 0.83, 0xe8d3a3],
      [0.86, 0.92, 0xa4865a],
    ] as const)
      rings.add(mesh(geo.ring(a, b, 64), mat(c, { rough: 0.7, side: THREE.DoubleSide, opacity: 0.95 })));
    tilt.add(rings);
    const orbit = named(grp(), 'orbit');
    orbit.add(mesh(geo.sphere(0.07, 18, 12), mat(C.silver, { rough: 0.6 }), [0.98, 0.25, 0]));
    tilt.add(orbit);
    body.add(tilt);
    g.add(body);
    return g;
  },
  update(model, t) {
    const tl = part(model, 'tilt');
    const ob = part(model, 'orbit');
    if (tl) {
      tl.rotation.z = 0.4 + Math.sin(t * 0.6) * 0.1;
      tl.rotation.x = Math.cos(t * 0.5) * 0.1;
    }
    if (ob) ob.rotation.y = t * 0.9;
  },
};

// ───────────────────────── sun ─────────────────────────
const sun: ObjectDef = {
  key: 'sun',
  name: { en: 'Sun', hi: 'सूर्य', mr: 'सूर्य' },
  tags: {
    en: [
      'solar',
      'star',
      'sunlight',
      'daylight',
      'heat',
      'fusion',
      'energy',
      'photosynthesis',
      'sunrise',
      'sunset',
      'solar system',
      'corona',
      'sunshine',
      'solar energy',
      'radiation',
      'noon',
      'helios',
      'eclipse',
      'day',
    ],
    hi: [
      'सूर्य',
      'सूरज',
      'सौर',
      'तारा',
      'धूप',
      'दिन',
      'ऊर्जा',
      'संलयन',
      'प्रकाश संश्लेषण',
      'सूर्योदय',
      'सूर्यास्त',
      'ग्रहण',
    ],
    mr: [
      'सूर्य',
      'रवी',
      'सौर',
      'तारा',
      'ऊन',
      'दिवस',
      'ऊर्जा',
      'संलयन',
      'प्रकाशसंश्लेषण',
      'सूर्योदय',
      'सूर्यास्त',
      'ग्रहण',
    ],
  },
  idle: ['float', 'pulse'],
  build() {
    const g = grp();
    const cy = 0.82;
    const s = grp();
    s.position.y = cy;
    s.add(mesh(geo.sphere(0.4, 40, 28), mat(0xff7a00, { emissive: 0xff4d00, glow: 0.7, rough: 0.6 })));
    s.add(
      named(
        mesh(geo.sphere(0.5, 28, 18), glassy(mat(0xffd54a, { emissive: 0xffc233, glow: 1, opacity: 0.22 }))),
        'halo',
      ),
    );
    const spot = mat(0xc2410c, { rough: 0.9 });
    for (const d of [v3(0.3, 0.3, 0.9), v3(-0.45, 0.15, 0.85), v3(0.55, -0.3, 0.75), v3(-0.2, -0.45, 0.85)]) {
      const n = d.clone().normalize();
      const sp = aim(mesh(geo.sphere(1, 12, 8), spot, [0, 0, 0], [0, 0, 0], [0.07, 0.015, 0.07]), n);
      sp.position.copy(n).multiplyScalar(0.398);
      s.add(sp);
    }
    const rays = named(grp(), 'rays');
    const rm = mat(0xff7a00, { emissive: 0xff5a00, glow: 0.8, rough: 0.5 });
    const rm2 = mat(0xffb000, { emissive: 0xff9a00, glow: 0.9, rough: 0.5 });
    fibDirs(18).forEach((d, i) => {
      const r = aim(mesh(geo.cone(0.065, i % 2 ? 0.3 : 0.22, 10), i % 2 ? rm2 : rm), d);
      r.position.copy(d).multiplyScalar(0.6);
      rays.add(r);
    });
    s.add(rays);
    g.add(s);
    return g;
  },
  update(model, t) {
    const r = part(model, 'rays');
    const h = part(model, 'halo');
    if (r) {
      r.rotation.y = t * 0.4;
      r.rotation.z = t * 0.25;
    }
    if (h) h.scale.setScalar(1 + 0.08 * Math.sin(t * 2.4));
  },
};

// ───────────────────────── moon ─────────────────────────
const moon: ObjectDef = {
  key: 'moon',
  name: { en: 'Moon', hi: 'चंद्रमा', mr: 'चंद्र' },
  tags: {
    en: [
      'lunar',
      'satellite',
      'crater',
      'night',
      'phases',
      'eclipse',
      'tides',
      'full moon',
      'new moon',
      'crescent',
      'apollo',
      'chandrayaan',
      'earth',
      'orbit',
      'moonlight',
      'month',
      'lunar eclipse',
    ],
    hi: [
      'चंद्रमा',
      'चाँद',
      'चंद्र',
      'चंद्र ग्रहण',
      'चंद्र कलाएँ',
      'पूर्णिमा',
      'अमावस्या',
      'ज्वार भाटा',
      'उपग्रह',
      'क्रेटर',
      'चंद्रयान',
      'रात',
    ],
    mr: [
      'चंद्र',
      'चंद्रमा',
      'चांदोबा',
      'चंद्रग्रहण',
      'चंद्रकला',
      'पौर्णिमा',
      'अमावस्या',
      'भरती ओहोटी',
      'उपग्रह',
      'विवर',
      'चांद्रयान',
      'रात्र',
    ],
  },
  build() {
    const g = grp();
    const cy = 0.52;
    const R = 0.5;
    const ig = smoothIco(R, 5);
    const p = ig.getAttribute('position') as THREE.BufferAttribute;
    const d = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i);
      const n = Math.sin(d.x * 14 + 1) * Math.sin(d.y * 11) * Math.sin(d.z * 13 + 2);
      d.normalize().multiplyScalar(R * (1 + 0.02 * n));
      p.setXYZ(i, d.x, d.y, d.z);
    }
    ig.computeVertexNormals();
    const m = grp();
    m.position.y = cy;
    m.add(mesh(ig, mat(0xa8a8b2, { rough: 0.85, emissive: 0x222538, glow: 0.4 })));
    const cr = mat(0x666874, { rough: 0.95 });
    const rim = mat(0xd0d0d8, { rough: 0.9 });
    const sizes = [0.15, 0.1, 0.12, 0.07, 0.09, 0.06, 0.11, 0.07, 0.05, 0.08];
    fibDirs(10).forEach((dir, i) => {
      const s = sizes[i] ?? 0.08;
      const c = aim(mesh(geo.sphere(1, 16, 10), cr, [0, 0, 0], [0, 0, 0], [s, s * 0.22, s]), dir);
      c.position.copy(dir).multiplyScalar(R * 0.985);
      m.add(c);
      const r = aim(mesh(geo.torus(s * 1.02, s * 0.12, 6, 20), rim), dir);
      r.rotateX(PI / 2);
      r.position.copy(dir).multiplyScalar(R * 0.99);
      m.add(r);
    });
    g.add(m);
    const stars = named(grp(), 'stars');
    stars.position.y = cy;
    const star = mat(C.yellow, { emissive: C.yellow, glow: 2 });
    [
      [0.72, 0.25, 0, 0.085],
      [-0.6, 0.45, 0.3, 0.065],
      [-0.3, -0.35, -0.6, 0.07],
    ].forEach(([x, y, z, s]) => {
      const st = mesh(geo.octa(s ?? 0.05), star, [x ?? 0, y ?? 0, z ?? 0], [0, 0, 0], [1, 1.6, 1]);
      stars.add(st);
    });
    g.add(stars);
    return g;
  },
  update(model, t) {
    const s = part(model, 'stars');
    if (s) s.rotation.y = t * 0.5;
  },
};

export const scienceB: ObjectDef[] = [
  prism,
  lightning,
  brain,
  eye,
  droplet,
  flame,
  spring,
  wave,
  planet,
  sun,
  moon,
];
