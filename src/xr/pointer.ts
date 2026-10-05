import * as THREE from 'three';

export type PointerSource = 'mouse' | 'touch' | 'xr-left' | 'xr-right';

export interface InteractorHandlers {
  /** Fired when the thing under the primary pointer changes (null = nothing). */
  hover?(id: string | null, source: PointerSource): void;
  /** Click / tap / trigger on an object. */
  select?(id: string, source: PointerSource): void;
  /** Return true to accept the drag. */
  dragStart?(id: string, point: THREE.Vector3, source: PointerSource): boolean;
  dragMove?(id: string, point: THREE.Vector3, source: PointerSource): void;
  dragEnd?(id: string, point: THREE.Vector3, source: PointerSource): void;
  /** Click / tap on nothing in particular (used to close cards). */
  background?(source: PointerSource): void;
}

interface Drag {
  id: string;
  source: PointerSource;
  dist: number;
  /** Offset between the grab point and the object origin, so objects don't jump to the cursor. */
  planeY: number;
}

const DRAG_PLANE_Y = 1.25;
const CLICK_PX = 7;

/**
 * One place that turns mouse / touch / XR-controller rays into hover, select and drag events.
 * Pickable meshes carry `userData.conceptId` (or `userData.pickId`) on the mesh or an ancestor.
 */
export class Interactor {
  handlers: InteractorHandlers = {};
  private pickables: THREE.Object3D[] = [];
  private draggable: ((id: string) => boolean) | null = null;
  private readonly ray = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private drag: Drag | null = null;
  private hoverId: string | null = null;
  private pressStart: { x: number; y: number; id: string | null } | null = null;
  private readonly tmp = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  setPickables(list: THREE.Object3D[]): void {
    this.pickables = list;
  }

  /** Which ids may be dragged (null = none). */
  setDraggable(fn: ((id: string) => boolean) | null): void {
    this.draggable = fn;
  }

  get dragging(): boolean {
    return this.drag !== null;
  }

  get hovered(): string | null {
    return this.hoverId;
  }

  private idOf(o: THREE.Object3D | null): string | null {
    for (let n: THREE.Object3D | null = o; n; n = n.parent) {
      const id = (n.userData.pickId ?? n.userData.conceptId) as string | undefined;
      if (id) return id;
    }
    return null;
  }

  private cast(): { id: string; dist: number; point: THREE.Vector3 } | null {
    const hits = this.ray.intersectObjects(this.pickables, true);
    for (const h of hits) {
      const id = this.idOf(h.object);
      if (id) return { id, dist: h.distance, point: h.point };
    }
    return null;
  }

  private setHover(id: string | null, source: PointerSource): void {
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.handlers.hover?.(id, source);
  }

  private pointOnDragPlane(drag: Drag): THREE.Vector3 {
    this.plane.constant = -drag.planeY;
    const p = this.ray.ray.intersectPlane(this.plane, this.tmp);
    const far = p ? p.distanceTo(this.ray.ray.origin) > 16 : true;
    if (p && !far) return p.clone();
    return this.ray.ray.at(Math.min(drag.dist, 5), new THREE.Vector3());
  }

  // ------------------------------------------------------------------ mouse / touch (NDC, -1..1)
  private aim(ndc: { x: number; y: number }): void {
    this.ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
  }

  /** Returns true if the press grabbed a draggable object (so the caller must not start a look-drag). */
  press(ndc: { x: number; y: number }, px: { x: number; y: number }, source: PointerSource): boolean {
    this.aim(ndc);
    const hit = this.cast();
    this.pressStart = { ...px, id: hit?.id ?? null };
    if (hit && this.draggable?.(hit.id) && this.handlers.dragStart?.(hit.id, hit.point, source)) {
      this.drag = { id: hit.id, source, dist: hit.dist, planeY: DRAG_PLANE_Y };
      return true;
    }
    return false;
  }

  move(ndc: { x: number; y: number }, source: PointerSource): void {
    this.aim(ndc);
    if (this.drag) {
      this.handlers.dragMove?.(this.drag.id, this.pointOnDragPlane(this.drag), source);
      return;
    }
    this.setHover(this.cast()?.id ?? null, source);
  }

  release(ndc: { x: number; y: number }, px: { x: number; y: number }, source: PointerSource): void {
    this.aim(ndc);
    if (this.drag) {
      const d = this.drag;
      this.drag = null;
      this.handlers.dragEnd?.(d.id, this.pointOnDragPlane(d), source);
      this.pressStart = null;
      return;
    }
    const s = this.pressStart;
    this.pressStart = null;
    if (!s || Math.hypot(px.x - s.x, px.y - s.y) > CLICK_PX) return;
    const hit = this.cast();
    if (hit) this.handlers.select?.(hit.id, source);
    else this.handlers.background?.(source);
  }

  cancelDrag(): void {
    this.drag = null;
  }

  // ------------------------------------------------------------------ XR controllers
  private readonly xrDown = new Map<PointerSource, { id: string | null }>();

  /** Call every frame per controller. `origin`/`dir` are in world space. Returns the ray hit point (for the cursor). */
  xr(source: PointerSource, origin: THREE.Vector3, dir: THREE.Vector3, pressed: boolean): THREE.Vector3 | null {
    this.ray.ray.set(origin, dir.clone().normalize());
    this.ray.far = 30;
    const hit = this.cast();
    const was = this.xrDown.get(source);
    if (this.drag?.source === source) {
      const d = this.drag;
      const p = this.ray.ray.at(d.dist, new THREE.Vector3());
      if (pressed) this.handlers.dragMove?.(d.id, p, source);
      else {
        this.drag = null;
        this.handlers.dragEnd?.(d.id, p, source);
      }
    } else if (!this.drag) {
      this.setHover(hit?.id ?? null, source);
      if (pressed && !was) {
        this.xrDown.set(source, { id: hit?.id ?? null });
        if (hit) {
          if (this.draggable?.(hit.id) && this.handlers.dragStart?.(hit.id, hit.point, source)) {
            this.drag = { id: hit.id, source, dist: Math.max(0.5, hit.dist), planeY: DRAG_PLANE_Y };
          } else this.handlers.select?.(hit.id, source);
        } else this.handlers.background?.(source);
      }
    }
    if (!pressed) this.xrDown.delete(source);
    else if (!was) this.xrDown.set(source, { id: hit?.id ?? null });
    return hit ? hit.point.clone() : null;
  }
}
