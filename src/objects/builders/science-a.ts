import * as THREE from 'three';
import type { ObjectDef } from '../types';
import { C, geo, grp, mat, mesh, named } from '../kit';
import { aim, fibDirs, glassy, limb, part, smooth, smoothen } from './science-util';

const PI = Math.PI;
const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

// ───────────────────────── pendulum ─────────────────────────
const pendulum: ObjectDef = {
  key: 'pendulum',
  name: { en: 'Pendulum', hi: 'लोलक', mr: 'दोलक' },
  tags: {
    en: [
      'swing',
      'oscillation',
      'period',
      'gravity',
      'galileo',
      'clock',
      'motion',
      'harmonic',
      'bob',
      'frequency',
      'simple harmonic motion',
      'time period',
      'vibration',
    ],
    hi: ['लोलक', 'दोलन', 'झूला', 'आवर्तकाल', 'गुरुत्वाकर्षण', 'गैलीलियो', 'घड़ी', 'आवृत्ति', 'सरल आवर्त गति'],
    mr: [
      'दोलक',
      'दोलन',
      'झोका',
      'आवर्तकाळ',
      'गुरुत्वाकर्षण',
      'गॅलिलिओ',
      'घड्याळ',
      'कंप्रता',
      'सरल आवर्ती गती',
    ],
  },
  idle: ['float'],
  build() {
    const g = grp();
    const wood = mat(C.wood, { rough: 0.6 });
    const brass = mat(C.gold, { metal: 0.9, rough: 0.25 });
    g.add(mesh(geo.box(1.2, 0.08, 0.6), mat(C.darkWood, { rough: 0.6 }), [0, 0.04, 0]));
    for (const z of [-0.22, 0.22]) g.add(mesh(geo.cyl(0.035, 0.045, 1.3, 16), wood, [0, 0.73, z]));
    g.add(mesh(geo.cyl(0.04, 0.04, 0.54, 16), wood, [0, 1.38, 0], [PI / 2, 0, 0]));
    const top = 1.36;
    // protractor arc + ghost bobs at the extremes
    const arcMat = mat(C.cyan, { emissive: C.cyan, glow: 0.8, rough: 0.4 });
    const arc = mesh(
      new THREE.TorusGeometry(1.0, 0.009, 6, 40, 1.0),
      arcMat,
      [0, top, 0],
      [0, 0, -PI / 2 - 0.5],
    );
    g.add(arc);
    for (const s of [-1, 1]) {
      const a = s * 0.5;
      g.add(
        mesh(
          geo.sphere(0.15, 20, 14),
          glassy(mat(C.yellow, { metal: 0, rough: 0.3, opacity: 0.5, emissive: C.yellow, glow: 1.5 })),
          [Math.sin(a) * 1.0, top - Math.cos(a) * 1.0, 0],
        ),
      );
    }
    const arm = named(grp(), 'arm');
    arm.position.set(0, top, 0);
    arm.add(mesh(geo.cyl(0.011, 0.011, 0.86, 8), mat(C.silver, { metal: 0.8, rough: 0.3 }), [0, -0.43, 0]));
    arm.add(mesh(geo.sphere(0.15, 28, 18), mat(C.gold, { metal: 0.95, rough: 0.2 }), [0, -1.0, 0]));
    arm.add(mesh(geo.torus(0.04, 0.012, 8, 16), brass, [0, -0.86, 0], [PI / 2, 0, 0]));
    arm.add(mesh(geo.sphere(0.055, 16, 12), brass, [0, 0, 0]));
    g.add(arm);
    g.rotation.y = -0.6;
    return g;
  },
  update(model, t) {
    const arm = part(model, 'arm');
    if (arm) arm.rotation.z = 0.5 * Math.cos(t * 3.1);
  },
};

