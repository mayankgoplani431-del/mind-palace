import type { Interactor } from './pointer';
import type { MoveProvider } from './desktop-controls';
import type { Rig } from './session';
import { h } from '../ui/dom';

const LOOK = 0.0052;
const R = 60;

export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

/** Virtual joystick + one-finger look + tap to interact + optional gyro look. */
export class TouchControls implements MoveProvider {
  enabled = true;
  readonly el: HTMLElement;
  private readonly knob: HTMLElement;
  private joyId: number | null = null;
  private vec = { x: 0, y: 0 };
  private lookId: number | null = null;
  private last = { x: 0, y: 0 };
  private moved = 0;
  private dragging = false;
  private gyroOn = false;
  private lastAlpha: number | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly rig: Rig,
    private readonly interactor: Interactor,
    private readonly onFirstGesture: () => void,
  ) {
    this.knob = h('i');
    this.el = h('div', { class: 'joystick', attrs: { 'aria-hidden': 'true' } }, this.knob);
    this.el.addEventListener('pointerdown', this.joyDown);
    this.el.addEventListener('pointermove', this.joyMove);
    this.el.addEventListener('pointerup', this.joyUp);
    this.el.addEventListener('pointercancel', this.joyUp);
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.up);
  }

  show(on: boolean): void {
    this.el.style.display = on ? '' : 'none';
  }

  private joyDown = (e: PointerEvent): void => {
    this.onFirstGesture();
    this.joyId = e.pointerId;
    this.el.setPointerCapture(e.pointerId);
    this.joyMove(e);
  };

  private joyMove = (e: PointerEvent): void => {
    if (this.joyId !== e.pointerId) return;
    const r = this.el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    this.vec = { x: dx / R, y: dy / R };
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  private joyUp = (e: PointerEvent): void => {
    if (this.joyId !== e.pointerId) return;
    this.joyId = null;
    this.vec = { x: 0, y: 0 };
    this.knob.style.transform = '';
  };

  private ndc(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
  }

  private down = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch' || !this.enabled || this.lookId !== null) return;
    this.onFirstGesture();
    this.canvas.setPointerCapture(e.pointerId);
    this.lookId = e.pointerId;
    this.last = { x: e.clientX, y: e.clientY };
    this.moved = 0;
    this.dragging = this.interactor.press(this.ndc(e), this.last, 'touch');
  };

  private move = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch' || this.lookId !== e.pointerId) return;
    if (this.dragging) {
      this.interactor.move(this.ndc(e), 'touch');
      return;
    }
    const dx = e.clientX - this.last.x;
    const dy = e.clientY - this.last.y;
    this.last = { x: e.clientX, y: e.clientY };
    this.moved += Math.abs(dx) + Math.abs(dy);
    this.rig.setLook(this.rig.yaw - dx * LOOK, this.rig.pitch - dy * LOOK);
  };

  private up = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch' || this.lookId !== e.pointerId) return;
    this.lookId = null;
    const px = { x: e.clientX, y: e.clientY };
    if (this.dragging) {
      this.dragging = false;
      this.interactor.release(this.ndc(e), px, 'touch');
    } else if (this.moved < 10) {
      this.interactor.press(this.ndc(e), px, 'touch');
      this.interactor.release(this.ndc(e), px, 'touch');
    }
  };

  axes(): { fwd: number; strafe: number; run: boolean } {
    const dead = 0.12;
    const m = Math.hypot(this.vec.x, this.vec.y);
    if (m < dead) return { fwd: 0, strafe: 0, run: false };
    return { fwd: -this.vec.y, strafe: this.vec.x, run: m > 0.92 };
  }

  // ---------------------------------------------------------------- gyro
  /** Returns false if the device/permission is unavailable. Must be called from a user gesture (iOS). */
  async setGyro(on: boolean): Promise<boolean> {
    if (!on) {
      window.removeEventListener('deviceorientation', this.orient);
      this.gyroOn = false;
      this.lastAlpha = null;
      return true;
    }
    if (typeof DeviceOrientationEvent === 'undefined') return false;
    const D = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (D.requestPermission) {
      try {
        if ((await D.requestPermission()) !== 'granted') return false;
      } catch {
        return false;
      }
    }
    window.addEventListener('deviceorientation', this.orient);
    this.gyroOn = true;
    return true;
  }

  get gyro(): boolean {
    return this.gyroOn;
  }

  private orient = (e: DeviceOrientationEvent): void => {
    if (e.alpha === null || e.beta === null) return;
    const ang = screen.orientation?.angle ?? 0;
    const portrait = ang === 0 || ang === 180;
    if (this.lastAlpha !== null) {
      let d = e.alpha - this.lastAlpha;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      if (Math.abs(d) < 60) this.rig.setLook(this.rig.yaw + (d * Math.PI) / 180, this.rig.pitch);
    }
    this.lastAlpha = e.alpha;
    const tilt = portrait ? e.beta - 90 : (ang === 90 ? -1 : 1) * (e.gamma ?? 0);
    this.rig.setLook(this.rig.yaw, (-tilt * Math.PI) / 180);
  };
}
