import * as THREE from 'three';

const POOL = 360;

let dotTex: THREE.CanvasTexture | null = null;
function dot(): THREE.CanvasTexture {
  if (!dotTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    if (x) {
      const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 32);
    }
    dotTex = new THREE.CanvasTexture(c);
  }
  return dotTex;
}

/** One pooled Points object that fires short sparkle bursts (restore, correct placement...). */
export class Sparkles {
  readonly points: THREE.Points;
  private readonly pos = new Float32Array(POOL * 3);
  private readonly col = new Float32Array(POOL * 3);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private head = 0;

  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const m = new THREE.PointsMaterial({
      size: 0.13,
      map: dot(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    for (let i = 0; i < POOL; i++) this.pos[i * 3 + 1] = -100;
  }

  burst(at: THREE.Vector3, color: THREE.ColorRepresentation = 0xffe08a, n = 44, speed = 2.2): void {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.head;
      this.head = (this.head + 1) % POOL;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.1;
      const s = (0.4 + Math.random()) * speed;
      this.pos.set([at.x, at.y, at.z], i * 3);
      this.vel.set([Math.cos(a) * s * (1 - up * 0.4), up * s * 1.3, Math.sin(a) * s * (1 - up * 0.4)], i * 3);
      this.col.set([c.r, c.g, c.b], i * 3);
      this.life[i] = 0.9 + Math.random() * 0.5;
    }
  }

  update(dt: number): void {
    let any = false;
    for (let i = 0; i < POOL; i++) {
      const l = this.life[i] as number;
      if (l <= 0) continue;
      any = true;
      this.life[i] = l - dt;
      this.vel[i * 3 + 1] = (this.vel[i * 3 + 1] as number) - 3.2 * dt;
      for (let k = 0; k < 3; k++)
        this.pos[i * 3 + k] = (this.pos[i * 3 + k] as number) + (this.vel[i * 3 + k] as number) * dt;
      const f = Math.max(0, l / 1.3);
      for (let k = 0; k < 3; k++)
        this.col[i * 3 + k] = (this.col[i * 3 + k] as number) * (1 - dt * 1.5) * (f > 0 ? 1 : 0);
      if (l - dt <= 0) this.pos[i * 3 + 1] = -100;
    }
    if (any) {
      (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.points.removeFromParent();
  }
}