// ───────────────────────── rocket ─────────────────────────
const rocket: ObjectDef = {
  key: 'rocket',
  name: { en: 'Rocket', hi: 'रॉकेट', mr: 'रॉकेट' },
  tags: {
    en: [
      'space',
      'launch',
      'isro',
      'nasa',
      'satellite',
      'thrust',
      'propulsion',
      'missile',
      'astronaut',
      'chandrayaan',
      'aerospace',
      'newton third law',
      'orbit',
      'spacecraft',
    ],
    hi: ['रॉकेट', 'अंतरिक्ष', 'अंतरिक्ष यान', 'प्रक्षेपण', 'उपग्रह', 'इसरो', 'चंद्रयान', 'प्रणोदन', 'मिसाइल'],
    mr: ['रॉकेट', 'अवकाश', 'अंतराळ', 'प्रक्षेपण', 'उपग्रह', 'इस्रो', 'चांद्रयान', 'अग्निबाण', 'क्षेपणास्त्र'],
  },
  build() {
    const g = grp();
    const white = mat(C.white, { metal: 0.3, rough: 0.3, clearcoat: 0.6 });
    const red = mat(C.red, { metal: 0.2, rough: 0.3, clearcoat: 0.6 });
    const brass = mat(C.gold, { metal: 0.9, rough: 0.25 });
    const body = geo.lathe(
      smooth(
        [
          [0, 0.4],
          [0.25, 0.4],
          [0.32, 0.6],
          [0.335, 1.0],
          [0.31, 1.2],
        ],
        14,
      ),
      32,
    );
    g.add(mesh(body, white));
    g.add(
      mesh(
        geo.lathe(
          smooth(
            [
              [0.31, 1.2],
              [0.26, 1.4],
              [0.14, 1.62],
              [0, 1.8],
            ],
            14,
          ),
          32,
        ),
        red,
      ),
    );
    g.add(mesh(geo.torus(0.325, 0.03, 8, 40), red, [0, 0.7, 0], [PI / 2, 0, 0]));
    g.add(mesh(geo.torus(0.33, 0.022, 8, 40), red, [0, 1.17, 0], [PI / 2, 0, 0]));
    // portholes (both sides)
    const glass = mat(C.cyan, { emissive: C.cyan, glow: 0.7, rough: 0.1, metal: 0.3 });
    for (const s of [1, -1]) {
      g.add(mesh(geo.torus(0.11, 0.028, 10, 28), brass, [0, 0.95, s * 0.322], [0, s > 0 ? 0 : PI, 0]));
      g.add(mesh(geo.sphere(0.1, 20, 12), glass, [0, 0.95, s * 0.322], [0, 0, 0], [1, 1, 0.3]));
    }
    // fins
    const finGeo = geo.extrude(
      [
        [0.29, 0.95],
        [0.64, 0.3],
        [0.64, 0.12],
        [0.29, 0.45],
      ],
      0.05,
      0.012,
    );
    for (let i = 0; i < 3; i++) {
      const f = grp(mesh(finGeo, red, [0, 0, -0.025]));
      f.rotation.y = (i * 2 * PI) / 3 + PI / 2;
      g.add(f);
    }
    g.add(mesh(geo.cyl(0.14, 0.2, 0.14, 24), mat(C.steel, { metal: 0.9, rough: 0.3 }), [0, 0.35, 0]));
    // exhaust
    const fl = named(grp(), 'flame');
    fl.position.set(0, 0.3, 0);
    fl.add(
      mesh(
        geo.cone(0.17, 0.55, 20),
        mat(C.orange, { emissive: C.orange, glow: 1.6, opacity: 0.92 }),
        [0, -0.27, 0],
        [PI, 0, 0],
      ),
    );
    fl.add(
      mesh(
        geo.cone(0.1, 0.36, 16),
        mat(C.yellow, { emissive: C.yellow, glow: 2 }),
        [0, -0.16, 0],
        [PI, 0, 0],
      ),
    );
    g.add(fl);
    const smoke = mat(C.white, { rough: 1, opacity: 0.6 });
    for (const [x, z, r] of [
      [0.25, 0.1, 0.11],
      [-0.2, 0.18, 0.13],
      [0.04, -0.27, 0.12],
      [-0.12, -0.14, 0.09],
    ] as const)
      g.add(mesh(geo.sphere(r, 16, 10), smoke, [x, -0.18, z]));
    return g;
  },
  update(model, t) {
    const f = part(model, 'flame');
    if (f)
      f.scale.set(
        1 + 0.1 * Math.sin(t * 31),
        1 + 0.22 * Math.sin(t * 23) + 0.1 * Math.sin(t * 41),
        1 + 0.1 * Math.sin(t * 27),
      );
  },
};

// ───────────────────────── atom ─────────────────────────
const atom: ObjectDef = {
  key: 'atom',
  name: { en: 'Atom', hi: 'परमाणु', mr: 'अणू' },
  tags: {
    en: [
      'nucleus',
      'electron',
      'proton',
      'neutron',
      'orbit',
      'bohr',
      'rutherford',
      'molecule',
      'chemistry',
      'element',
      'nuclear',
      'shell',
      'valency',
      'isotope',
      'particle',
      'subatomic',
      'periodic table',
    ],
    hi: [
      'परमाणु',
      'नाभिक',
      'इलेक्ट्रॉन',
      'प्रोटॉन',
      'न्यूट्रॉन',
      'कक्षा',
      'अणु',
      'तत्व',
      'रसायन',
      'बोहर',
      'रदरफोर्ड',
      'संयोजकता',
    ],
    mr: [
      'अणू',
      'रेणू',
      'केंद्रक',
      'इलेक्ट्रॉन',
      'प्रोटॉन',
      'न्यूट्रॉन',
      'कक्षा',
      'मूलद्रव्य',
      'रसायनशास्त्र',
      'बोहर',
      'संयुजा',
    ],
  },
  build() {
    const g = grp();
    const cy = 0.62;
    const red = mat(C.red, { rough: 0.3, clearcoat: 0.5 });
    const blue = mat(C.purple, { rough: 0.3, clearcoat: 0.5 });
    const nuc: Array<[number, number, number]> = [
      [0.07, 0.03, 0.05],
      [-0.06, 0.06, 0.04],
      [0.02, -0.07, 0.06],
      [-0.05, -0.03, -0.07],
      [0.06, 0.05, -0.06],
      [-0.01, 0.09, -0.02],
      [0.0, -0.01, 0.0],
    ];
    nuc.forEach(([x, y, z], i) => g.add(mesh(geo.sphere(0.1, 20, 14), i % 2 ? blue : red, [x, cy + y, z])));
    const ringMat = mat(C.cyan, { emissive: C.cyan, glow: 0.6, metal: 0.5, rough: 0.3 });
    const eMat = mat(C.orange, { emissive: C.orange, glow: 1.4, rough: 0.2 });
    const R = 0.58;
    for (let i = 0; i < 3; i++) {
      const orb = grp();
      orb.position.y = cy;
      orb.rotation.y = (i * PI) / 3;
      orb.add(mesh(geo.torus(R, 0.012, 8, 72), ringMat));
      for (let k = 0; k < 2; k++) {
        const pv = named(grp(), `e${i}_${k}`);
        pv.rotation.z = k * PI + i;
        pv.add(mesh(geo.sphere(0.065, 16, 12), eMat, [R, 0, 0]));
        orb.add(pv);
      }
      g.add(orb);
    }
    return g;
  },
  update(model, t) {
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 2; k++) {
        const pv = part(model, `e${i}_${k}`);
        if (pv) pv.rotation.z = t * (2.2 + i * 0.5) + k * PI + i;
      }
  },
};

