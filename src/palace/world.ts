import * as THREE from 'three';
import type { Concept, PalaceData } from '../extract/types';
import { getObjectDef } from '../objects/library';
import { ObjectInstance } from '../objects/instance';
import {
  CORRIDOR_LENGTH,
  PEDESTAL_HEIGHT,
  computeLayout,
  regionAt,
  type Layout,
  type Region,
} from './layout';
import { KIND_ACCENT, THEMES, roomKind, type RoomKind, type ThemeDef } from './themes';
import {
  Disposer,
  buildCorridor,
  buildFoyer,
  buildRoom,
  makeAssets,
  makePedestal,
  type Assets,
  type PedestalParts,
} from './rooms';
import { disposeSprite, makeLabelSprite } from './labels';
import { hashString } from './rng';

export interface WorldEnv {
  mobile: boolean;
  shadows: boolean;
  night: boolean;
  reducedMotion: boolean;
}

export interface LocusView {
  id: string;
  concept: Concept;
  roomIndex: number;
  /** Position within the room (clockwise from the door), after Palace Architect swaps. */
  slot: number;
  /** Global slot index (flat across rooms). */
  globalSlot: number;
  /** Order in which the concept appears in the notes (global). */
  order: number;
  roomTopic: string;
  pos: THREE.Vector3;
  stand: THREE.Vector3;
  yaw: number;
  inst: ObjectInstance;
  ped: PedestalParts;
  label: THREE.Sprite;
}

const OBJ_LIFT = 0.05;

const SKY_VERT = `varying float vH;
void main(){
  vH = normalize(position).y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAG = `uniform vec3 top;
