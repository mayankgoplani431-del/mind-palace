import * as THREE from 'three';

/** Ghost Mode: a translucent path through the loci (your previous best recall order) with a ghost orb walking it. */
export class GhostTrail {
  readonly group = new THREE.Group();
  private curve: THREE.CatmullRomCurve3 | null = null;
  private readonly orb: THREE.Mesh;
  private tube: THREE.Mesh | null = null;
  private u = 0;

  constructor() {
    this.orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xcfd8ff, transparent: true, opacity: 0.55, fog: false }),
    );
    this.group.add(this.orb);
    this.group.visible = false;
  }

  setPath(points: THREE.Vector3[]): void {
    if (this.tube) {
      this.tube.geometry.dispose();
      (this.tube.material as THREE.Material).dispose();
      this.tube.removeFromParent();
      this.tube = null;
    }
    if (points.length < 2) {
      this.curve = null;
      return;
    }
    this.curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p.x, 0.06, p.z)),
      false,
      'centripetal',
    );
    this.tube = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, Math.min(400, points.length * 24), 0.045, 6, false),
      new THREE.MeshBasicMaterial({
        color: 0x9fb2ff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        fog: false,
      }),
    );
    this.group.add(this.tube);
  }

  setVisible(on: boolean): void {
    this.group.visible = on && !!this.curve;
  }

  update(dt: number): void {
    if (!this.group.visible || !this.curve) return;
    this.u = (this.u + dt / Math.max(8, this.curve.getLength() / 2.2)) % 1;
    const p = this.curve.getPointAt(this.u);
    this.orb.position.set(p.x, 1.1 + Math.sin(this.u * 60) * 0.06, p.z);
  }

  dispose(): void {
    this.setPath([]);
    this.orb.geometry.dispose();
    (this.orb.material as THREE.Material).dispose();
    this.group.removeFromParent();
  }
}