// ───────────────────────── dna ─────────────────────────
const dna: ObjectDef = {
  key: 'dna',
  name: { en: 'DNA', hi: 'डीएनए', mr: 'डीएनए' },
  tags: {
    en: [
      'gene',
      'genetics',
      'heredity',
      'chromosome',
      'helix',
      'double helix',
      'genome',
      'nucleotide',
      'rna',
      'mutation',
      'inheritance',
      'biology',
      'watson crick',
      'base pair',
      'protein synthesis',
    ],
    hi: [
      'डीएनए',
      'जीन',
      'आनुवंशिकता',
      'गुणसूत्र',
      'दोहरी कुंडली',
      'जीनोम',
      'न्यूक्लियोटाइड',
      'आरएनए',
      'उत्परिवर्तन',
      'आनुवंशिक',
    ],
    mr: [
      'डीएनए',
      'जनुक',
      'आनुवंशिकता',
      'गुणसूत्र',
      'दुहेरी पेचदार',
      'जनुकीय',
      'न्यूक्लिओटाइड',
      'आरएनए',
      'उत्परिवर्तन',
      'अनुवंशशास्त्र',
    ],
  },
  build() {
    const g = grp();
    const H = 1.4;
    const R = 0.23;
    const turns = 2.25;
    const helix = (ph: number): THREE.CatmullRomCurve3 => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        const a = u * turns * 2 * PI + ph;
        pts.push(v3(Math.cos(a) * R, u * H, Math.sin(a) * R));
      }
      return new THREE.CatmullRomCurve3(pts);
    };
    g.add(mesh(geo.tube(helix(0), 140, 0.045, 10), mat(C.blue, { rough: 0.3, clearcoat: 0.6, metal: 0.2 })));
    g.add(mesh(geo.tube(helix(PI), 140, 0.045, 10), mat(C.pink, { rough: 0.3, clearcoat: 0.6, metal: 0.2 })));
    const pairs: Array<[THREE.MeshStandardMaterial, THREE.MeshStandardMaterial]> = [
      [mat(C.orange, { rough: 0.35 }), mat(C.green, { rough: 0.35 })],
      [mat(C.yellow, { rough: 0.35 }), mat(C.purple, { rough: 0.35 })],
    ];
    const n = 14;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const a = u * turns * 2 * PI;
      const y = u * H;
      const pr = pairs[i % 2];
      if (!pr) continue;
      const rung = grp();
      rung.position.y = y;
      rung.rotation.y = -a;
      rung.add(mesh(geo.cyl(0.03, 0.03, R, 10), pr[0], [R / 2, 0, 0], [0, 0, PI / 2]));
      rung.add(mesh(geo.cyl(0.03, 0.03, R, 10), pr[1], [-R / 2, 0, 0], [0, 0, PI / 2]));
      g.add(rung);
    }
    return g;
  },
};

// ───────────────────────── heart ─────────────────────────
const heart: ObjectDef = {
  key: 'heart',
  name: { en: 'Heart', hi: 'हृदय', mr: 'हृदय' },
  tags: {
    en: [
      'cardiac',
      'pulse',
      'blood',
      'circulation',
      'heartbeat',
      'artery',
      'vein',
      'cardiovascular',
      'organ',
      'ventricle',
      'atrium',
      'love',
      'blood pressure',
      'valve',
    ],
    hi: ['हृदय', 'दिल', 'धड़कन', 'रक्त', 'रक्त संचार', 'धमनी', 'शिरा', 'नाड़ी', 'प्रेम', 'हृदय रोग'],
    mr: [
      'हृदय',
      'काळीज',
      'ठोका',
      'रक्त',
      'रक्ताभिसरण',
      'धमनी',
      'शिरा',
      'नाडी',
      'हृदयविकार',
      'प्रेम',
      'रक्तवाहिनी',
    ],
  },
  build() {
    const g = grp();
    const s = new THREE.Shape();
    s.moveTo(0, -0.5);
    s.bezierCurveTo(-0.2, -0.3, -0.6, -0.05, -0.6, 0.25);
    s.bezierCurveTo(-0.6, 0.55, -0.2, 0.65, 0, 0.35);
    s.bezierCurveTo(0.2, 0.65, 0.6, 0.55, 0.6, 0.25);
    s.bezierCurveTo(0.6, -0.05, 0.2, -0.3, 0, -0.5);
    const hg = new THREE.ExtrudeGeometry(s, {
      depth: 0.3,
      bevelEnabled: true,
      bevelSize: 0.14,
      bevelThickness: 0.14,
      bevelSegments: 6,
      curveSegments: 20,
    });
    hg.translate(0, 0, -0.15);
    const beat = named(grp(), 'beat');
    beat.position.y = 0.5;
    const hm = mesh(
      smoothen(hg),
      mat(C.crimson, { rough: 0.3, clearcoat: 1, emissive: 0x6a0a14, glow: 0.4 }),
    );
    hm.receiveShadow = false;
    beat.add(hm);
    const vessel = (pts: THREE.Vector3[], c: number, r: number): THREE.Mesh =>
      mesh(geo.tube(new THREE.CatmullRomCurve3(pts), 24, r, 10), mat(c, { rough: 0.35, clearcoat: 0.6 }));
    beat.add(
      vessel(
        [v3(-0.08, 0.3, 0), v3(-0.1, 0.65, 0), v3(-0.22, 0.9, 0), v3(-0.42, 0.85, 0), v3(-0.5, 0.6, 0)],
        C.red,
        0.085,
      ),
    );
    beat.add(vessel([v3(0.22, 0.3, -0.08), v3(0.24, 0.7, -0.08), v3(0.22, 0.98, -0.08)], C.blue, 0.085));
    beat.add(
      vessel(
        [v3(0.02, 0.35, 0.13), v3(0.06, 0.72, 0.12), v3(0.3, 0.86, 0.1), v3(0.48, 0.8, 0.08)],
        C.navy,
        0.06,
      ),
    );
    g.add(beat);
    return g;
  },
  update(model, t) {
    const b = part(model, 'beat');
    if (!b) return;
    const ph = (t * 1.3) % 1;
    const k = Math.exp(-ph * 12) + (ph > 0.28 ? 0.6 * Math.exp(-(ph - 0.28) * 14) : 0);
    b.scale.setScalar(1 + 0.09 * k);
  },
};

