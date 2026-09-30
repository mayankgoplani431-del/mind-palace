// Dev-only contact sheet for the object library (served by `vite dev` at /mind-palace/sheet.html).
// Query params: from=0 count=20 cols=5 key=atom t=1.5 fresh=1 still=1
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OBJECTS } from '../objects/library';
import { OBJECT_KEYS } from '../objects/keys';
import { ObjectInstance } from '../objects/instance';

const q = new URLSearchParams(location.search);
const from = Number(q.get('from') ?? 0);
const count = Number(q.get('count') ?? 20);
const cols = Number(q.get('cols') ?? 5);
const only = q.get('key');
const fixedT = q.has('t') ? Number(q.get('t')) : null;
const fresh = Number(q.get('fresh') ?? 1);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10142a);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.8;
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(3, 6, 4);
sun.castShadow = true;
scene.add(sun, new THREE.HemisphereLight(0x99aaff, 0x222233, 0.5));

const list = only ? OBJECTS.filter((o) => o.key === only) : OBJECTS.slice(from, from + count);
const spacing = 1.25;
const rows = Math.ceil(list.length / cols);
const inst: ObjectInstance[] = [];
const labels: Array<{ el: HTMLDivElement; p: THREE.Vector3 }> = [];
list.forEach((def, i) => {
  const c = i % cols;
  const r = Math.floor(i / cols);
  const x = (c - (Math.min(cols, list.length) - 1) / 2) * spacing;
  const z = (r - (rows - 1) / 2) * spacing;
  const o = new ObjectInstance(def, 0.9, i);
  o.root.position.set(x, 0, z);
  o.setFreshness(fresh);
  scene.add(o.root);
  inst.push(o);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0x2a3160 }));
  ped.position.set(x, -0.05, z);
  ped.receiveShadow = true;
  scene.add(ped);
  const el = document.createElement('div');
  el.className = 'lbl';
  el.textContent = def.key;
  document.body.appendChild(el);
  labels.push({ el, p: new THREE.Vector3(x, -0.12, z + 0.45) });
});

const missing = OBJECT_KEYS.filter((k) => !OBJECTS.some((o) => o.key === k));
if (!only && from === 0 && missing.length) console.warn('Missing object keys:', missing.join(','));

const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
const w = Math.min(cols, list.length) * spacing;
const dist = Math.max(w / 2 / Math.tan((cam.fov * Math.PI) / 360) / cam.aspect, (rows * spacing) / 2 / Math.tan((cam.fov * Math.PI) / 360)) + 1.2;
cam.position.set(0, dist * 0.55 + 0.6, dist * 0.85);
cam.lookAt(0, 0.35, 0);

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = fixedT ?? now / 1000;
  inst.forEach((o) => o.update(t, dt));
  renderer.render(scene, cam);
  for (const l of labels) {
    const v = l.p.clone().project(cam);
    l.el.style.left = `${((v.x + 1) / 2) * innerWidth}px`;
    l.el.style.top = `${((1 - v.y) / 2) * innerHeight}px`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
(window as unknown as { __sheetReady: boolean }).__sheetReady = true;
