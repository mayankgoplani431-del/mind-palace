import * as THREE from 'three';
import type { App } from '../app';
import { t } from '../i18n';
import type { LocusView } from '../palace/world';
import { PEDESTAL_HEIGHT } from '../palace/layout';
import { makeLabelSprite, disposeSprite } from '../palace/labels';
import { hashString, mulberry32, shuffled } from '../palace/rng';
import { RecallSession } from './recall';
import { sfx } from '../audio/sfx';

interface Item {
  l: LocusView;
  /** shake animation clock (seconds left) and the point it shakes around */
  shake: number;
  shakeAt: THREE.Vector3;
}

const TRAY_R = 1.9;
const TRAY_SCALE = 0.55;

/** Recall Test: objects leave their pedestals into a follow-me tray; drag each back to the right locus. */
export class RecallRun {
  private session!: RecallSession;
  private items = new Map<string, Item>();
  private scope: LocusView[] = [];
  private held: string | null = null;
  private hints = new Map<string, THREE.Sprite>();
  private trayHeading = 0;
  private startedAt = 0;
  private finished = false;
  private pending = new Set<string>();

  constructor(
    private readonly app: App,
    private readonly rooms: number[],
  ) {}

  start(): void {
    const w = this.app.world;
    const p = this.app.palace;
    if (!w || !p) return;
    this.scope = w.loci.filter((l) => this.rooms.includes(l.roomIndex));
    this.startedAt = performance.now();
    this.session = new RecallSession(
      this.scope.map((l) => ({ id: l.id, title: l.concept.title })),
      this.startedAt,
    );
    w.setBadgeMode(true);
    w.revealed.clear();
    const order = shuffled(this.scope, mulberry32(hashString(`${p.seed}:${Date.now() % 9973}`)));
    order.forEach((l) => {
      this.items.set(l.id, { l, shake: 0, shakeAt: new THREE.Vector3() });
      l.inst.root.scale.setScalar(TRAY_SCALE);
    });
    this.trayOrder = order.map((l) => l.id);
    this.trayHeading = this.app.rig.heading;
    this.app.learn.close();
    sfx.play('whoosh');

    const it = this.app.interactor;
    it.setDraggable(
      (id) => this.items.has(id) && !this.pending.has(id) && !this.session.items.get(id)?.placed,
    );
    it.handlers = {
      hover: (id) => this.app.world?.setHighlight(id && this.items.has(id) ? id : null),
      dragStart: (id) => {
        this.held = id;
        sfx.play('pickup');
        return true;
      },
      dragMove: (id, pt) => {
        const o = this.items.get(id);
        if (o) o.l.inst.root.position.set(pt.x, Math.max(0.6, pt.y), pt.z);
      },
      dragEnd: (id, pt) => this.drop(id, pt),
      select: () => undefined,
      background: () => undefined,
    };
    this.app.hud.setPrompt(t('recall.placeInstr', { left: this.session.remaining }));
    this.app.hud.toast(t('recall.instructions'), 'info', 6000);
  }

  private trayOrder: string[] = [];

