import * as THREE from 'three';
import type { Layout, Vec2 } from '../palace/layout';
import { WALL_HEIGHT } from '../palace/layout';

export interface TourStop {
  conceptId: string;
  /** Waypoints to walk (starting from wherever the visitor is) to reach `stand`. */
  path: Vec2[];
  stand: Vec2;
  /** Where to look once there. */
  look: Vec2;
}

export interface TourLocus {
  id: string;
  roomIndex: number;
  stand: Vec2;
  pos: Vec2;
}

export const pathLength = (pts: Vec2[]): number => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - (pts[i] as Vec2).x, p.z - (pts[i] as Vec2).z), 0);

/**
 * Walking route through the palace in memory order: foyer -> corridor -> room (clockwise loci) -> back
 * through the foyer to the next room. `loci` must already be in walk order.
 */
export function planRoute(layout: Layout, loci: TourLocus[], from: Vec2): TourStop[] {
  const stops: TourStop[] = [];
  let at = from;
  let inRoom = -1; // -1 = foyer / unknown
  for (const l of loci) {
    const path: Vec2[] = [];
    const room = layout.rooms[l.roomIndex];
    const cor = layout.corridors[l.roomIndex];
    if (room && cor && l.roomIndex !== inRoom) {
      if (inRoom >= 0) {
        // leave the previous room via its corridor and cross the foyer
        const pr = layout.rooms[inRoom];
        const pc = layout.corridors[inRoom];
        if (pr && pc) path.push(pc.b, pc.a, layout.foyer.center);
      }
      path.push(cor.a, cor.b, room.center);
      inRoom = l.roomIndex;
    }
    path.push(l.stand);
    stops.push({ conceptId: l.id, path: [at, ...path], stand: l.stand, look: l.pos });
    at = l.stand;
  }
  return stops;
}

export function routeMeters(stops: TourStop[]): number {
  return stops.reduce((s, st) => s + pathLength(st.path), 0);
}

/** Moves a point along a polyline at constant speed. */
export class PathFollower {
  private seg = 0;
  private dist = 0;
  pos: Vec2;
  heading = 0;
  done: boolean;

  constructor(
    private readonly pts: Vec2[],
    private readonly speed = 3.4,
  ) {
    this.pos = pts[0] ?? { x: 0, z: 0 };
    this.done = pts.length < 2;
    if (pts.length >= 2) this.heading = Math.atan2((pts[1] as Vec2).x - (pts[0] as Vec2).x, (pts[1] as Vec2).z - (pts[0] as Vec2).z);
  }

  update(dt: number): void {
    if (this.done) return;
    let move = this.speed * dt;
    while (move > 0 && !this.done) {
      const a = this.pts[this.seg] as Vec2;
      const b = this.pts[this.seg + 1] as Vec2;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const left = len - this.dist;
      if (len > 1e-4) this.heading = Math.atan2(b.x - a.x, b.z - a.z);
      if (move >= left) {
        move -= left;
        this.seg += 1;
        this.dist = 0;
        if (this.seg >= this.pts.length - 1) {
          this.pos = b;
          this.done = true;
        }
      } else {
        this.dist += move;
        move = 0;
        const k = this.dist / len;
        this.pos = { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
      }
    }
  }
}

/** The friendly guide orb that hovers near the visitor and leads the tour. */
export class GuideOrb {
  readonly group = new THREE.Group();
  private readonly core: THREE.Mesh;
  private readonly halo: THREE.Sprite;
  private readonly light: THREE.PointLight;
  private target = new THREE.Vector3();

  constructor() {
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xfff4c2, emissive: 0xffd166, emissiveIntensity: 3, roughness: 0.3 }),
    );
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    if (x) {
      const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,230,150,0.95)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.halo.scale.setScalar(0.9);
    this.light = new THREE.PointLight(0xffd166, 1.6, 6, 2);
    this.group.add(this.core, this.halo, this.light);
    this.group.position.set(0, 1.6, 0);
  }

  /** Follow the player's right-front shoulder, or lead by hovering `lead` metres ahead. */
  update(t: number, dt: number, player: THREE.Vector3, yaw: number, lead = 0): void {
    const side = lead > 0 ? 0 : 0.85;
    const fwd = lead > 0 ? lead : 1.1;
    this.target.set(
      player.x + Math.sin(yaw) * fwd + Math.cos(yaw) * side,
      Math.min(WALL_HEIGHT - 1, 1.55 + Math.sin(t * 1.7) * 0.09),
      player.z + Math.cos(yaw) * fwd - Math.sin(yaw) * side,
    );
    this.group.position.lerp(this.target, Math.min(1, dt * 3.2));
    this.halo.material.opacity = 0.75 + Math.sin(t * 3) * 0.2;
  }

  dispose(): void {
    this.core.geometry.dispose();
    (this.core.material as THREE.Material).dispose();
    this.halo.material.map?.dispose();
    this.halo.material.dispose();
    this.group.removeFromParent();
  }
}
