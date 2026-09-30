import * as THREE from 'three';
import type { ObjectDef } from './types';
import { isSharedGeometry } from './kit';

interface MatState {
  m: THREE.MeshStandardMaterial;
  color: THREE.Color;
  emissive: THREE.Color;
  hasEmissive: boolean;
  ei: number;
  opacity: number;
  transparent: boolean;
  h: number;
  s: number;
  l: number;
}

const hsl = { h: 0, s: 0, l: 0 };

/**
 * One placed memory object: normalises a built model to a common size, drives idle animation,
 * hover highlight, and the single `freshness` value (0..1) that fades colour/opacity/glow and dust.
 */
export class ObjectInstance {
  static reducedMotion = false;

  /** Position this in the world. userData.conceptId is set by the palace. */
  readonly root = new THREE.Group();
  readonly model: THREE.Group;
  /** Invisible, generous hit proxy so tiny objects are easy to point at (touch / VR). */
  readonly hit: THREE.Mesh;
  private readonly holder = new THREE.Group();
  private readonly mats: MatState[] = [];
  private dust: THREE.Points | null = null;
  private dustSeed: Float32Array | null = null;
  private freshness = 1;
  private shownFreshness = -1;
  private highlightTarget = 0;
  private highlight = 0;
  private boost = 0;
  private pop = 0;
  private shownGlow = -1;
  private readonly phase: number;
  private readonly idle: Set<string>;
  private time = 0;
  private readonly height: number;

