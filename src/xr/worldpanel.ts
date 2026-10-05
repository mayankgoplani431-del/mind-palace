import * as THREE from 'three';
import type { CardButton, CardContent } from '../ui/card';
import { font, wrapText } from '../palace/labels';

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  btn: CardButton;
}

const CW = 1024;
const CH = 768;

/** In-VR version of the card/quiz UI: a canvas texture on a plane that buttons are hit-tested on via ray UV. */
export class WorldPanel {
  readonly mesh: THREE.Mesh;
  private readonly canvas = document.createElement('canvas');
  private readonly tex: THREE.CanvasTexture;
  private hits: Hit[] = [];
  private content: CardContent | null = null;

  constructor() {
    this.canvas.width = CW;
    this.canvas.height = CH;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.125),
      new THREE.MeshBasicMaterial({
        map: this.tex,
        transparent: true,
        side: THREE.DoubleSide,
        fog: false,
        depthTest: false,
      }),
    );
    this.mesh.renderOrder = 100;
    this.mesh.userData.pickId = 'panel';
    this.mesh.visible = false;
  }

  get visible(): boolean {
    return this.mesh.visible;
  }

  show(c: CardContent, camera: THREE.Camera): void {
    const first = !this.mesh.visible;
    this.content = c;
    this.draw();
    this.mesh.visible = true;
    if (first) this.place(camera);
  }

  hide(): void {
    this.mesh.visible = false;
    this.content = null;
  }

  /** Float the panel 1.5 m in front of the head, facing it. */
  place(camera: THREE.Camera): void {
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    camera.getWorldPosition(p);
    camera.getWorldQuaternion(q);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    fwd.y = 0;
    fwd.normalize();
    this.mesh.position.copy(p).addScaledVector(fwd, 1.5);
    this.mesh.position.y = Math.max(1.0, p.y - 0.15);
    this.mesh.lookAt(p.x, this.mesh.position.y, p.z);
  }

  private draw(): void {
    const c = this.content;
    const x = this.canvas.getContext('2d');
    if (!x || !c) return;
    x.clearRect(0, 0, CW, CH);
    x.fillStyle = 'rgba(14,20,48,0.94)';
    x.strokeStyle = 'rgba(160,175,255,0.9)';
    x.lineWidth = 5;
    x.beginPath();
    x.roundRect(6, 6, CW - 12, CH - 12, 34);
    x.fill();
    x.stroke();
    this.hits = [];
    let y = 36;
    x.textAlign = 'left';
    x.textBaseline = 'top';
    if (c.eyebrow) {
      x.fillStyle = '#a3aed6';
      x.font = font(26, 400);
      x.fillText(c.eyebrow, 44, y);
      y += 36;
    }
    x.fillStyle = '#22d3ee';
    x.font = font(46);
    for (const ln of wrapText(x, c.title, CW - 88, 2)) {
      x.fillText(ln, 44, y);
      y += 56;
    }
    x.fillStyle = '#eef1ff';
    x.font = font(30, 400);
    for (const para of c.body ?? []) {
      for (const ln of wrapText(x, para, CW - 88, 4)) {
        x.fillText(ln, 44, y);
        y += 40;
      }
    }
    if (c.quote) {
      x.fillStyle = '#ffe9a3';
      x.font = font(28, 400);
      for (const ln of wrapText(x, c.quote, CW - 88, 3)) {
        x.fillText(ln, 44, y);
        y += 38;
      }
    }
    if (c.chips?.length) {
      x.fillStyle = '#a3aed6';
      x.font = font(24, 400);
      x.fillText(c.chips.join('  ·  '), 44, y + 6);
      y += 44;
    }
    const button = (b: CardButton, bx: number, by: number, bw: number, bh: number): void => {
      const fill =
        b.state === 'right'
          ? '#14532d'
          : b.state === 'wrong'
            ? '#5b1a1a'
            : b.kind === 'primary'
              ? '#4b3fc4'
              : b.kind === 'good'
                ? '#14532d'
                : b.kind === 'bad'
                  ? '#5b1a1a'
                  : '#1f2a5c';
      x.fillStyle = fill;
      x.strokeStyle = 'rgba(160,175,255,0.7)';
      x.lineWidth = 3;
      x.beginPath();
      x.roundRect(bx, by, bw, bh, 18);
      x.fill();
      x.stroke();
      x.fillStyle = b.disabled ? '#8a8fa8' : '#fff';
      x.font = font(28, 700);
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      const ln = wrapText(x, b.label, bw - 24, 2);
      ln.forEach((l, i) => x.fillText(l, bx + bw / 2, by + bh / 2 + (i - (ln.length - 1) / 2) * 32));
      x.textAlign = 'left';
      x.textBaseline = 'top';
      if (!b.disabled) this.hits.push({ x: bx, y: by, w: bw, h: bh, btn: b });
    };
    y += 8;
    for (const o of c.options ?? []) {
      button(o, 44, y, CW - 88, 62);
      y += 72;
    }
    const bs = c.buttons ?? [];
    if (bs.length) {
      const bh = 66;
      const by = Math.max(y + 8, CH - bh - 28);
      const gap = 14;
      const bw = (CW - 88 - gap * (bs.length - 1)) / bs.length;
      bs.forEach((b, i) => button(b, 44 + i * (bw + gap), by, bw, bh));
    }
    this.tex.needsUpdate = true;
  }

  /** Returns true if a button was pressed at the world-space point. */
  press(point: THREE.Vector3): boolean {
    const local = this.mesh.worldToLocal(point.clone());
    const px = (local.x / 1.5 + 0.5) * CW;
    const py = (0.5 - local.y / 1.125) * CH;
    const hit = this.hits.find((h) => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h);
    hit?.btn.onClick();
    return !!hit;
  }

  dispose(): void {
    this.tex.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
