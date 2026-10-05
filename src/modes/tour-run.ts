import * as THREE from 'three';
import type { App } from '../app';
import { t } from '../i18n';
import { stopSpeaking } from '../learn/tts';

const MIN_TALK = 4.5;

/** Guided tour: the guide orb leads the visitor through every locus in memory order and narrates each concept. */
export class TourRun {
  private ids: string[] = [];
  private idx = -1;
  private phase: 'walk' | 'talk' | 'done' = 'walk';
  private talkT = 0;
  private spoken = true;
  private stopped = false;

  constructor(private readonly app: App) {}

  start(): void {
    const w = this.app.world;
    if (!w) return;
    this.ids = w.walkOrder().map((l) => l.id);
    this.app.hud.toast(t('tour.start'), 'info', 3000);
    this.next();
  }

  private next(): void {
    if (this.stopped) return;
    this.idx++;
    const w = this.app.world;
    const l = this.ids[this.idx] ? w?.locus(this.ids[this.idx] as string) : null;
    if (!w || !l) {
      this.finish();
      return;
    }
    this.phase = 'walk';
    this.app.learn.close();
    this.app.hud.setPrompt(`${this.idx + 1}/${this.ids.length} · ${l.roomTopic}`);
    this.app.walkTo(l.roomIndex, { x: l.stand.x, z: l.stand.z }, { x: l.pos.x, z: l.pos.z }, () =>
      this.arrive(l.id),
    );
  }

  private arrive(id: string): void {
    if (this.stopped) return;
    const l = this.app.world?.locus(id);
    if (!l) return;
    this.phase = 'talk';
    this.talkT = 0;
    this.spoken = false;
    this.app.learn.open(id, { click: false });
    const c = l.concept;
    void this.app.speak(`${c.title}. ${c.summary}. ${c.mnemonic}`).then(() => (this.spoken = true));
    if (!this.app.settings.tts) this.spoken = true;
  }

  update(dt: number, t0: number): void {
    const head = this.app.rig.head();
    this.app.guide.update(t0, dt, head, this.app.rig.heading, this.phase === 'walk' ? 2.2 : 0);
    if (this.phase === 'talk') {
      this.talkT += dt;
      const words =
        (this.app.world?.locus(this.ids[this.idx] as string)?.concept.summary.split(/\s+/).length ?? 10) + 8;
      const need = this.app.settings.tts ? MIN_TALK : Math.max(MIN_TALK, words * 0.32);
      if (this.talkT > need && this.spoken) this.next();
    }
  }

  skip(): void {
    stopSpeaking();
    this.app.cancelWalk();
    this.next();
  }

  private finish(): void {
    this.phase = 'done';
    this.app.hud.toast(t('tour.done'), 'info', 4000);
    this.stop(false);
  }

  stop(silent: boolean): void {
    if (this.stopped) return;
    this.stopped = true;
    stopSpeaking();
    this.app.cancelWalk();
    this.app.learn.close();
    this.app.hud.setPrompt(null);
    if (!silent) this.app.endTour();
    void THREE;
  }
}
