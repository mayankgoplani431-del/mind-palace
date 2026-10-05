import * as THREE from 'three';
import { isWalkable, type Layout } from '../palace/layout';

const STEPS = 40;

/** Parabolic teleport arc + landing marker. Only floor points inside the palace are valid. */
export class Teleport {
  readonly group = new THREE.Group();
  private readonly line: THREE.Line;
  private readonly marker: THREE.Mesh;
  private readonly pts = new Float32Array((STEPS + 1) * 3);
  target: THREE.Vector3 | null = null;
  valid = false;

  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pts, 3));
    this.line = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9, fog: false }),
    );
    this.line.frustumCulled = false;
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.32, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        fog: false,
      }),
    );
    this.group.add(this.line, this.marker);
    this.group.visible = false;
  }

  /** Returns the landing point, or null if the arc never reaches the floor. */
  aim(origin: THREE.Vector3, dir: THREE.Vector3, layout: Layout | null): THREE.Vector3 | null {
    const v0 = 7.5;
    const d = dir.clone().normalize();
    let landed: THREE.Vector3 | null = null;
    let n = 0;
    for (let i = 0; i <= STEPS; i++) {
      const t = i * 0.045;
      const x = origin.x + d.x * v0 * t;
      const z = origin.z + d.z * v0 * t;
      let y = origin.y + d.y * v0 * t - 4.9 * t * t;
      if (y <= 0) {
        y = 0.01;
        landed = new THREE.Vector3(x, 0, z);
      }
      this.pts.set([x, y, z], i * 3);
      n = i + 1;
      if (landed) break;
    }
    this.line.geometry.setDrawRange(0, n);
    (this.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    this.target = landed;
    this.valid = !!landed && (!layout || isWalkable(layout, landed.x, landed.z, 0.5));
    const col = this.valid ? 0x4ade80 : 0xf87171;
    (this.line.material as THREE.LineBasicMaterial).color.setHex(col);
    (this.marker.material as THREE.MeshBasicMaterial).color.setHex(col);
    this.marker.visible = !!landed;
    if (landed) this.marker.position.copy(landed).setY(0.02);
    this.group.visible = true;
    return landed;
  }

  hide(): void {
    this.group.visible = false;
    this.target = null;
    this.valid = false;
  }

  dispose(): void {
    this.line.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
    this.marker.geometry.dispose();
    (this.marker.material as THREE.Material).dispose();
    this.group.removeFromParent();
  }
}
