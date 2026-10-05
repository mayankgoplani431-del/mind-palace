import * as THREE from 'three';
import type { Interactor, PointerSource } from './pointer';
import type { Rig } from './session';
import { Teleport } from './teleport';
import type { Layout } from '../palace/layout';

const SNAP = (30 * Math.PI) / 180;

interface Ctl {
  index: number;
  ray: THREE.Group;
  grip: THREE.Group;
  line: THREE.Line;
  cursor: THREE.Mesh;
  source: PointerSource;
  handed: XRHandedness;
  pressed: boolean;
  pad: Gamepad | null;
  snapReady: boolean;
  aiming: boolean;
}

/** Meta Quest style controllers: ray pointer + trigger select/grab, stick-forward teleport, stick-sideways snap turn. */
export class XrControllers {
  readonly teleport = new Teleport();
  private readonly ctls: Ctl[] = [];
  private readonly o = new THREE.Vector3();
  private readonly d = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly rig: Rig,
    private readonly interactor: Interactor,
    private readonly getLayout: () => Layout | null,
    private readonly hooks: { onMenu(): void; onTeleport(): void },
  ) {
    for (let i = 0; i < 2; i++) this.ctls.push(this.make(i));
    scene.add(this.teleport.group);
  }

  private make(index: number): Ctl {
    const ray = this.renderer.xr.getController(index);
    const grip = this.renderer.xr.getControllerGrip(index);
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: 0x8b7bff, transparent: true, opacity: 0.85, fog: false }),
    );
    line.scale.z = 4;
    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
    );
    cursor.visible = false;
    ray.add(line);
    // simple procedural controller body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.024, 0.11, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a3160, metalness: 0.4, roughness: 0.4 }),
    );
    body.rotation.x = Math.PI / 2.4;
    grip.add(body);
    this.rig.group.add(ray, grip);
    this.scene.add(cursor);
    const c: Ctl = {
      index,
      ray,
      grip,
      line,
      cursor,
      source: index === 0 ? 'xr-left' : 'xr-right',
      handed: 'none',
      pressed: false,
      pad: null,
      snapReady: true,
      aiming: false,
    };
    ray.addEventListener('connected', (e) => {
      const data = (e as unknown as { data?: XRInputSource }).data;
      c.handed = data?.handedness ?? 'none';
      c.pad = data?.gamepad ?? null;
      c.source = c.handed === 'left' ? 'xr-left' : 'xr-right';
    });
    ray.addEventListener('disconnected', () => {
      c.pad = null;
      c.pressed = false;
    });
    ray.addEventListener('selectstart', () => (c.pressed = true));
    ray.addEventListener('selectend', () => (c.pressed = false));
    ray.addEventListener('squeezestart', () => this.hooks.onMenu());
    return c;
  }

  setActive(on: boolean): void {
    for (const c of this.ctls) {
      c.ray.visible = on;
      c.grip.visible = on;
      c.cursor.visible = false;
    }
    if (!on) this.teleport.hide();
  }

  update(): void {
    for (const c of this.ctls) {
      c.ray.getWorldPosition(this.o);
      c.ray.getWorldQuaternion(this.q);
      this.d.set(0, 0, -1).applyQuaternion(this.q);
      const hit = this.interactor.xr(c.source, this.o, this.d, c.pressed);
      c.line.scale.z = hit ? Math.max(0.1, hit.distanceTo(this.o)) : 4;
      c.cursor.visible = !!hit;
      if (hit) c.cursor.position.copy(hit);
      this.sticks(c);
    }
  }

  private sticks(c: Ctl): void {
    const a = c.pad?.axes;
    if (!a) return;
    const x = a[2] ?? a[0] ?? 0;
    const y = a[3] ?? a[1] ?? 0;
    const canTeleport = c.handed !== 'right' || this.ctls.length < 2;
    const canTurn = c.handed !== 'left';
    if (canTurn) {
      if (Math.abs(x) > 0.7 && c.snapReady && Math.abs(y) < 0.6) {
        this.rig.turnBy(x > 0 ? -SNAP : SNAP);
        c.snapReady = false;
      } else if (Math.abs(x) < 0.3) c.snapReady = true;
    }
    if (canTeleport) {
      if (y < -0.65) {
        c.ray.getWorldPosition(this.o);
        c.ray.getWorldQuaternion(this.q);
        this.d.set(0, 0, -1).applyQuaternion(this.q);
        this.teleport.aim(this.o, this.d, this.getLayout());
        c.aiming = true;
      } else if (c.aiming) {
        c.aiming = false;
        const tp = this.teleport;
        if (tp.valid && tp.target) {
          this.rig.setXZ(tp.target.x, tp.target.z);
          this.hooks.onTeleport();
        }
        tp.hide();
      }
    }
  }

  dispose(): void {
    this.teleport.dispose();
    for (const c of this.ctls) {
      c.ray.removeFromParent();
      c.grip.removeFromParent();
      c.cursor.removeFromParent();
    }
  }
}
