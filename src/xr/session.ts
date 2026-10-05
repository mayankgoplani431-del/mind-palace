import * as THREE from 'three';

export const EYE_HEIGHT = 1.6;

/** The player's body: a "dolly" group with the camera inside. Moving/rotating the group moves the player in flat and XR modes. */
export class Rig {
  readonly group = new THREE.Group();
  readonly camera: THREE.PerspectiveCamera;
  private yawV = 0;
  private pitchV = 0;
  private xr = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group.add(camera);
    camera.position.set(0, EYE_HEIGHT, 0);
    camera.rotation.order = 'YXZ';
  }

  get yaw(): number {
    return this.yawV;
  }

  get pitch(): number {
    return this.pitchV;
  }

  get inXr(): boolean {
    return this.xr;
  }

  setXr(on: boolean): void {
    this.xr = on;
    if (on) {
      this.camera.position.set(0, 0, 0);
      this.camera.rotation.set(0, 0, 0);
    } else {
      this.camera.position.set(0, EYE_HEIGHT, 0);
      this.group.rotation.set(0, this.yawV, 0);
      this.camera.rotation.set(this.pitchV, 0, 0);
    }
  }

  /** Flat (non-XR) look. */
  setLook(yaw: number, pitch: number): void {
    this.yawV = yaw;
    this.pitchV = Math.max(-1.3, Math.min(1.3, pitch));
    if (!this.xr) {
      this.group.rotation.y = this.yawV;
      this.camera.rotation.x = this.pitchV;
    }
  }

  /** World position of the eyes projected on the floor. */
  head(out = new THREE.Vector3()): THREE.Vector3 {
    this.camera.getWorldPosition(out);
    return out;
  }

  /** Put the player's feet at (x, z) (in XR the head offset inside the play space is preserved). */
  setXZ(x: number, z: number): void {
    if (!this.xr) {
      this.group.position.set(x, 0, z);
      return;
    }
    this.group.updateMatrixWorld(true);
    const h = this.head();
    this.group.position.x += x - h.x;
    this.group.position.z += z - h.z;
  }

  /** Rotate about the head (XR snap turn, or flat yaw). */
  turnBy(angle: number): void {
    if (!this.xr) {
      this.setLook(this.yawV + angle, this.pitchV);
      return;
    }
    this.group.updateMatrixWorld(true);
    const before = this.head();
    this.group.rotateY(angle);
    this.group.updateMatrixWorld(true);
    const after = this.head();
    this.group.position.x += before.x - after.x;
    this.group.position.z += before.z - after.z;
    this.yawV += angle;
  }

  /** Face a heading (radians, our φ convention: direction = (sin φ, cos φ)). Camera looks down -z, so yaw = φ + π. */
  faceHeading(phi: number): void {
    this.setLook(phi + Math.PI, this.pitchV);
  }

  /** Heading φ the player is currently looking along (horizontal). */
  get heading(): number {
    return this.yawV + Math.PI;
  }
}

export interface XrSupport {
  vr: boolean;
  ar: boolean;
}

export async function detectXr(): Promise<XrSupport> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) return { vr: false, ar: false };
  const check = async (mode: XRSessionMode): Promise<boolean> => {
    try {
      return await xr.isSessionSupported(mode);
    } catch {
      return false;
    }
  };
  const [vr, ar] = await Promise.all([check('immersive-vr'), check('immersive-ar')]);
  return { vr, ar };
}

export type XrMode = 'vr' | 'ar';

export class XrManager {
  private session: XRSession | null = null;
  mode: XrMode | null = null;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly overlayRoot: HTMLElement,
    private readonly hooks: { onStart(mode: XrMode): void; onEnd(mode: XrMode): void },
  ) {
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
  }

  get presenting(): boolean {
    return this.session !== null;
  }

  async enter(mode: XrMode): Promise<void> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) throw new Error('WebXR is not available in this browser.');
    const init: XRSessionInit =
      mode === 'vr'
        ? { optionalFeatures: ['local-floor', 'bounded-floor'] }
        : {
            optionalFeatures: ['local-floor', 'dom-overlay'],
            domOverlay: { root: this.overlayRoot },
          };
    const session = await xr.requestSession(mode === 'vr' ? 'immersive-vr' : 'immersive-ar', init);
    this.session = session;
    this.mode = mode;
    session.addEventListener('end', () => {
      const m = this.mode;
      this.session = null;
      this.mode = null;
      if (m) this.hooks.onEnd(m);
    });
    await this.renderer.xr.setSession(session);
    this.hooks.onStart(mode);
  }

  async exit(): Promise<void> {
    await this.session?.end();
  }
}