// ───────────────────────── cell ─────────────────────────
const cell: ObjectDef = {
  key: 'cell',
  name: { en: 'Cell', hi: 'कोशिका', mr: 'पेशी' },
  tags: {
    en: [
      'nucleus',
      'mitochondria',
      'membrane',
      'cytoplasm',
      'organelle',
      'biology',
      'tissue',
      'prokaryote',
      'eukaryote',
      'ribosome',
      'cell division',
      'mitosis',
      'meiosis',
      'protoplasm',
      'cell wall',
    ],
    hi: [
      'कोशिका',
      'केन्द्रक',
      'माइटोकॉन्ड्रिया',
      'कोशिका झिल्ली',
      'कोशिका द्रव्य',
      'ऊतक',
      'राइबोसोम',
      'कोशिका विभाजन',
      'जीवद्रव्य',
      'कोशिकांग',
    ],
    mr: [
      'पेशी',
      'पेशीकेंद्रक',
      'तंतुकणिका',
      'पेशीपटल',
      'पेशीद्रव्य',
      'ऊती',
      'रिबोसोम',
      'पेशीविभाजन',
      'जीवद्रव्य',
      'पेशीअंगक',
    ],
  },
  build() {
    const g = grp();
    const cy = 0.62;
    const c = grp();
    c.position.y = cy;
    c.add(mesh(geo.sphere(0.62, 36, 24), glassy(mat(C.pink, { rough: 0.2, opacity: 0.3, clearcoat: 0.6 }))));
    c.add(mesh(geo.sphere(0.23, 24, 16), mat(C.purple, { rough: 0.4, clearcoat: 0.4 }), [0.04, 0.04, 0]));
    c.add(
      mesh(
        geo.sphere(0.08, 16, 12),
        mat(C.orange, { rough: 0.4, emissive: C.orange, glow: 0.3 }),
        [0.1, 0.12, 0.17],
      ),
    );
    const mito = mat(C.orange, { rough: 0.45, clearcoat: 0.4 });
    const crista = mat(C.crimson, { rough: 0.5 });
    const mitos: Array<[number, number, number, number]> = [
      [-0.3, -0.25, 0.15, 0.6],
      [0.3, -0.2, -0.25, -0.5],
      [0.25, 0.3, 0.25, 1.1],
    ];
    for (const [x, y, z, r] of mitos) {
      const m = grp();
      m.position.set(x, y, z);
      m.rotation.set(0.3, r, r * 1.3);
      m.add(mesh(geo.capsule(0.075, 0.2), mito));
      m.add(mesh(geo.capsule(0.04, 0.16), crista, [0, 0, 0.04]));
      c.add(m);
    }
    // golgi stack
    const gol = mat(C.yellow, { rough: 0.4 });
    for (let i = 0; i < 4; i++) {
      const arc = mesh(
        new THREE.TorusGeometry(0.17 - i * 0.012, 0.022, 8, 16, PI * 0.7),
        gol,
        [-0.28, 0.25 + i * 0.055 - 0.1, -0.2],
        [PI / 2, 0, 0.3],
      );
      c.add(arc);
    }
    // ER rings
    const er = mat(C.teal, { rough: 0.5 });
    for (let i = 0; i < 3; i++)
      c.add(
        mesh(
          geo.torus(0.28 + i * 0.03, 0.02, 8, 30),
          er,
          [0.04, 0.04, 0],
          [PI / 2 + 0.35 + i * 0.12, 0.2 * i, 0.4],
        ),
      );
    // lysosomes + ribosomes
    const lyso = mat(C.green, { rough: 0.35, clearcoat: 0.5 });
    for (const [x, y, z] of [
      [-0.05, -0.42, -0.12],
      [0.38, 0.05, 0.22],
      [-0.2, 0.42, 0.2],
    ] as const)
      c.add(mesh(geo.sphere(0.06, 14, 10), lyso, [x, y, z]));
    const ribo = mat(C.navy, { rough: 0.5 });
    fibDirs(14).forEach((d, i) =>
      c.add(
        mesh(geo.sphere(0.028, 8, 6), ribo, [
          d.x * (0.4 + (i % 3) * 0.05),
          d.y * (0.4 + (i % 3) * 0.05),
          d.z * (0.4 + (i % 3) * 0.05),
        ]),
      ),
    );
    g.add(c);
    return g;
  },
};