  update(dt: number, t0: number): void {
    if (this.finished) return;
    const head = this.app.rig.head();
    // tray heading follows the player's gaze with a lag
    let d = this.app.rig.heading - this.trayHeading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.trayHeading += d * Math.min(1, dt * 2.2);

    const waiting = this.trayOrder.filter((id) => !this.session.items.get(id)?.placed);
    const cols = Math.min(8, Math.max(1, waiting.length));
    const step = Math.min(0.34, 1.9 / cols);
    waiting.forEach((id, k) => {
      const o = this.items.get(id);
      if (!o || this.held === id) return;
      const r = Math.floor(k / cols);
      const c = k % cols;
      const rowCols = Math.min(cols, waiting.length - r * cols);
      const ang = this.trayHeading + (c - (rowCols - 1) / 2) * step;
      const tx = head.x + Math.sin(ang) * TRAY_R;
      const tz = head.z + Math.cos(ang) * TRAY_R;
      const ty = 0.7 + r * 0.46 + Math.sin(t0 * 1.3 + k) * 0.03;
      const root = o.l.inst.root;
      if (o.shake > 0) {
        o.shake -= dt;
        root.position.set(o.shakeAt.x + Math.sin(o.shake * 60) * 0.12, o.shakeAt.y, o.shakeAt.z);
        if (o.shake <= 0) this.pending.delete(id);
      } else {
        root.position.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, dt * 6));
      }
      const hint = this.hints.get(id);
      if (hint) hint.position.set(root.position.x, root.position.y + 0.75, root.position.z);
    });
    const secs = (performance.now() - this.startedAt) / 1000;
    this.app.hud.setTimer(`⏱ ${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`);
  }

  private nearestLocus(pt: THREE.Vector3): LocusView | null {
    let best: LocusView | null = null;
    let bd = 1.25;
    for (const l of this.scope) {
      if (this.session.items.get(l.id)?.placed) continue;
      const d = Math.hypot(l.pos.x - pt.x, l.pos.z - pt.z);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best;
  }

  private drop(id: string, pt: THREE.Vector3): void {
    this.held = null;
    const o = this.items.get(id);
    const w = this.app.world;
    if (!o || !w) return;
    const target = this.nearestLocus(pt);
    if (!target) {
      sfx.play('place');
      return; // flies back to the tray
    }
    const res = this.session.place(id, target.id, performance.now());
    if (res.correct) {
      const l = o.l;
      l.inst.root.position.set(l.pos.x, PEDESTAL_HEIGHT + 0.05, l.pos.z);
      l.inst.root.scale.setScalar(1);
      w.revealed.add(l.id);
      l.label.visible = true;
      const b = w.locus(l.id);
      void b;
      this.removeHint(id);
      this.app.sparkles.burst(new THREE.Vector3(l.pos.x, l.pos.y + 0.7, l.pos.z), 0x7dffb0, 60);
      l.inst.restoreBurst();
      l.ped.ringMat.color.set(0x4ade80);
      l.ped.ringMat.emissive.set(0x4ade80);
      sfx.play('chime');
      sfx.play('sparkle');
      this.app.hud.setPrompt(t('recall.placeInstr', { left: this.session.remaining }));
      if (this.session.done) void this.finish();
    } else {
      sfx.play('wrong');
      o.shake = 0.55;
      o.shakeAt.set(pt.x, Math.max(0.7, pt.y), pt.z);
      this.pending.add(id);
      if (res.hint) {
        this.showHint(id, res.hint);
        this.app.hud.toast(t('recall.hint', { letter: res.hint }), 'info', 3500);
      } else this.app.hud.toast(t('recall.wrong'), 'err', 1800);
    }
  }

  private showHint(id: string, letter: string): void {
    this.removeHint(id);
    const s = makeLabelSprite(`${letter}…`, {
      width: 192,
      height: 112,
      fontPx: 64,
      worldHeight: 0.28,
      border: '#fbbf24',
    });
    this.app.scene.add(s);
    this.hints.set(id, s);
  }

  private removeHint(id: string): void {
    const s = this.hints.get(id);
    if (s) {
      s.removeFromParent();
      disposeSprite(s);
      this.hints.delete(id);
    }
  }

  private async finish(): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    const app = this.app;
    const score = this.session.finish(performance.now());
    const prevBest = Math.max(0, ...app.attempts.filter((a) => a.kind === 'recall').map((a) => a.score));
    for (const [id, g] of this.session.grades()) await app.gradeConcept(id, g, false);
    await app.recordAttempt({
      at: Date.now(),
      kind: 'recall',
      score: score.score,
      accuracy: score.accuracy,
      timeSec: score.timeSec,
      hints: score.hints,
      order: this.session.order,
    });
    if (score.perfect) await app.unlockAchievement('perfect_recall');
    const note =
      score.score > prevBest && prevBest > 0
        ? t('recall.newBest', { prev: prevBest })
        : prevBest > 0
          ? t('recall.bestWas', { prev: prevBest })
          : null;
    const rooms = this.rooms;
    this.cleanup();
    app.showRecallResults(score, () => app.startRecall(rooms), note);
  }

  private cleanup(): void {
    const w = this.app.world;
    this.hints.forEach((_s, id) => this.removeHint(id));
    if (w) {
      for (const l of this.scope) {
        l.inst.root.position.set(l.pos.x, PEDESTAL_HEIGHT + 0.05, l.pos.z);
        l.inst.root.scale.setScalar(1);
      }
      w.revealed.clear();
      w.setBadgeMode(false);
      this.app.refreshVisuals();
    }
    this.app.interactor.setDraggable(null);
    this.app.hud.setPrompt(null);
    this.app.hud.setTimer(null);
  }

  stop(silent: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.cleanup();
    void silent;
  }
}