  constructor(
    readonly def: ObjectDef,
    size = 0.85,
    phase = 0,
  ) {
    this.phase = phase;
    this.idle = new Set(def.idle ?? ['float', 'rotate']);
    this.model = def.build();

    // normalise: longest side == size, base on y=0, centred on x/z
    const box = new THREE.Box3().setFromObject(this.model);
    const dim = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    const s = size / Math.max(dim.x, dim.y, dim.z, 1e-3);
    const fit = new THREE.Group();
    fit.scale.setScalar(s);
    fit.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
    fit.add(this.model);
    this.height = dim.y * s;
    this.holder.add(fit);
    this.root.add(this.holder);

    const hitMat = new THREE.MeshBasicMaterial();
    hitMat.visible = false;
    this.hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.45, size * 0.6), 8, 6), hitMat);
    this.hit.position.y = this.height / 2;
    this.hit.userData.isHit = true;
    this.root.add(this.hit);

    const seen = new Set<THREE.Material>();
    this.model.traverse((o) => {
      const mm = (o as THREE.Mesh).material;
      if (!mm) return;
      for (const m of Array.isArray(mm) ? mm : [mm]) {
        if (seen.has(m) || !(m as THREE.MeshStandardMaterial).isMeshStandardMaterial) continue;
        seen.add(m);
        const sm = m as THREE.MeshStandardMaterial;
        const st: MatState = {
          m: sm,
          color: sm.color.clone(),
          emissive: sm.emissive.clone(),
          hasEmissive: sm.emissive.getHex() !== 0,
          ei: sm.emissiveIntensity,
          opacity: sm.opacity,
          transparent: sm.transparent,
          h: 0,
          s: 0,
          l: 0,
        };
        st.color.getHSL(hsl);
        st.h = hsl.h;
        st.s = hsl.s;
        st.l = hsl.l;
        this.mats.push(st);
      }
    });
    this.applyFreshness(true);
  }

  get topY(): number {
    return this.height;
  }

  /** The single fading input: 1 = fresh & glowing, 0 = long overdue (grey, translucent, dusty). */
  setFreshness(f: number): void {
    this.freshness = Math.min(1, Math.max(0, f));
  }

  getFreshness(): number {
    return this.freshness;
  }

  setHighlight(on: boolean): void {
    this.highlightTarget = on ? 1 : 0;
  }

  /** Satisfying "restored" animation: glow burst + scale pop. */
  restoreBurst(): void {
    this.boost = 1;
    this.pop = 1;
  }

  update(t: number, dt: number): void {
    this.time = t;
    const calm = ObjectInstance.reducedMotion;
    this.highlight += (this.highlightTarget - this.highlight) * Math.min(1, dt * 10);
    this.boost = Math.max(0, this.boost - dt * 0.8);
    this.pop = Math.max(0, this.pop - dt * 2.2);

    const h = this.holder;
    if (!calm && this.idle.has('float')) h.position.y = 0.05 + Math.sin(t * 1.4 + this.phase) * 0.05;
    else h.position.y = 0.05;
    if (!calm && this.idle.has('rotate')) h.rotation.y = t * 0.45 + this.phase;
    const pulse = !calm && this.idle.has('pulse') ? 1 + Math.sin(t * 2.2 + this.phase) * 0.04 : 1;
    const popS = 1 + Math.sin(this.pop * Math.PI) * 0.22;
    h.scale.setScalar(pulse * popS * (1 + this.highlight * 0.08));

    this.def.update?.(this.model, calm ? 0 : t, dt);
    this.applyFreshness(false);
    this.animateDust(dt, calm);
  }

  private applyFreshness(force: boolean): void {
    const f = this.freshness;
    const fresh = f > 0.85 ? (f - 0.85) / 0.15 : 0;
    const shimmer = 0.75 + 0.25 * Math.sin(this.time * 2 + this.phase);
    const glow = fresh * 0.22 * shimmer + this.highlight * 0.45 + this.boost * 1.1;
    const changed = force || Math.abs(f - this.shownFreshness) > 0.002 || Math.abs(glow - this.shownGlow) > 0.004;
    if (!changed) return;
    this.shownFreshness = f;
    this.shownGlow = glow;
    const sat = 0.1 + 0.9 * f;
    for (const s of this.mats) {
      const m = s.m;
      if (f >= 0.999) m.color.copy(s.color);
      else m.color.setHSL(s.h, s.s * sat, s.l * (0.72 + 0.28 * f) + (1 - f) * 0.1);
      m.opacity = s.opacity * (0.42 + 0.58 * f);
      m.transparent = s.transparent || f < 0.999;
      if (s.hasEmissive) m.emissiveIntensity = s.ei * (0.25 + 0.75 * f) + glow;
      else {
        m.emissive.copy(m.color);
        m.emissiveIntensity = glow;
      }
    }
    this.syncDust(f);
  }

  private syncDust(f: number): void {
    if (f >= 0.7) {
      if (this.dust) this.dust.visible = false;
      return;
    }
    if (!this.dust) {
      const n = 30;
      const pos = new Float32Array(n * 3);
      const seed = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = (i * 2.399963) % (Math.PI * 2);
        const r = 0.18 + ((i * 37) % 10) / 10 * 0.32;
        seed[i * 3] = a;
        seed[i * 3 + 1] = r;
        seed[i * 3 + 2] = ((i * 53) % 17) / 17;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pm = new THREE.PointsMaterial({ color: 0xc9b89a, size: 0.035, transparent: true, depthWrite: false, opacity: 0.7 });
      this.dust = new THREE.Points(g, pm);
      this.dust.frustumCulled = false;
      this.dustSeed = seed;
      this.root.add(this.dust);
    }
    this.dust.visible = true;
    (this.dust.material as THREE.PointsMaterial).opacity = Math.min(0.85, (0.7 - f) * 1.5);
  }

  private animateDust(dt: number, calm: boolean): void {
    if (!this.dust || !this.dust.visible || !this.dustSeed) return;
    const p = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    const s = this.dustSeed;
    const t = calm ? 0 : this.time;
    for (let i = 0; i < p.count; i++) {
      const a = (s[i * 3] ?? 0) + t * 0.25;
      const r = s[i * 3 + 1] ?? 0.3;
      const k = s[i * 3 + 2] ?? 0;
      p.setXYZ(i, Math.cos(a) * r, 0.05 + ((k + t * 0.05) % 1) * (this.height + 0.25), Math.sin(a) * r);
    }
    p.needsUpdate = true;
    void dt;
  }

  dispose(): void {
    const mats = new Set<THREE.Material>();
    const geos = new Set<THREE.BufferGeometry>();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !isSharedGeometry(m.geometry)) geos.add(m.geometry);
      const mm = m.material;
      if (mm) for (const x of Array.isArray(mm) ? mm : [mm]) mats.add(x);
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    this.root.removeFromParent();
  }
}