// ───────────────────────── magnet ─────────────────────────
const magnet: ObjectDef = {
  key: 'magnet',
  name: { en: 'Magnet', hi: 'चुंबक', mr: 'चुंबक' },
  tags: {
    en: [
      'magnetism',
      'pole',
      'north',
      'south',
      'field',
      'attraction',
      'repulsion',
      'iron',
      'electromagnet',
      'compass',
      'flux',
      'magnetic field',
      'ferromagnetic',
      'force',
      'induction',
    ],
    hi: [
      'चुंबक',
      'चुंबकत्व',
      'चुंबकीय क्षेत्र',
      'ध्रुव',
      'उत्तरी ध्रुव',
      'दक्षिणी ध्रुव',
      'आकर्षण',
      'प्रतिकर्षण',
      'लोहा',
      'विद्युत चुंबक',
    ],
    mr: [
      'चुंबक',
      'चुंबकत्व',
      'चुंबकीय क्षेत्र',
      'ध्रुव',
      'आकर्षण',
      'प्रतिकर्षण',
      'लोखंड',
      'विद्युतचुंबक',
      'चुंबकीय बल',
    ],
  },
  build() {
    const g = grp();
    const steel = mat(0x5d6b7c, { metal: 0.8, rough: 0.35 });
    const red = mat(C.red, { metal: 0.3, rough: 0.3, clearcoat: 0.6 });
    const blue = mat(C.blue, { metal: 0.3, rough: 0.3, clearcoat: 0.6 });
    const silver = mat(C.silver, { metal: 0.95, rough: 0.2 });
    const cy = 0.42;
    const X = 0.4;
    g.add(mesh(new THREE.TorusGeometry(X, 0.12, 16, 40, PI), steel, [0, cy, 0], [0, 0, PI]));
    for (const s of [1, -1]) {
      g.add(mesh(geo.cyl(0.12, 0.12, 0.3, 24), steel, [s * X, cy + 0.15, 0]));
      g.add(mesh(geo.cyl(0.125, 0.125, 0.36, 24), s > 0 ? red : blue, [s * X, cy + 0.48, 0]));
      g.add(mesh(geo.torus(0.125, 0.014, 8, 24), silver, [s * X, cy + 0.3, 0], [PI / 2, 0, 0]));
      g.add(mesh(geo.cyl(0.128, 0.128, 0.03, 24), silver, [s * X, cy + 0.665, 0]));
    }
    // field arcs + flowing charges
    const fieldMat = mat(C.cyan, { emissive: C.cyan, glow: 0.9, rough: 0.4 });
    const top = cy + 0.68;
    const field = named(grp(), 'field');
    field.position.y = top;
    [0.35, 0.65, 0.95].forEach((sy, i) => {
      const a = new THREE.Mesh(new THREE.TorusGeometry(X, 0.011, 6, 48, PI), fieldMat);
      a.scale.y = sy;
      field.add(a);
      const dot = named(mesh(geo.sphere(0.04, 12, 8), mat(C.white, { emissive: C.cyan, glow: 2 })), `fd${i}`);
      dot.position.set(X, 0, 0);
      field.add(dot);
    });
    g.add(field);
    return g;
  },
  update(model, t) {
    [0.35, 0.65, 0.95].forEach((sy, i) => {
      const d = part(model, `fd${i}`);
      if (!d) return;
      const a = ((t * 0.5 + i * 0.33) % 1) * PI;
      d.position.set(0.4 * Math.cos(a), 0.4 * sy * Math.sin(a), 0);
    });
  },
};

// ───────────────────────── lightbulb ─────────────────────────
const lightbulb: ObjectDef = {
  key: 'lightbulb',
  name: { en: 'Light bulb', hi: 'बिजली का बल्ब', mr: 'विजेचा दिवा' },
  tags: {
    en: [
      'idea',
      'invention',
      'edison',
      'light',
      'filament',
      'electricity',
      'bulb',
      'lamp',
      'illumination',
      'brainstorm',
      'innovation',
      'creativity',
      'led',
      'bright',
      'eureka',
    ],
    hi: ['बल्ब', 'विचार', 'आविष्कार', 'एडिसन', 'प्रकाश', 'बिजली', 'तंतु', 'दीपक', 'रोशनी', 'रचनात्मकता'],
    mr: ['दिवा', 'बल्ब', 'कल्पना', 'शोध', 'एडिसन', 'प्रकाश', 'वीज', 'तंतू', 'उजेड', 'सर्जनशीलता', 'आविष्कार'],
  },
  build() {
    const g = grp();
    const steel = mat(C.silver, { metal: 0.95, rough: 0.25 });
    const glass = glassy(
      mat(0xffd21a, { emissive: 0xffc000, glow: 1.8, rough: 0.05, metal: 0, opacity: 0.8 }),
    );
    glass.side = THREE.DoubleSide;
    g.add(
      mesh(
        geo.lathe(
          smooth(
            [
              [0.17, 0.5],
              [0.2, 0.6],
              [0.32, 0.76],
              [0.4, 0.98],
              [0.37, 1.22],
              [0.24, 1.4],
              [0, 1.44],
            ],
            30,
          ),
          32,
        ),
        glass,
      ),
    );
    // base (screw thread)
    g.add(mesh(geo.cyl(0.17, 0.17, 0.12, 24), steel, [0, 0.44, 0]));
    for (let i = 0; i < 3; i++)
      g.add(mesh(geo.torus(0.17, 0.028, 8, 28), steel, [0, 0.36 - i * 0.1, 0], [PI / 2, 0, 0]));
    g.add(mesh(geo.cyl(0.15, 0.13, 0.12, 24), steel, [0, 0.1, 0]));
    g.add(mesh(geo.cyl(0.14, 0.14, 0.05, 24), mat(C.black, { rough: 0.6 }), [0, 0.03, 0]));
    g.add(mesh(geo.dome(0.08, 16), mat(C.gold, { metal: 0.9, rough: 0.3 }), [0, -0.0, 0], [PI, 0, 0]));
    // filament
    const wire = mat(C.steel, { metal: 0.9, rough: 0.3 });
    for (const s of [1, -1]) g.add(mesh(geo.cyl(0.008, 0.008, 0.5, 6), wire, [s * 0.08, 0.72, 0]));
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const u = i / 48;
      pts.push(v3(-0.08 + 0.16 * u, 0.98 + Math.sin(u * 12 * PI) * 0.03, Math.cos(u * 12 * PI) * 0.03));
    }
    g.add(
      mesh(
        geo.tube(new THREE.CatmullRomCurve3(pts), 100, 0.011, 6),
        mat(0xfff6d0, { emissive: 0xfff2b0, glow: 3 }),
      ),
    );
    g.add(
      mesh(
        geo.sphere(0.27, 20, 14),
        glassy(mat(0xfff2b0, { emissive: 0xffe066, glow: 1, opacity: 0.25 })),
        [0, 1.0, 0],
      ),
    );
    // rays
    const rays = named(grp(), 'rays');
    rays.position.y = 1.0;
    const rm = mat(C.yellow, { emissive: C.yellow, glow: 1.5 });
    fibDirs(16).forEach((d) => {
      if (d.y < -0.35) return;
      const r = aim(mesh(geo.cone(0.03, 0.2, 8), rm), d);
      r.position.copy(d).multiplyScalar(0.64);
      rays.add(r);
    });
    g.add(rays);
    return g;
  },
  update(model, t) {
    const r = part(model, 'rays');
    if (r) r.scale.setScalar(1 + 0.12 * Math.sin(t * 4));
    if (r) r.rotation.y = t * 0.3;
  },
};

