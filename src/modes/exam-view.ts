import * as THREE from 'three';
import type { App } from '../app';
import { t } from '../i18n';
import type { LocusView } from '../palace/world';
import { buildQuestions, ExamSession, timeLimitSec } from './exam';
import { pathTo, pathLength } from './tour';
import { sfx } from '../audio/sfx';
import type { CardContent } from '../ui/card';

type Phase = 'countdown' | 'walk' | 'question' | 'feedback' | 'done';

/** Exam Mode: timed forced route through all loci, one multiple-choice question at each object. */
export class ExamRun {
  private route: LocusView[] = [];
  private session!: ExamSession;
  private phase: Phase = 'countdown';
  private idx = 0;
  private beacon: THREE.Mesh | null = null;
  private countdown = 3.2;
  private fbT = 0;
  private stopped = false;
  targetId: string | null = null;

  constructor(private readonly app: App) {}

  start(): void {
    const w = this.app.world;
    const p = this.app.palace;
    if (!w || !p) return;
    this.route = w.walkOrder();
    const head = this.app.rig.head();
    let at = { x: head.x, z: head.z };
    let meters = 0;
    for (const l of this.route) {
      meters += pathLength(pathTo(w.layout, at, l.roomIndex, { x: l.stand.x, z: l.stand.z }));
      at = { x: l.stand.x, z: l.stand.z };
    }
    const qs = buildQuestions(
      this.route.map((l) => l.concept),
      p.seed,
    );
    this.session = new ExamSession(qs, timeLimitSec(qs.length, meters), 0);
    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 7, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.beacon.visible = false;
    this.app.scene.add(this.beacon);
    w.setLabels(false);
    this.app.interactor.setDraggable(null);
    this.showCountdown();
  }

  private showCountdown(): void {
    const n = Math.ceil(this.countdown);
    this.app.showCard({
      id: 'exam-cd',
      title: `📝 ${t('exam.title')}`,
      body: [t('exam.intro', { n: this.route.length, secs: this.session.limitSec })],
      eyebrow: `${n}…`,
    });
  }

  private target(): LocusView | undefined {
    return this.route[this.idx];
  }

  private goNext(): void {
    const l = this.target();
    if (!l) return;
    this.phase = 'walk';
    this.targetId = l.id;
    this.app.showCard(null);
    this.app.world?.setHighlight(l.id);
    this.beacon?.position.set(l.pos.x, 3.5, l.pos.z);
    if (this.beacon) this.beacon.visible = true;
    this.app.hud.setPrompt(t('exam.walk', { n: this.idx + 1, room: l.roomTopic, slot: l.slot + 1 }));
  }

  /** Clicking the highlighted object auto-walks there (the clock keeps running). */
  onSelect(id: string): void {
    const l = this.target();
    if (this.phase !== 'walk' || !l || id !== l.id) return;
    this.app.walkTo(l.roomIndex, { x: l.stand.x, z: l.stand.z }, { x: l.pos.x, z: l.pos.z });
  }

  private ask(): void {
    const q = this.session.current;
    if (!q) return;
    this.phase = 'question';
    this.app.cancelWalk();
    this.app.hud.setPrompt(null);
    this.session.showQuestion(performance.now());
    this.renderQuestion(null);
  }

  private renderQuestion(chosen: number | null): void {
    const q = this.session.current ?? this.lastQ;
    if (!q) return;
    this.lastQ = q;
    const card: CardContent = {
      id: `exam-q${this.idx}-${chosen ?? 'x'}`,
      eyebrow: t('exam.q', { n: this.idx + 1, total: this.route.length }),
      title: q.quiz.question,
      options: q.quiz.options.map((o, i) => ({
        label: o,
        disabled: chosen !== null,
        state:
          chosen === null
            ? undefined
            : i === q.quiz.answerIndex
              ? 'right'
              : i === chosen
                ? 'wrong'
                : undefined,
        onClick: () => this.answer(i),
      })),
    };
    this.app.showCard(card);
  }

  private lastQ: ReturnType<typeof buildQuestions>[number] | null = null;

  private answer(i: number): void {
    if (this.phase !== 'question') return;
    const correct = this.session.answer(i, performance.now());
    sfx.play(correct ? 'chime' : 'wrong');
    this.renderQuestionAfter(i);
    this.phase = 'feedback';
    this.fbT = 1.1;
  }

  private renderQuestionAfter(chosen: number): void {
    this.renderQuestion(chosen);
  }

  update(dt: number, t0: number): void {
    if (this.stopped) return;
    const head = this.app.rig.head();
    const w = this.app.world;
    if (!w) return;
    if (this.beacon?.visible) {
      this.beacon.rotation.y = t0;
      (this.beacon.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(t0 * 3) * 0.1;
    }
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      if (Math.ceil(this.countdown) !== before && this.countdown > 0) {
        sfx.play('tick');
        this.showCountdown();
      }
      if (this.countdown <= 0) {
        this.session.begin(performance.now());
        this.goNext();
      }
      return;
    }
    const left = this.session.timeLeft(performance.now());
    const mm = Math.floor(left / 60);
    this.app.hud.setTimer(
      `⏱ ${mm}:${String(Math.floor(left % 60)).padStart(2, '0')}  ·  ${Math.min(this.idx + 1, this.route.length)}/${this.route.length}`,
    );
    if (left <= 0 && !this.session.finished) {
      this.session.expire(performance.now());
      void this.finish(true);
      return;
    }
    const l = this.target();
    if (this.phase === 'walk' && l) {
      this.app.guide.update(t0, dt, head, Math.atan2(l.stand.x - head.x, l.stand.z - head.z), 2.4);
      if (Math.hypot(l.stand.x - head.x, l.stand.z - head.z) < 1.9) this.ask();
    } else this.app.guide.update(t0, dt, head, this.app.rig.heading, 0);
    if (this.phase === 'feedback') {
      this.fbT -= dt;
      if (this.fbT <= 0) {
        this.idx++;
        if (this.session.finished) void this.finish(false);
        else this.goNext();
      }
    }
  }

  private async finish(timedOut: boolean): Promise<void> {
    if (this.phase === 'done') return;
    this.phase = 'done';
    const app = this.app;
    const res = this.session.result();
    for (const [id, g] of this.session.grades()) await app.gradeConcept(id, g, false);
    await app.recordAttempt({
      at: Date.now(),
      kind: 'exam',
      score: res.score,
      accuracy: res.total ? res.correct / res.total : 0,
      timeSec: res.timeSec,
      hints: 0,
    });
    if (this.session.speedRunner()) await app.unlockAchievement('speed_runner');
    this.cleanup();
    if (timedOut) app.hud.toast(t('exam.timeUp'), 'err', 3500);
    app.showExamResults(res, () => {
      app.endModes();
      app.startExam();
    });
  }

  private cleanup(): void {
    this.stopped = true;
    this.beacon?.removeFromParent();
    this.beacon?.geometry.dispose();
    (this.beacon?.material as THREE.Material | undefined)?.dispose();
    this.beacon = null;
    this.app.showCard(null);
    this.app.hud.setPrompt(null);
    this.app.hud.setTimer(null);
    this.app.world?.setHighlight(null);
    this.app.world?.setLabels(true);
  }

  stop(silent: boolean): void {
    if (this.stopped) return;
    this.cleanup();
    void silent;
  }
}
