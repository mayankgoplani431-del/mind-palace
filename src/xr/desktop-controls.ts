import type * as THREE from 'three';
import type { Interactor } from './pointer';
import type { Rig } from './session';
import { slide, type Layout } from '../palace/layout';

const LOOK_SPEED = 0.0038;

export interface MoveProvider {
  /** Forward/strafe in -1..1 (forward positive). */
  axes(): { fwd: number; strafe: number; run: boolean };
}

/**
 * Keyboard (WASD / arrows / Q,E), mouse-drag look and click-to-interact.
 * A press on a draggable object (Recall) drags the object instead of looking around.
 */
export class DesktopControls implements MoveProvider {
  enabled = true;
  private keys = new Set<string>();
  private lookId: number | null = null;
  private last = { x: 0, y: 0 };
  private moved = 0;
  private hoverDrag = false;
  speed = 3.1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly rig: Rig,
    private readonly interactor: Interactor,
    private readonly onFirstGesture: () => void,
  ) {
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', () => this.keys.clear());
  }

  private ndc(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
  }

  private down = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' || !this.enabled) return;
    this.onFirstGesture();
    this.canvas.focus();
    this.canvas.setPointerCapture(e.pointerId);
    const px = { x: e.clientX, y: e.clientY };
    if (this.interactor.press(this.ndc(e), px, 'mouse')) {
      this.hoverDrag = true;
      return;
    }
    this.lookId = e.pointerId;
    this.last = px;
    this.moved = 0;
  };

  private move = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' || !this.enabled) return;
    if (this.hoverDrag) {
      this.interactor.move(this.ndc(e), 'mouse');
      return;
    }
    if (this.lookId === e.pointerId) {
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      this.last = { x: e.clientX, y: e.clientY };
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.rig.setLook(this.rig.yaw - dx * LOOK_SPEED, this.rig.pitch - dy * LOOK_SPEED);
    } else this.interactor.move(this.ndc(e), 'mouse');
  };

  private up = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' || !this.enabled) return;
    const px = { x: e.clientX, y: e.clientY };
    if (this.hoverDrag) {
      this.hoverDrag = false;
      this.interactor.release(this.ndc(e), px, 'mouse');
      return;
    }
    if (this.lookId === e.pointerId) {
      this.lookId = null;
      // a tap without dragging is a click
      if (this.moved < 6) {
        this.interactor.press(this.ndc(e), px, 'mouse');
        this.interactor.release(this.ndc(e), px, 'mouse');
      }
    }
  };

  private keydown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    this.onFirstGesture();
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      this.keys.add(k);
      if (k.startsWith('arrow')) e.preventDefault();
    }
  };

  private keyup = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  axes(): { fwd: number; strafe: number; run: boolean } {
    const k = this.keys;
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const strafe = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
    return { fwd, strafe, run: k.has('shift') };
  }

  /** Apply keyboard turn + movement; `extra` adds touch-joystick axes. */
  update(dt: number, layout: Layout, extra?: MoveProvider): void {
    if (!this.enabled) return;
    const k = this.keys;
    const turn = (k.has('q') || k.has('arrowleft') ? 1 : 0) - (k.has('e') || k.has('arrowright') ? 1 : 0);
    if (turn) this.rig.setLook(this.rig.yaw + turn * 1.9 * dt, this.rig.pitch);
    const a = this.axes();
    const b = extra?.axes() ?? { fwd: 0, strafe: 0, run: false };
    const fwd = Math.max(-1, Math.min(1, a.fwd + b.fwd));
    const strafe = Math.max(-1, Math.min(1, a.strafe + b.strafe));
    if (!fwd && !strafe) return;
    const len = Math.hypot(fwd, strafe) || 1;
    const sp = this.speed * (a.run || b.run ? 1.8 : 1) * dt;
    const yaw = this.rig.yaw;
    // camera looks down -z rotated by yaw: forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw)
    const dx = (-Math.sin(yaw) * fwd + Math.cos(yaw) * strafe) / len;
    const dz = (-Math.cos(yaw) * fwd - Math.sin(yaw) * strafe) / len;
    const pos = this.rig.group.position as THREE.Vector3;
    const to = slide(layout, { x: pos.x, z: pos.z }, { x: pos.x + dx * sp, z: pos.z + dz * sp });
    this.rig.setXZ(to.x, to.z);
  }
}