// ───────────────────────── battery ─────────────────────────
const battery: ObjectDef = {
  key: 'battery',
  name: { en: 'Battery', hi: 'बैटरी', mr: 'बॅटरी' },
  tags: {
    en: [
      'cell',
      'voltage',
      'current',
      'charge',
      'energy',
      'power',
      'electrochemical',
      'anode',
      'cathode',
      'electric',
      'circuit',
      'terminal',
      'volt',
      'electrolyte',
      'galvanic',
      'storage',
    ],
    hi: [
      'बैटरी',
      'विद्युत सेल',
      'वोल्टेज',
      'धारा',
      'आवेश',
      'ऊर्जा',
      'एनोड',
      'कैथोड',
      'परिपथ',
      'विद्युत अपघट्य',
    ],
    mr: [
      'बॅटरी',
      'विद्युतघट',
      'व्होल्टेज',
      'विद्युतधारा',
      'प्रभार',
      'ऊर्जा',
      'अॅनोड',
      'कॅथोड',
      'मंडल',
      'विद्युत अपघटक',
    ],
  },
  build() {
    const g = grp();
    const sleeve = mat(C.green, { metal: 0.4, rough: 0.25, clearcoat: 0.8 });
    const black = mat(C.black, { metal: 0.4, rough: 0.4 });
    const silver = mat(C.silver, { metal: 0.95, rough: 0.2 });
    const gold = mat(C.gold, { metal: 0.95, rough: 0.25 });
    g.add(mesh(geo.cyl(0.31, 0.31, 1.0, 36), sleeve, [0, 0.55, 0]));
    g.add(mesh(geo.cyl(0.315, 0.315, 0.16, 36), black, [0, 0.1, 0]));
    g.add(mesh(geo.cyl(0.315, 0.315, 0.2, 36), gold, [0, 1.0, 0]));
    g.add(mesh(geo.cyl(0.29, 0.31, 0.06, 36), silver, [0, 1.08, 0]));
    g.add(mesh(geo.cyl(0.12, 0.12, 0.1, 24), silver, [0, 1.14, 0]));
    g.add(mesh(geo.cyl(0.28, 0.28, 0.03, 24), silver, [0, 0.01, 0]));
    const sign = mat(C.white, { emissive: C.white, glow: 1.2, rough: 0.4 });
    for (const s of [1, -1]) {
      const f = grp();
      f.rotation.y = s > 0 ? 0 : PI;
      f.add(mesh(geo.box(0.26, 0.06, 0.02), sign, [0, 0.68, 0.312]));
      f.add(mesh(geo.box(0.06, 0.26, 0.02), sign, [0, 0.68, 0.312]));
      f.add(mesh(geo.box(0.26, 0.06, 0.02), sign, [0, 0.3, 0.312]));
      g.add(f);
    }
    const sparks = named(grp(), 'sparks');
    sparks.position.y = 1.22;
    const sm = mat(C.yellow, { emissive: C.yellow, glow: 2 });
    for (let i = 0; i < 4; i++) {
      const a = (i * PI) / 2;
      sparks.add(mesh(geo.octa(0.05), sm, [Math.cos(a) * 0.3, Math.sin(i * 1.7) * 0.06, Math.sin(a) * 0.3]));
    }
    g.add(sparks);
    return g;
  },
  update(model, t) {
    const s = part(model, 'sparks');
    if (s) {
      s.rotation.y = t * 2.5;
      s.position.y = 1.22 + Math.sin(t * 6) * 0.03;
    }
  },
};