uniform vec3 bottom;
varying float vH;
void main(){
  float t = smoothstep(-0.05, 0.75, vH);
  gl_FragColor = vec4(mix(bottom, top, t), 1.0);
  #include <colorspace_fragment>
}`;

function tmpColor(a: number, b: number, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

export class World {
  readonly root = new THREE.Group();
  readonly layout: Layout;
  readonly loci: LocusView[] = [];
  readonly theme: ThemeDef;
  readonly roomKinds: RoomKind[];
  /** Hit-test proxies of every object (one per locus). */
  readonly hitMeshes: THREE.Mesh[] = [];
  readonly roomAccents: number[];

  private readonly assets: Assets;
  private readonly disposer = new Disposer();
  private readonly animated: THREE.Object3D[] = [];
  private readonly motes: THREE.Points[] = [];
  private readonly sky: THREE.Mesh;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly stars: THREE.Points;
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly lantern: THREE.PointLight;
  private readonly fog: THREE.FogExp2;
  private nightT: number;
  private nightTarget: number;
  private highlighted: LocusView | null = null;
  private labelsOn = true;
  private readonly scene: THREE.Scene;

  constructor(
    readonly palace: PalaceData,
    scene: THREE.Scene,
    private env: WorldEnv,
  ) {
    this.scene = scene;
    this.theme = THEMES[palace.style];
    this.nightT = this.nightTarget = env.night ? 1 : 0;
    this.assets = makeAssets(this.theme, env.shadows);
    this.layout = computeLayout(
      palace.rooms.map((r) => r.concepts.length),
      palace.seed,
    );
    this.roomKinds = palace.rooms.map(roomKind);
    this.roomAccents = this.roomKinds.map((k) => tmpColor(this.theme.accent, KIND_ACCENT[k], 0.6).getHex());

    ObjectInstance.reducedMotion = env.reducedMotion;
    this.buildStructure();
    this.buildLoci();

    // sky + lights
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    const starPos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      const u = ((hashString(`s${i}`) % 10000) / 10000) * Math.PI * 2;
      const v = 0.1 + ((hashString(`t${i}`) % 10000) / 10000) * 0.9;
      const r = 190;
      const s = Math.sqrt(1 - v * v);
      starPos.set([Math.cos(u) * s * r, v * r, Math.sin(u) * s * r], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(
      sg,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.6,
        sizeAttenuation: false,
        transparent: true,
        fog: false,
        depthWrite: false,
      }),
    );
    this.stars.frustumCulled = false;
    this.root.add(this.sky, this.stars);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = env.shadows;
    if (env.shadows) {
      this.sun.shadow.mapSize.set(2048, 2048);
      const c = this.sun.shadow.camera;
      c.left = c.bottom = -20;
      c.right = c.top = 20;
      c.near = 1;
      c.far = 120;
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.03;
    }
    this.lantern = new THREE.PointLight(0xffe2b0, 14, 18, 1.6);
    this.root.add(this.hemi, this.sun, this.sun.target, this.lantern);

    this.fog = new THREE.FogExp2(0xffffff, 0.011);
    scene.fog = this.fog;
    scene.add(this.root);
    this.applyEnvironment(true);
  }

  // ---------------------------------------------------------------- construction
  private buildStructure(): void {
    const { layout, assets } = this;
    const foyerAccent = this.theme.accent;
    const foyer = buildFoyer(layout.foyer.doorAngles, assets, foyerAccent);
    this.root.add(foyer.group);
    this.animated.push(...foyer.animated);
    this.motes.push(foyer.motes);

    // palace title above the plinth
    const title = makeLabelSprite(this.palace.topic, {
      width: 768,
      height: 160,
      fontPx: 58,
      worldHeight: 0.62,
      border: '#ffd166',
    });
    title.position.set(0, 3.0, 0);
    this.root.add(title);
    this.disposer.add({ dispose: () => disposeSprite(title) });

    layout.rooms.forEach((room, i) => {
      const accent = this.roomAccents[i] as number;
      const spec = this.palace.rooms[i];
      if (!spec) return;
      const parts = buildRoom(room, spec.concepts.length, assets, accent, this.palace.seed + i * 131);
      this.root.add(parts.group);
      this.animated.push(...parts.animated);
      this.motes.push(parts.motes);
      this.root.add(buildCorridor(layout.corridors[i]!, assets, accent));

      // door signs (inside the foyer and above the room entrance)
      const sign = makeLabelSprite(`${i + 1}. ${spec.topic}`, {
        width: 640,
        height: 128,
        fontPx: 46,
        worldHeight: 0.5,
        border: '#' + accent.toString(16).padStart(6, '0'),
      });
      const a = layout.foyer.doorAngles[i] as number;
      sign.position.set(
        Math.sin(a) * (layout.foyer.radius - 1.2),
        3.3,
        Math.cos(a) * (layout.foyer.radius - 1.2),
      );
      const sign2 = makeLabelSprite(spec.topic, {
        width: 640,
        height: 128,
        fontPx: 46,
        worldHeight: 0.5,
        border: '#' + accent.toString(16).padStart(6, '0'),
      });
      sign2.position.set(
        room.doorPos.x - Math.sin(room.doorAngle) * 1.2,
        3.3,
        room.doorPos.z - Math.cos(room.doorAngle) * 1.2,
      );
      this.root.add(sign, sign2);
      this.disposer.add({ dispose: () => (disposeSprite(sign), disposeSprite(sign2)) });
    });
  }

  private slotMap(): Map<string, number> {
    const all = this.palace.rooms.flatMap((r) => r.concepts.map((c) => c.id));
    const m = new Map<string, number>();
    const given = this.palace.slots;
    const n = all.length;
    let ok = !!given;
    if (given) {
      const used = new Set<number>();
      for (const id of all) {
        const s = given[id];
        if (s === undefined || s < 0 || s >= n || used.has(s)) {
          ok = false;
          break;
        }
        used.add(s);
      }
    }
    all.forEach((id, i) => m.set(id, ok && given ? (given[id] as number) : i));
    return m;
  }

  private buildLoci(): void {
    const slotOf = this.slotMap();
    const flat: Array<{ roomIndex: number; slot: number }> = [];
    this.layout.rooms.forEach((r) => r.loci.forEach((l) => flat.push({ roomIndex: r.index, slot: l.index })));
    let order = 0;
    this.palace.rooms.forEach((spec, ri) => {
      spec.concepts.forEach((concept) => {
        const gs = slotOf.get(concept.id) ?? order;
        const place = flat[gs] ?? flat[order];
        if (!place) return;
        const room = this.layout.rooms[place.roomIndex];
        const slot = room?.loci[place.slot];
        if (!room || !slot) return;
        const accent = this.roomAccents[place.roomIndex] as number;
        const ped = makePedestal(this.assets, accent);
        ped.group.position.set(slot.pos.x, 0, slot.pos.z);
        const inst = new ObjectInstance(getObjectDef(concept.objectKey), 1.05, order * 1.7);
        inst.root.position.set(slot.pos.x, PEDESTAL_HEIGHT + OBJ_LIFT, slot.pos.z);
        inst.root.userData.conceptId = concept.id;
        inst.hit.userData.conceptId = concept.id;
        const label = makeLabelSprite(concept.title, {
          badge: String(slot.index + 1),
          border: '#' + accent.toString(16).padStart(6, '0'),
        });
        label.position.set(slot.pos.x, PEDESTAL_HEIGHT + 1.75, slot.pos.z);
        this.root.add(ped.group, inst.root, label);
        if (this.env.shadows)
          inst.model.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : undefined));
        this.hitMeshes.push(inst.hit);
        this.loci.push({
          id: concept.id,
          concept,
          roomIndex: place.roomIndex,
          slot: place.slot,
          globalSlot: gs,
          order: order++,
          roomTopic: this.palace.rooms[place.roomIndex]?.topic ?? spec.topic,
          pos: new THREE.Vector3(slot.pos.x, PEDESTAL_HEIGHT, slot.pos.z),
          stand: new THREE.Vector3(slot.stand.x, 0, slot.stand.z),
          yaw: slot.yaw,
          inst,
          ped,
          label,
        });
      });
      void ri;
    });
  }

  // ---------------------------------------------------------------- queries
  locus(id: string): LocusView | undefined {
    return this.loci.find((l) => l.id === id);
  }

  /** Loci in the order a visitor walks them: room by room, clockwise from each door. */
  walkOrder(): LocusView[] {
    return [...this.loci].sort((a, b) => a.roomIndex - b.roomIndex || a.slot - b.slot);
  }

  regionAt(x: number, z: number): Region {
    return regionAt(this.layout, x, z, 0);
  }

  regionName(r: Region, foyerName: string): string {
    if (!r) return foyerName;
    if (r.kind === 'foyer') return foyerName;
    if (r.kind === 'room') return this.palace.rooms[r.index]?.topic ?? foyerName;
    return `${foyerName} → ${this.palace.rooms[r.index]?.topic ?? ''}`;
  }

  get spawn(): { x: number; z: number; yaw: number } {
    // start in the foyer, looking down the first corridor
    const a = this.layout.foyer.doorAngles[0] ?? 0;
    // stand off to one side so the centrepiece and the first door are both in view
    const s = a + Math.PI * 0.62;
    return {
      x: Math.sin(s) * 4.4,
      z: Math.cos(s) * 4.4,
      yaw: Math.atan2(-Math.sin(s) * 0.5 + Math.sin(a) * 3, -Math.cos(s) * 0.5 + Math.cos(a) * 3),
    };
  }

  // ---------------------------------------------------------------- state
  setFreshness(id: string, f: number): void {
    const l = this.locus(id);
    if (!l) return;
    l.inst.setFreshness(f);
    const c = l.ped.baseBody.clone().lerp(new THREE.Color(0x3a3a44), (1 - f) * 0.65);
    l.ped.bodyMat.color.copy(c);
    const g = l.ped.baseRing.clone().lerp(new THREE.Color(0x55586a), 1 - f);
    l.ped.ringMat.color.copy(g);
    l.ped.ringMat.emissive.copy(g);
    l.ped.ringMat.emissiveIntensity = 0.12 + 1.1 * f;
  }

  setHighlight(id: string | null): void {
    if (this.highlighted?.id === id) return;
    this.highlighted?.inst.setHighlight(false);
    this.highlighted = id ? (this.locus(id) ?? null) : null;
    this.highlighted?.inst.setHighlight(true);
  }

  setLabels(on: boolean): void {
    this.labelsOn = on;
    this.loci.forEach((l) => (l.label.visible = on && this.labelMode === 'titles'));
    this.cullClock = 0;
  }

  get labelsVisible(): boolean {
    return this.labelsOn;
  }

  setNight(night: boolean): void {
    this.nightTarget = night ? 1 : 0;
  }

  get isNight(): boolean {
    return this.nightTarget === 1;
  }

  /** Palace Architect: exchange two loci's places (layout only; concept data untouched). */
  swap(aId: string, bId: string): void {
    const a = this.locus(aId);
    const b = this.locus(bId);
    if (!a || !b || a === b) return;
    const keys = ['roomIndex', 'slot', 'globalSlot', 'roomTopic', 'yaw'] as const;
    for (const k of keys) {
      const tmp = a[k];
      (a as unknown as Record<string, unknown>)[k] = b[k];
      (b as unknown as Record<string, unknown>)[k] = tmp;
    }
    const pa = a.pos.clone();
    const sa = a.stand.clone();
    a.pos.copy(b.pos);
    a.stand.copy(b.stand);
    b.pos.copy(pa);
    b.stand.copy(sa);
    for (const l of [a, b]) {
      this.moveLocusVisuals(l);
      this.relabel(l);
    }
    this.palace.slots = Object.fromEntries(this.loci.map((l) => [l.id, l.globalSlot]));
  }

  moveLocusVisuals(l: LocusView): void {
    l.ped.group.position.set(l.pos.x, 0, l.pos.z);
    l.inst.root.position.set(l.pos.x, PEDESTAL_HEIGHT + OBJ_LIFT, l.pos.z);
    l.label.position.set(l.pos.x, PEDESTAL_HEIGHT + 1.75, l.pos.z);
    const accent = this.roomAccents[l.roomIndex] as number;
    const c = new THREE.Color(accent);
    l.ped.baseRing.copy(c);
    l.ped.ringMat.color.copy(c);
    l.ped.ringMat.emissive.copy(c);
  }

  /** Rebuild a locus' title label (after a swap changes its slot number). */
  relabel(l: LocusView): void {
    const accent = this.roomAccents[l.roomIndex] as number;
    const was = l.label.visible;
    l.label.removeFromParent();
    disposeSprite(l.label);
    l.label = makeLabelSprite(l.concept.title, {
      badge: String(l.slot + 1),
      border: '#' + accent.toString(16).padStart(6, '0'),
    });
    l.label.position.set(l.pos.x, PEDESTAL_HEIGHT + 1.75, l.pos.z);
    l.label.visible = was;
    this.root.add(l.label);
  }

  private badges = new Map<string, THREE.Sprite>();
  private labelMode: 'titles' | 'badges' = 'titles';
  /** Loci whose title stays visible even in badge mode (correctly placed in Recall). */
  readonly revealed = new Set<string>();

  /** Recall mode: hide titles, show only the locus number above each pedestal. */
  setBadgeMode(on: boolean): void {
    this.labelMode = on ? 'badges' : 'titles';
    for (const l of this.loci) {
      let b = this.badges.get(l.id);
      if (on && !b) {
        const accent = this.roomAccents[l.roomIndex] as number;
        b = makeLabelSprite(String(l.slot + 1), {
          width: 128,
          height: 128,
          fontPx: 70,
          worldHeight: 0.3,
          border: '#' + accent.toString(16).padStart(6, '0'),
        });
        this.root.add(b);
        this.badges.set(l.id, b);
      }
      if (b) {
        b.position.set(l.pos.x, PEDESTAL_HEIGHT + 0.7, l.pos.z);
        b.visible = on;
      }
      l.label.visible = on ? false : this.labelsOn;
    }
    this.cullClock = 0;
  }

  /** AR pass-through: drop the sky dome and fog so the camera feed shows through. */
  setPassthrough(on: boolean): void {
    this.sky.visible = !on;
    this.stars.visible = !on;
    this.scene.fog = on ? null : this.fog;
  }

  private cullClock = 0;
  private lastCull = 0;

  /** Hide far-away objects so phones don't draw 48 detailed models at once. */
  private cull(p: THREE.Vector3): void {
    for (const l of this.loci) {
      const r = this.layout.rooms[l.roomIndex];
      if (!r) continue;
      const near = Math.hypot(p.x - r.center.x, p.z - r.center.z) < r.radius + (this.env.mobile ? 12 : 18);
      l.inst.root.visible = near;
      l.ped.group.visible = near;
      l.label.visible = near && ((this.labelMode === 'titles' && this.labelsOn) || this.revealed.has(l.id));
      const b = this.badges.get(l.id);
      if (b) b.visible = near && this.labelMode === 'badges' && !this.revealed.has(l.id);
    }
  }

  // ---------------------------------------------------------------- per-frame
  private applyEnvironment(snap: boolean): void {
    const th = this.theme;
    const n = this.nightT;
    const top = tmpColor(th.sky.day[0], th.sky.night[0], n);
    const bottom = tmpColor(th.sky.day[1], th.sky.night[1], n);
    this.skyMat.uniforms.top!.value = top;
    this.skyMat.uniforms.bottom!.value = bottom;
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, n * 1.2 - 0.2);
    this.fog.color.copy(tmpColor(th.fog.day, th.fog.night, n));
    this.fog.density = 0.008 + 0.009 * n;
    this.hemi.color.copy(tmpColor(th.hemi.day[0], th.hemi.night[0], n));
    this.hemi.groundColor.copy(tmpColor(th.hemi.day[1], th.hemi.night[1], n));
    this.hemi.intensity = 0.8 - 0.4 * n;
    this.sun.color.copy(tmpColor(th.sun.day, th.sun.night, n));
    this.sun.intensity = 2.0 - 1.4 * n;
    this.lantern.intensity = 10 + 26 * n;
    this.scene.environmentIntensity = 0.9 - 0.55 * n;
    void snap;
  }

  update(t: number, dt: number, player: THREE.Vector3): void {
    if (Math.abs(this.nightT - this.nightTarget) > 0.001) {
      this.nightT +=
        Math.sign(this.nightTarget - this.nightT) *
        Math.min(Math.abs(this.nightTarget - this.nightT), dt * 1.6);
      this.applyEnvironment(false);
    }
    this.sky.position.copy(player);
    this.stars.position.copy(player);
    this.lantern.position.set(player.x, 2.3, player.z);
    const moonDir = this.nightT > 0.5 ? -1 : 1;
    this.sun.position.set(player.x + 28 * moonDir, 46, player.z + 18);
    this.sun.target.position.set(player.x, 0, player.z);

    const wall = performance.now();
    if (wall - this.lastCull > 250 || this.cullClock === 0) {
      this.lastCull = wall;
      this.cullClock = 1;
      this.cull(player);
    }
    const calm = this.env.reducedMotion;
    for (const l of this.loci) {
      if (!l.inst.root.visible) continue;
      l.inst.update(t, dt);
      const pulse = calm ? 0 : Math.sin(t * 2.4 + l.order) * 0.12;
      const f = l.inst.getFreshness();
      l.ped.ringMat.emissiveIntensity = Math.max(
        0.05,
        0.12 + 1.1 * f + pulse * f + (this.highlighted === l ? 0.8 : 0),
      );
    }
    if (!calm) {
      this.animated.forEach((o, i) => {
        if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.type === 'ConeGeometry') {
          o.scale.y = 1 + Math.sin(t * 9 + i) * 0.12;
          o.scale.x = o.scale.z = 1 + Math.sin(t * 7 + i * 2) * 0.06;
        } else o.rotation.y = t * 0.4 + i;
      });
      this.motes.forEach((m, i) => {
        m.rotation.y = t * 0.03 + i;
        m.position.y = Math.sin(t * 0.3 + i) * 0.15;
      });
    }
  }

  dispose(): void {
    this.loci.forEach((l) => {
      l.inst.dispose();
      disposeSprite(l.label);
    });
    this.badges.forEach((b) => disposeSprite(b));
    this.disposer.disposeAll();
    this.assets.d.disposeAll();
    this.sky.geometry.dispose();
    this.skyMat.dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.sun.shadow.map?.dispose();
    this.root.removeFromParent();
    this.scene.fog = null;
  }

  get corridorLength(): number {
    return CORRIDOR_LENGTH;
  }
}