// ───────────────────────── flask ─────────────────────────
const flask: ObjectDef = {
  key: 'flask',
  name: { en: 'Chemistry flask', hi: 'रासायनिक फ्लास्क', mr: 'रासायनिक फ्लास्क' },
  tags: {
    en: [
      'chemistry',
      'laboratory',
      'experiment',
      'reaction',
      'chemical',
      'solution',
      'titration',
      'beaker',
      'liquid',
      'acid',
      'base',
      'science',
      'lab',
      'erlenmeyer',
      'potion',
      'compound',
      'mixture',
    ],
    hi: [
      'रसायन',
      'प्रयोगशाला',
      'प्रयोग',
      'अभिक्रिया',
      'विलयन',
      'अम्ल',
      'क्षार',
      'मिश्रण',
      'यौगिक',
      'अनुमापन',
      'रासायनिक',
    ],
    mr: [
      'रसायनशास्त्र',
      'प्रयोगशाळा',
      'प्रयोग',
      'अभिक्रिया',
      'द्रावण',
      'आम्ल',
      'आम्लारी',
      'मिश्रण',
      'संयुग',
      'अनुमापन',
    ],
  },
  build() {
    const g = grp();
    const glass = glassy(
      mat(C.glass, { rough: 0.05, metal: 0.1, opacity: 0.28, clearcoat: 1, side: THREE.DoubleSide }),
    );
    g.add(
      mesh(
        geo.lathe(
          [
            [0, 0],
            [0.44, 0],
            [0.5, 0.05],
            [0.48, 0.13],
            [0.15, 0.78],
            [0.14, 0.86],
            [0.14, 1.08],
            [0.17, 1.12],
            [0.19, 1.14],
          ],
          36,
        ),
        glass,
      ),
    );
    g.add(
      mesh(
        geo.lathe(
          [
            [0, 0.03],
            [0.41, 0.03],
            [0.46, 0.07],
            [0.45, 0.13],
            [0.3, 0.42],
            [0, 0.42],
          ],
          36,
        ),
        mat(0x1fe04a, { emissive: 0x10b030, glow: 0.8, rough: 0.1, opacity: 0.85 }),
      ),
    );
    g.add(
      mesh(
        geo.torus(0.19, 0.02, 8, 28),
        mat(C.glass, { opacity: 0.6, rough: 0.1 }),
        [0, 1.14, 0],
        [PI / 2, 0, 0],
      ),
    );
    g.add(mesh(geo.cyl(0.14, 0.11, 0.16, 20), mat(C.wood, { rough: 0.8 }), [0, 1.17, 0]));
    // graduation marks
    const mk = mat(C.white, { rough: 0.5 });
    for (let i = 0; i < 3; i++)
      g.add(mesh(geo.box(0.08 - i * 0.012, 0.012, 0.01), mk, [0, 0.2 + i * 0.12, 0.44 - i * 0.065]));
    const bub = mat(C.white, { opacity: 0.65, rough: 0.05, emissive: C.white, glow: 0.3 });
    [
      [-0.14, 0.05],
      [0.08, 0.12],
      [0.15, -0.08],
      [-0.05, -0.12],
    ].forEach(([x, z], i) => {
      const b = named(mesh(geo.sphere(0.04 + (i % 2) * 0.015, 12, 8), bub), `b${i}`);
      b.position.set(x ?? 0, 0.1 + i * 0.08, z ?? 0);
      g.add(b);
    });
    return g;
  },
  update(model, t) {
    for (let i = 0; i < 4; i++) {
      const b = part(model, `b${i}`);
      if (b) b.position.y = 0.08 + ((t * 0.35 + i * 0.27) % 1) * 0.3;
    }
  },
};

// ───────────────────────── telescope ─────────────────────────
const telescope: ObjectDef = {
  key: 'telescope',
  name: { en: 'Telescope', hi: 'दूरबीन', mr: 'दुर्बीण' },
  tags: {
    en: [
      'astronomy',
      'stars',
      'galileo',
      'lens',
      'space',
      'observation',
      'sky',
      'optics',
      'refracting',
      'reflecting',
      'hubble',
      'planet',
      'constellation',
      'observatory',
      'magnify',
      'cosmos',
    ],
    hi: [
      'दूरबीन',
      'खगोल',
      'खगोल विज्ञान',
      'तारे',
      'गैलीलियो',
      'लेंस',
      'आकाश',
      'नक्षत्र',
      'वेधशाला',
      'ब्रह्मांड',
    ],
    mr: ['दुर्बीण', 'खगोलशास्त्र', 'तारे', 'गॅलिलिओ', 'भिंग', 'आकाश', 'नक्षत्र', 'वेधशाळा', 'विश्व', 'अवकाश'],
  },
  idle: ['float'],
  build() {
    const g = grp();
    const wood = mat(C.wood, { rough: 0.6 });
    const brass = mat(C.gold, { metal: 0.9, rough: 0.25 });
    const navy = mat(C.navy, { metal: 0.5, rough: 0.3, clearcoat: 0.8 });
    const head = v3(0, 0.72, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * PI) / 3 + 0.5;
      g.add(limb(head, v3(Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55), 0.03, wood));
      g.add(
        mesh(
          geo.cone(0.035, 0.08, 8),
          mat(C.black),
          [Math.sin(a) * 0.55, 0.0, Math.cos(a) * 0.55],
          [PI, 0, 0],
        ),
      );
    }
    g.add(mesh(geo.cyl(0.07, 0.09, 0.14, 16), brass, [0, 0.66, 0]));
    g.add(mesh(geo.sphere(0.1, 20, 14), brass, [0, 0.74, 0]));
    const yaw = named(grp(), 'yaw');
    yaw.position.copy(head);
    yaw.position.y = 0.74;
    const tube = grp();
    tube.rotation.x = 0.75;
    tube.add(mesh(geo.cyl(0.12, 0.12, 0.8, 28), navy, [0, 0.2, 0]));
    tube.add(mesh(geo.cyl(0.175, 0.125, 0.16, 28), brass, [0, 0.66, 0]));
    tube.add(
      mesh(
        geo.cyl(0.14, 0.14, 0.01, 28),
        mat(C.cyan, { emissive: C.cyan, glow: 0.8, rough: 0.05, opacity: 0.85 }),
        [0, 0.745, 0],
      ),
    );
    tube.add(mesh(geo.torus(0.125, 0.02, 8, 28), brass, [0, 0.0, 0], [PI / 2, 0, 0]));
    tube.add(mesh(geo.torus(0.125, 0.02, 8, 28), brass, [0, 0.42, 0], [PI / 2, 0, 0]));
    tube.add(mesh(geo.cyl(0.05, 0.05, 0.2, 16), mat(C.black, { metal: 0.6, rough: 0.3 }), [0, -0.3, 0]));
    tube.add(mesh(geo.cyl(0.07, 0.055, 0.06, 16), brass, [0, -0.42, 0]));
    // finder scope
    tube.add(mesh(geo.cyl(0.035, 0.035, 0.34, 12), navy, [0.16, 0.25, 0]));
    tube.add(mesh(geo.cyl(0.045, 0.035, 0.05, 12), brass, [0.16, 0.44, 0]));
    tube.add(mesh(geo.box(0.05, 0.03, 0.03), brass, [0.14, 0.12, 0]));
    tube.add(mesh(geo.box(0.05, 0.03, 0.03), brass, [0.14, 0.35, 0]));
    yaw.add(tube);
    g.add(yaw);
    return g;
  },
  update(model, t) {
    const y = part(model, 'yaw');
    if (y) y.rotation.y = Math.sin(t * 0.5) * 0.6;
  },
};

// ───────────────────────── microscope ─────────────────────────
const microscope: ObjectDef = {
  key: 'microscope',
  name: { en: 'Microscope', hi: 'सूक्ष्मदर्शी', mr: 'सूक्ष्मदर्शक' },
  tags: {
    en: [
      'microbe',
      'bacteria',
      'magnification',
      'lens',
      'observation',
      'slide',
      'biology',
      'cell',
      'specimen',
      'leeuwenhoek',
      'hooke',
      'microorganism',
      'virus',
      'optics',
      'laboratory',
    ],
    hi: [
      'सूक्ष्मदर्शी',
      'सूक्ष्मजीव',
      'जीवाणु',
      'आवर्धन',
      'लेंस',
      'स्लाइड',
      'विषाणु',
      'कोशिका',
      'हुक',
      'प्रयोगशाला',
    ],
    mr: [
      'सूक्ष्मदर्शक',
      'सूक्ष्मजीव',
      'जीवाणू',
      'विवर्धन',
      'भिंग',
      'स्लाइड',
      'विषाणू',
      'पेशी',
      'हुक',
      'प्रयोगशाळा',
    ],
  },
  build() {
    const g = grp();
    const navy = mat(C.navy, { metal: 0.5, rough: 0.3, clearcoat: 0.8 });
    const brass = mat(C.gold, { metal: 0.9, rough: 0.25 });
    const black = mat(C.black, { metal: 0.5, rough: 0.35 });
    const steel = mat(C.silver, { metal: 0.95, rough: 0.2 });
    g.add(mesh(geo.box(0.78, 0.09, 0.62), black, [0, 0.045, 0]));
    g.add(mesh(geo.box(0.7, 0.03, 0.54), navy, [0, 0.105, 0]));
    const arm = new THREE.CatmullRomCurve3([
      v3(0, 0.1, -0.22),
      v3(0, 0.4, -0.38),
      v3(0, 0.78, -0.36),
      v3(0, 0.95, -0.12),
    ]);
    g.add(mesh(geo.tube(arm, 30, 0.075, 12), navy));
    // stage + slide + lamp
    g.add(mesh(geo.box(0.6, 0.04, 0.44), black, [0, 0.36, -0.12]));
    g.add(mesh(geo.box(0.26, 0.012, 0.09), mat(C.glass, { opacity: 0.5, rough: 0.05 }), [0, 0.386, -0.14]));
    g.add(
      mesh(
        geo.sphere(0.03, 12, 8),
        mat(C.pink, { emissive: C.pink, glow: 0.4 }),
        [0, 0.394, -0.14],
        [0, 0, 0],
        [1, 0.4, 1],
      ),
    );
    g.add(
      mesh(geo.cyl(0.07, 0.09, 0.12, 20), mat(C.yellow, { emissive: C.yellow, glow: 1.6 }), [0, 0.19, -0.14]),
    );
    g.add(mesh(geo.box(0.12, 0.2, 0.1), navy, [0, 0.27, -0.32]));
    // body tube
    const tube = grp();
    tube.position.set(0, 0.92, 0);
    tube.rotation.x = 0.35;
    tube.add(mesh(geo.cyl(0.085, 0.085, 0.7, 24), navy, [0, 0.05, 0]));
    tube.add(mesh(geo.torus(0.088, 0.02, 8, 24), brass, [0, 0.4, 0], [PI / 2, 0, 0]));
    tube.add(mesh(geo.cyl(0.055, 0.055, 0.24, 20), black, [0, 0.52, 0]));
    tube.add(mesh(geo.torus(0.065, 0.02, 8, 20), steel, [0, 0.65, 0], [PI / 2, 0, 0]));
    tube.add(mesh(geo.cyl(0.11, 0.11, 0.07, 20), brass, [0, -0.32, 0]));
    tube.add(mesh(geo.cyl(0.04, 0.03, 0.16, 14), steel, [0, -0.43, 0]));
    for (const s of [1, -1])
      tube.add(mesh(geo.cyl(0.03, 0.025, 0.12, 12), brass, [s * 0.085, -0.4, 0], [0, 0, -s * 0.55]));
    g.add(tube);
    // focus knobs
    for (const s of [1, -1]) {
      g.add(mesh(geo.cyl(0.075, 0.075, 0.07, 20), brass, [s * 0.1, 0.62, -0.3], [0, 0, PI / 2]));
      g.add(mesh(geo.cyl(0.04, 0.04, 0.1, 16), steel, [s * 0.14, 0.62, -0.3], [0, 0, PI / 2]));
    }
    return g;
  },
};

export const scienceA: ObjectDef[] = [
  pendulum,
  rocket,
  atom,
  dna,
  heart,
  cell,
  magnet,
  lightbulb,
  battery,
  flask,
  telescope,
  microscope,
];
