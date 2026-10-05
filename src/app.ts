import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { setUiLang, t } from './i18n';
import type { Lang, PalaceData } from './extract/types';
import { buildPalace, type EngineConfig } from './extract';
import { LlmError } from './extract/llm/common';
import { NotesError, loadNotesFile } from './input/notes';
import { World } from './palace/world';
import { drawMinimap } from './palace/minimap';
import { Sparkles } from './palace/fx';
import { GhostTrail } from './palace/ghost';
import { ensureFonts } from './palace/labels';
import { pathTo, GuideOrb, PathFollower } from './modes/tour';
import { regionAt, type Vec2 } from './palace/layout';
import { ObjectInstance } from './objects/instance';
import { Hud, type HudButtonKey } from './ui/hud';
import { clear, download, h, pickFile } from './ui/dom';
import { renderHome, generatingOverlay, openModal, recallResults, examResults } from './ui/panels';
import { settingsBody } from './ui/settings';
import { renderResultCard } from './ui/result-card';
import type { CardContent } from './ui/card';
import { Interactor, type PointerSource } from './xr/pointer';
import { DesktopControls } from './xr/desktop-controls';
import { TouchControls, isTouchDevice } from './xr/touch-controls';
import { Rig, XrManager, detectXr, type XrMode, type XrSupport } from './xr/session';
import { XrControllers } from './xr/controllers';
import { WorldPanel } from './xr/worldpanel';
import {
  DEFAULT_SETTINGS,
  EMPTY_META,
  addAttempt,
  deletePalace,
  listPalaces,
  loadAttempts,
  loadCards,
  loadMeta,
  loadSettings,
  saveCards,
  saveMeta,
  savePalace,
  saveSettings,
  touchStreak,
  type Attempt,
  type Meta,
  type Settings,
} from './storage/db';
import { exportPalace, palaceFromHash, parsePalaceFile, shareUrl, ImportError } from './storage/export';
import { newCard, review, type Card, type Grade } from './learn/srs';
import { freshness, mastery } from './learn/fading';
import { refreshQuests } from './learn/quests';
import { now, setTimeOffsetDays, getTimeOffsetDays } from './learn/clock';
import { speak, stopSpeaking } from './learn/tts';
import { unlock, streakAchievements, type AchievementId } from './learn/achievements';
import { sfx } from './audio/sfx';
import { LearnCard } from './modes/learn';
import { TourRun } from './modes/tour-run';
import { RecallRun } from './modes/recall-view';
import { ExamRun } from './modes/exam-view';
import type { ExamResult } from './modes/exam';
import type { RecallScore } from './modes/recall';

export type AppState = 'home' | 'generating' | 'palace' | 'recall' | 'exam' | 'results';

const OFFSET_KEY = 'mindpalace.timeoffset';

const isMobileUa = (): boolean => /Android|iPhone|iPad|iPod|OculusBrowser|Quest/i.test(navigator.userAgent);

export class App {
  readonly canvas: HTMLCanvasElement;
  readonly ui: HTMLElement;
  readonly mobile = isMobileUa() || (isTouchDevice() && Math.min(screen.width, screen.height) < 820);
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
  readonly rig = new Rig(this.camera);
  readonly interactor = new Interactor(this.camera);
  readonly sparkles = new Sparkles();
  readonly ghost = new GhostTrail();
  readonly guide = new GuideOrb();
  readonly panel = new WorldPanel();
  renderer: THREE.WebGLRenderer | null = null;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private xr: XrManager | null = null;
  private controllers: XrControllers | null = null;
  xrSupport: XrSupport = { vr: false, ar: false };
  desktop!: DesktopControls;
  touch!: TouchControls;
  hud!: Hud;

  settings: Settings = { ...DEFAULT_SETTINGS };
  meta: Meta = { ...EMPTY_META };
  palaces: PalaceData[] = [];
  draft = { text: '' };
  state: AppState = 'home';
  palace: PalaceData | null = null;
  world: World | null = null;
  cards = new Map<string, Card>();
  attempts: Attempt[] = [];

  learn!: LearnCard;
  tour: TourRun | null = null;
  recall: RecallRun | null = null;
  exam: ExamRun | null = null;
  architect = false;

  private mover: { follower: PathFollower; look: Vec2 | null; done: (() => void) | null } | null = null;
  private lastT = performance.now();
  private elapsed = 0;
  private frames = 0;
  private hudClock = 0;
  private questSig: string | null = null;
  private noVoiceWarned = false;
  private currentCard: CardContent | null = null;
  private ambient = false;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.canvas = canvas;
    this.ui = ui;
  }

  // ------------------------------------------------------------------------------------------ boot
  async init(): Promise<void> {
    this.settings = loadSettings();
    setUiLang(this.settings.uiLang);
    try {
      const off = Number(localStorage.getItem(OFFSET_KEY) ?? 0);
      if (Number.isFinite(off)) setTimeOffsetDays(off);
    } catch {
      /* ignore */
    }
    this.applySettings();
    await ensureFonts();
    [this.palaces, this.meta] = await Promise.all([listPalaces(), loadMeta()]);

    this.setupRenderer();
    this.hud = new Hud((k) => this.onHudButton(k));
    this.learn = new LearnCard(this);
    this.setupInput();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', () => this.firstGesture(), { once: true, capture: true });
    this.scene.add(this.rig.group, this.sparkles.points, this.ghost.group, this.guide.group, this.panel.mesh);
    this.renderer?.setAnimationLoop(() => this.frame());
    void this.detectXr();

    // shared palace link?
    try {
      const shared = palaceFromHash(location.hash);
      if (shared) {
        history.replaceState(null, '', location.pathname + location.search);
        await this.importPalace(shared);
        return;
      }
    } catch (e) {
      this.showHome(e instanceof ImportError ? e.message : t('err.importBad'));
      return;
    }
    this.showHome();
  }

  private setupRenderer(): void {
    try {
      const r = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !this.mobile,
        alpha: true,
        powerPreference: 'high-performance',
      });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2));
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 0.92;
      r.shadowMap.enabled = !this.mobile;
      r.shadowMap.type = THREE.PCFShadowMap;
      this.renderer = r;
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      pm.dispose();
      this.xr = new XrManager(r, document.getElementById('app') ?? document.body, {
        onStart: (m) => this.onXrStart(m),
        onEnd: (m) => this.onXrEnd(m),
      });
      this.controllers = new XrControllers(
        r,
        this.scene,
        this.rig,
        this.interactor,
        () => this.world?.layout ?? null,
        {
          onMenu: () => this.vrMenu(),
          onTeleport: () => sfx.play('whoosh'),
        },
      );
      this.controllers.setActive(false);
      this.resize();
    } catch (e) {
      console.warn('WebGL unavailable', e);
      this.renderer = null;
    }
  }

  private ensureComposer(): void {
    if (this.composer || !this.renderer || this.mobile) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(this.renderer, rt);
    c.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(size, 0.22, 0.5, 1.0);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.composer = c;
  }

  private setupInput(): void {
    this.desktop = new DesktopControls(this.canvas, this.rig, this.interactor, () => this.firstGesture());
    this.touch = new TouchControls(this.canvas, this.rig, this.interactor, () => this.firstGesture());
    this.touch.show(false);
    this.interactor.handlers = {
      hover: (id) => this.onHover(id),
      select: (id, src, p) => this.onSelect(id, src, p),
      background: () => this.onBackground(),
    };
  }

  private async detectXr(): Promise<void> {
    this.xrSupport = await detectXr();
    this.refreshButtons();
  }

  private firstGesture(): void {
    sfx.unlock();
    if (!this.ambient && this.state !== 'home') {
      this.ambient = true;
      sfx.setAmbient(true);
    }
  }

  // ------------------------------------------------------------------------------------------ settings
  applySettings(): void {
    const s = this.settings;
    document.body.classList.toggle('hc', s.highContrast);
    document.body.classList.toggle('rm', s.reducedMotion);
    document.documentElement.style.setProperty('--fs', String(s.fontScale));
    sfx.setMuted(s.mute);
    ObjectInstance.reducedMotion = s.reducedMotion;
    if (this.touch) void this.touch.setGyro(s.gyro && isTouchDevice());
  }

  settingsChanged(rebuild: 'ui' | 'world' | 'none' = 'none'): void {
    saveSettings(this.settings);
    setUiLang(this.settings.uiLang);
    this.applySettings();
    this.hud?.relabel();
    this.hud?.setNightLabel(this.settings.night);
    if (this.world) {
      this.world.setNight(this.settings.night);
      this.ghost.setVisible(this.settings.ghost);
    }
    if (rebuild === 'ui') {
      if (this.state === 'home') this.showHome();
      else this.refreshHud();
    }
  }

  openSettings(): void {
    const close = openModal(
      this.ui,
      ...settingsBody(
        {
          settings: this.settings,
          inPalace: !!this.world,
          changed: (r) => this.settingsChanged(r),
          timeTravel: (d) => this.timeTravel(d),
          clearData: () => void this.clearData(),
        },
        () => close(),
      ),
    );
  }

  timeTravel(d: number | 'reset'): void {
    const off = d === 'reset' ? 0 : getTimeOffsetDays() + d;
    setTimeOffsetDays(off);
    try {
      localStorage.setItem(OFFSET_KEY, String(off));
    } catch {
      /* ignore */
    }
    this.refreshVisuals();
    this.hud?.toast(`⏳ ${t('settings.timeOffset')}: +${off}d`);
  }

  private async clearData(): Promise<void> {
    for (const p of this.palaces) await deletePalace(p.id);
    this.palaces = [];
    this.meta = { ...EMPTY_META };
    await saveMeta(this.meta);
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    location.reload();
  }

  // ------------------------------------------------------------------------------------------ screens
  showHome(error?: string): void {
    this.leavePalace();
    this.state = 'home';
    sfx.setAmbient(false);
    this.ambient = false;
    clear(this.ui);
    this.touch?.show(false);
    this.ui.append(
      renderHome(
        {
          settings: this.settings,
          meta: this.meta,
          palaces: this.palaces,
          draft: this.draft,
          saveSettings: () => saveSettings(this.settings),
          setUiLang: (l: Lang) => {
            this.settings.uiLang = l;
            this.settingsChanged('ui');
          },
          openSettings: () => this.openSettings(),
          generate: (text) => void this.generate(text),
          loadFile: (f) => this.loadFile(f),
          openPalace: (p) => void this.openPalace(p),
          deletePalace: (p) => void this.removePalace(p),
          exportPalace: (p) => void this.exportOne(p),
          importPalace: () => void this.importFromFile(),
          sharePalace: (p) => void this.sharePalace(p),
          masteryOf: (p) => this.masteryPct(p),
        },
        error,
      ),
    );
    if (!this.renderer)
      this.ui.prepend(
        h('div', {
          class: 'toast err',
          text: t('err.webgl'),
          style: { margin: '8px auto', width: 'fit-content' },
        }),
      );
  }

  private async loadFile(f: File): Promise<string | null> {
    try {
      return await loadNotesFile(f);
    } catch (e) {
      const msg = e instanceof NotesError ? this.notesMessage(e) : t('err.generic');
      this.toastHome(msg);
      return null;
    }
  }

  private notesMessage(e: NotesError): string {
    const map: Record<string, string> = {
      'empty-pdf': 'err.pdfEmpty',
      read: 'err.pdfRead',
      unsupported: 'err.unsupported',
      'too-short': 'err.tooShort',
      'too-large': 'err.tooLarge',
    };
    return t(map[e.kind] ?? 'err.generic');
  }

  private toastHome(msg: string): void {
    const el = h('div', {
      class: 'toast err',
      text: msg,
      style: { position: 'absolute', left: '50%', top: '12px', transform: 'translateX(-50%)', zIndex: '60' },
    });
    this.ui.append(el);
    setTimeout(() => el.remove(), 4500);
  }

  private llmMessage(e: LlmError): string {
    const map: Record<string, string> = {
      auth: 'err.auth',
      rate: 'err.rate',
      network: 'err.network',
      server: 'err.server',
      parse: 'err.parse',
      'bad-request': 'err.badRequest',
      'no-key': 'err.noKey',
    };
    return `${t(map[e.kind] ?? 'err.generic')}`;
  }

  async generate(text: string): Promise<void> {
    const engine: EngineConfig =
      this.settings.useLlm && this.settings.apiKey
        ? {
            kind: 'llm',
            cfg: {
              provider: this.settings.provider,
              model: this.settings.model,
              apiKey: this.settings.apiKey,
            },
          }
        : { kind: 'heuristic' };
    const noKey = this.settings.useLlm && !this.settings.apiKey;
    this.state = 'generating';
    const overlay = generatingOverlay();
    this.ui.append(overlay.el);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const { palace, warnings } = await buildPalace(text, {
        langChoice: this.settings.langChoice,
        engine,
        style: this.settings.style,
        onProgress: (d, n) => overlay.set(d, n),
      });
      overlay.el.remove();
      await savePalace(palace);
      this.palaces = await listPalaces();
      await this.unlockAchievement('first_palace', false);
      await this.openPalace(palace);
      if (noKey) this.hud.toast(t('err.noKey'), 'err', 6000);
      for (const w of warnings.filter((x) => x.kind !== 'fallback'))
        this.hud.toast(
          `${this.llmMessage(new LlmError(w.kind as LlmError['kind'], w.message))} — ${t('gen.fallback')}`,
          'err',
          8000,
        );
    } catch (e) {
      overlay.el.remove();
      const msg =
        e instanceof NotesError
          ? this.notesMessage(e)
          : e instanceof LlmError
            ? this.llmMessage(e)
            : t('err.generic');
      this.showHome(msg);
    }
  }

  private async removePalace(p: PalaceData): Promise<void> {
    if (!confirm(t('home.deleteConfirm', { name: p.topic }))) return;
    await deletePalace(p.id);
    this.palaces = await listPalaces();
    this.showHome();
  }

  private async exportOne(p: PalaceData): Promise<void> {
    const cards = await loadCards(p.id);
    download(`mind-palace-${p.id}.json`, exportPalace(p, cards));
  }

  private async importFromFile(): Promise<void> {
    const f = await pickFile('.json,application/json');
    if (!f) return;
    try {
      const { palace, cards } = parsePalaceFile(await f.text());
      if (cards) await saveCards(palace.id, cards);
      await this.importPalace(palace);
    } catch (e) {
      this.toastHome(e instanceof ImportError ? e.message : t('err.importBad'));
    }
  }

  private async importPalace(p: PalaceData): Promise<void> {
    await savePalace(p);
    this.palaces = await listPalaces();
    await this.openPalace(p);
  }

  private async sharePalace(p: PalaceData): Promise<void> {
    const url = shareUrl(p);
    try {
      await navigator.clipboard.writeText(url);
      this.toastHome(t('home.linkCopied'));
    } catch {
      prompt(t('home.share'), url);
    }
  }

  async masteryPct(p: PalaceData): Promise<number> {
    const cards = await loadCards(p.id);
    const ids = p.rooms.flatMap((r) => r.concepts.map((c) => c.id));
    if (!ids.length) return 0;
    const n = now();
    return Math.round(
      (100 * ids.reduce((s, id) => s + (cards[id] ? mastery(cards[id], n) : 0), 0)) / ids.length,
    );
  }

  // ------------------------------------------------------------------------------------------ palace lifecycle
  async openPalace(p: PalaceData): Promise<void> {
    if (!this.renderer) {
      this.showHome(t('err.webgl'));
      return;
    }
    this.leavePalace();
    this.palace = p;
    const stored = await loadCards(p.id);
    const t0 = now();
    this.cards = new Map();
    for (const r of p.rooms)
      for (const c of r.concepts) this.cards.set(c.id, stored[c.id] ?? newCard(c.id, t0));
    this.attempts = await loadAttempts(p.id);
    await saveCards(p.id, Object.fromEntries(this.cards));

    this.world = new World(p, this.scene, {
      mobile: this.mobile,
      shadows: !this.mobile,
      night: this.settings.night,
      reducedMotion: this.settings.reducedMotion,
    });
    if (!this.mobile && this.settings.bloom) this.ensureComposer();
    const sp = this.world.spawn;
    this.rig.setXZ(sp.x, sp.z);
    this.rig.faceHeading(sp.yaw);
    this.rig.setLook(this.rig.yaw, -0.05);
    this.interactor.setPickables(this.world.hitMeshes);
    this.world.setLabels(true);
    this.updateGhostPath();
    this.ghost.setVisible(this.settings.ghost);

    clear(this.ui);
    this.ui.append(this.hud.el);
    this.touch.show(isTouchDevice() && !this.xr?.presenting);
    this.ui.append(this.touch.el);
    this.state = 'palace';
    this.hud.setNightLabel(this.settings.night);
    this.refreshVisuals();
    this.refreshButtons();
    sfx.play('whoosh');
    if (this.meta.streak === 0) await this.touchStreakNow();
    this.refreshHud();
    this.hud.toast(t('hud.welcome', { name: p.topic }), 'info', 4200);
  }

  private leavePalace(): void {
    this.stopModes();
    this.learn?.close();
    this.mover = null;
    this.world?.dispose();
    this.world = null;
    this.palace = null;
    this.interactor.setPickables([]);
    this.hud?.showCard(null);
    this.panel.hide();
    stopSpeaking();
  }

  private stopModes(): void {
    this.tour?.stop(true);
    this.recall?.stop(true);
    this.exam?.stop(true);
    this.tour = this.recall = this.exam = null;
    this.setArchitect(false);
  }

  // ------------------------------------------------------------------------------------------ visuals / SRS
  freshnessOf(id: string): number {
    const c = this.cards.get(id);
    return c ? freshness(c, now()) : 1;
  }

  refreshVisuals(): void {
    if (!this.world) return;
    for (const l of this.world.loci) this.world.setFreshness(l.id, this.freshnessOf(l.id));
    this.refreshHud();
  }

  refreshHud(): void {
    if (!this.world || !this.palace) return;
    const n = now();
    const rings = this.palace.rooms.map((r, i) => {
      const pct = Math.round(
        (100 * r.concepts.reduce((s, c) => s + mastery(this.cards.get(c.id) ?? newCard(c.id, n), n), 0)) /
          Math.max(1, r.concepts.length),
      );
      return {
        label: r.topic,
        pct,
        color: `#${(this.world?.roomAccents[i] ?? 0x22d3ee).toString(16).padStart(6, '0')}`,
      };
    });
    this.hud.setStats(this.meta.streak, rings);
    const quests = refreshQuests(this.cards, n);
    const sig = quests.map((q) => `${q.conceptId}:${Math.round(q.freshness * 20)}`).join(',');
    if (sig !== this.questSig) {
      this.questSig = sig;
      this.hud.setQuests(
        quests.map((q) => {
          const l = this.world?.locus(q.conceptId);
          return {
            id: q.conceptId,
            title: l?.concept.title ?? q.conceptId,
            room: l?.roomTopic ?? '',
            freshness: q.freshness,
          };
        }),
        (id) => this.walkToConcept(id, true),
      );
    }
    this.hud.setNightLabel(this.settings.night);
  }

  /** Apply an SM-2 grade: persist, restore the object's glow, celebrate. */
  async gradeConcept(id: string, grade: Grade, celebrate = true): Promise<void> {
    const c = this.cards.get(id);
    if (!c || !this.palace) return;
    const next = review(c, grade, now());
    this.cards.set(id, next);
    const l = this.world?.locus(id);
    if (l) {
      this.world?.setFreshness(id, freshness(next, now()));
      if (celebrate) {
        l.inst.restoreBurst();
        this.sparkles.burst(new THREE.Vector3(l.pos.x, l.pos.y + 0.6, l.pos.z), 0xffe08a, 56);
        sfx.play('restore');
      }
    }
    await saveCards(this.palace.id, Object.fromEntries(this.cards));
    await this.touchStreakNow();
    this.questSig = null;
    this.refreshHud();
  }

  private async touchStreakNow(): Promise<void> {
    const m = touchStreak(this.meta);
    if (m !== this.meta) {
      this.meta = m;
      await saveMeta(m);
    }
    for (const a of streakAchievements(this.meta)) await this.unlockAchievement(a);
  }

  async unlockAchievement(id: AchievementId, announce = true): Promise<void> {
    const m = unlock(this.meta, id);
    if (!m) return;
    this.meta = m;
    await saveMeta(m);
    if (announce) {
      this.hud?.toast(`🏆 ${t(`ach.${id}`)} — ${t(`ach.${id}.desc`)}`, 'info', 5000);
      sfx.play('success');
    }
  }

  async recordAttempt(a: Attempt): Promise<Attempt[]> {
    if (!this.palace) return [];
    this.attempts = await addAttempt(this.palace.id, a);
    this.updateGhostPath();
    return this.attempts;
  }

  updateGhostPath(): void {
    if (!this.world) return;
    const best = [...this.attempts]
      .filter((a) => a.kind === 'recall' && a.order?.length)
      .sort((a, b) => b.score - a.score)[0];
    const order = best?.order ?? this.world.walkOrder().map((l) => l.id);
    const pts = order.map((id) => this.world?.locus(id)?.stand).filter((p): p is THREE.Vector3 => !!p);
    this.ghost.setPath(pts);
  }

  // ------------------------------------------------------------------------------------------ cards / speech
  showCard(c: CardContent | null): void {
    this.currentCard = c;
    if (this.xr?.mode === 'vr') {
      if (c) {
        this.panel.show(c, this.camera);
        this.interactor.setPickables([...(this.world?.hitMeshes ?? []), this.panel.mesh]);
      } else {
        this.panel.hide();
        this.interactor.setPickables(this.world?.hitMeshes ?? []);
      }
    }
    this.hud.showCard(this.xr?.mode === 'vr' ? null : c);
  }

  toast(msg: string, kind: 'info' | 'err' = 'info'): void {
    this.hud.toast(msg, kind);
  }

  async speak(text: string, lang?: Lang): Promise<void> {
    if (!this.settings.tts) return;
    const l = lang ?? this.palace?.language ?? 'en';
    const r = await speak(text, l);
    if ((r === 'no-voice' || r === 'unsupported') && !this.noVoiceWarned) {
      this.noVoiceWarned = true;
      this.hud.toast(
        t(r === 'unsupported' ? 'err.noTts' : 'err.noVoice', { lang: t(`lang.${l}`) }),
        'err',
        5000,
      );
    }
  }

  // ------------------------------------------------------------------------------------------ interaction
  private onHover(id: string | null): void {
    if (this.state === 'palace' && !this.architect) this.world?.setHighlight(id);
    this.canvas.style.cursor = id ? 'pointer' : '';
  }

  private onSelect(id: string, src: PointerSource, point?: THREE.Vector3): void {
    if (id === 'panel') {
      if (point && this.panel.press(point)) sfx.play('click');
      return;
    }
    if (this.state === 'palace' && !this.tour) {
      if (this.architect) return;
      this.learn.open(id, { click: true });
    } else this.exam?.onSelect(id);
    void src;
  }

  private onBackground(): void {
    if (this.state === 'palace' && !this.tour && this.learn.openId) this.learn.close(true);
  }

  setArchitect(on: boolean): void {
    if (on === this.architect) return;
    this.architect = on;
    if (!this.world) return;
    if (on) {
      this.learn.close();
      this.world.setHighlight(null);
      this.interactor.setDraggable(() => true);
      let held: string | null = null;
      this.interactor.handlers = {
        dragStart: (id) => {
          held = id;
          sfx.play('pickup');
          return true;
        },
        dragMove: (id, p) => {
          const l = this.world?.locus(id);
          if (l) l.inst.root.position.set(p.x, Math.max(0.6, p.y), p.z);
        },
        dragEnd: (id, p) => {
          const w = this.world;
          const a = w?.locus(id);
          if (!w || !a) return;
          let best: { id: string; d: number } | null = null;
          for (const o of w.loci) {
            if (o.id === id) continue;
            const d = Math.hypot(o.pos.x - p.x, o.pos.z - p.z);
            if (d < 1.4 && (!best || d < best.d)) best = { id: o.id, d };
          }
          if (best) {
            w.swap(id, best.id);
            sfx.play('place');
            this.sparkles.burst(new THREE.Vector3(p.x, 1.2, p.z), 0x9fb2ff, 30);
            if (this.palace) void savePalace(this.palace);
            this.updateGhostPath();
          } else {
            w.moveLocusVisuals(a);
          }
          held = null;
        },
        hover: () => undefined,
        select: () => undefined,
      };
      void held;
      this.hud.toast(t('hud.architectHelp'), 'info', 5000);
    } else {
      this.interactor.setDraggable(null);
      this.interactor.handlers = {
        hover: (id) => this.onHover(id),
        select: (id, s, p) => this.onSelect(id, s, p),
        background: () => this.onBackground(),
      };
    }
    this.refreshButtons();
  }

  private onKey(e: KeyboardEvent): void {
    const el = e.target as HTMLElement | null;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    if (this.state !== 'palace' || !this.world) {
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'escape') this.learn.close(true);
    else if (k === 'n' || k === 'p') {
      const order = this.world.walkOrder();
      const cur = this.learn.openId ?? this.nearest()?.id ?? null;
      const i = Math.max(
        -1,
        order.findIndex((l) => l.id === cur),
      );
      const next = order[(i + (k === 'n' ? 1 : -1) + order.length) % order.length];
      if (next) this.walkToConcept(next.id, true);
    } else if (k === 'enter' || k === ' ') {
      const n = this.nearest();
      if (n && n.dist < 4) {
        this.learn.open(n.id, { click: true });
        e.preventDefault();
      }
    } else if (k === 't') this.onHudButton('tour');
    else if (k === 'l') this.onHudButton('labels');
  }

  nearest(): { id: string; dist: number } | null {
    if (!this.world) return null;
    const p = this.rig.head();
    let best: { id: string; dist: number } | null = null;
    for (const l of this.world.loci) {
      if (!l.inst.root.visible) continue;
      const d = Math.hypot(l.pos.x - p.x, l.pos.z - p.z);
      if (!best || d < best.dist) best = { id: l.id, dist: d };
    }
    return best;
  }

  // ------------------------------------------------------------------------------------------ movement helpers
  /** Walk (or teleport in XR) to a locus' stand point, then face the object. */
  walkTo(roomIndex: number, stand: Vec2, look: Vec2 | null, done?: () => void): void {
    if (!this.world) return;
    if (this.xr?.presenting) {
      this.rig.setXZ(stand.x, stand.z);
      if (look) this.rig.faceHeading(Math.atan2(look.x - stand.x, look.z - stand.z));
      done?.();
      return;
    }
    const from = this.rig.head();
    const path = pathTo(this.world.layout, { x: from.x, z: from.z }, roomIndex, stand);
    this.mover = { follower: new PathFollower(path, 4.2), look, done: done ?? null };
  }

  walkToConcept(id: string, open: boolean): void {
    const l = this.world?.locus(id);
    if (!l) return;
    this.learn.close();
    this.walkTo(l.roomIndex, { x: l.stand.x, z: l.stand.z }, { x: l.pos.x, z: l.pos.z }, () => {
      if (open) this.learn.open(id, { click: true });
    });
  }

  /** Instantly stand in front of a locus (keyboard jump, tests, VR). */
  teleportToConcept(id: string, open = false): void {
    const l = this.world?.locus(id);
    if (!l) return;
    this.mover = null;
    this.learn.close();
    this.rig.setXZ(l.stand.x, l.stand.z);
    this.rig.faceHeading(Math.atan2(l.pos.x - l.stand.x, l.pos.z - l.stand.z));
    this.rig.setLook(this.rig.yaw, -0.12);
    if (open) this.learn.open(id, { click: true });
  }

  get walking(): boolean {
    return this.mover !== null;
  }

  cancelWalk(): void {
    this.mover = null;
  }

  // ------------------------------------------------------------------------------------------ modes + HUD buttons
  private onHudButton(k: HudButtonKey): void {
    sfx.unlock();
    sfx.play('click');
    switch (k) {
      case 'home':
        void this.showHome();
        break;
      case 'tour':
        this.startTour();
        break;
      case 'skip':
        this.tour?.skip();
        break;
      case 'recall':
        this.recallPicker();
        break;
      case 'exam':
        this.startExam();
        break;
      case 'exit':
        this.endModes();
        break;
      case 'labels':
        this.world?.setLabels(!this.world.labelsVisible);
        this.refreshButtons();
        break;
      case 'night':
        this.settings.night = !this.settings.night;
        this.settingsChanged('none');
        this.refreshButtons();
        break;
      case 'architect':
        this.setArchitect(!this.architect);
        break;
      case 'ghost':
        this.settings.ghost = !this.settings.ghost;
        this.settingsChanged('none');
        this.refreshButtons();
        break;
      case 'settings':
        this.openSettings();
        break;
      case 'vr':
        void this.enterXr('vr');
        break;
      case 'ar':
        void this.enterXr('ar');
        break;
    }
  }

  refreshButtons(): void {
    if (!this.hud) return;
    const on = {
      labels: this.world?.labelsVisible ?? true,
      architect: this.architect,
      ghost: this.settings.ghost,
      tour: !!this.tour,
    };
    if (this.state === 'palace') {
      if (this.tour) this.hud.setButtons(['skip', 'exit'], {});
      else {
        const vis: HudButtonKey[] = [
          'home',
          'tour',
          'recall',
          'exam',
          'labels',
          'night',
          'architect',
          'ghost',
          'settings',
        ];
        if (this.xrSupport.vr) vis.push('vr');
        if (this.xrSupport.ar) vis.push('ar');
        this.hud.setButtons(vis, on);
      }
    } else if (this.state === 'recall' || this.state === 'exam') this.hud.setButtons(['exit'], {});
    this.hud.showSide(this.state === 'palace' && !this.tour);
  }

  private startTour(): void {
    if (!this.world || this.tour) return;
    this.learn.close();
    this.setArchitect(false);
    this.tour = new TourRun(this);
    this.tour.start();
    this.refreshButtons();
  }

  endTour(): void {
    this.tour = null;
    this.refreshButtons();
  }

  private recallPicker(): void {
    if (!this.world || !this.palace) return;
    this.learn.close();
    this.setArchitect(false);
    const p = this.palace;
    const here = regionAt(this.world.layout, this.rig.head().x, this.rig.head().z, 0);
    const close = openModal(
      this.ui,
      h('h2', { text: `🧩 ${t('recall.title')}` }),
      h('p', { class: 'muted', text: t('recall.instructions') }),
      h(
        'div',
        { class: 'palace-list' },
        ...p.rooms.map((r, i) =>
          h(
            'div',
            { class: 'palace-item' },
            h(
              'div',
              { class: 'grow' },
              h('b', { text: `${i + 1}. ${r.topic}` }),
              h('span', {
                class: 'muted',
                style: { fontSize: '0.75rem' },
                text: `${r.concepts.length} ${t('home.concepts')}${here?.kind === 'room' && here.index === i ? ` · 📍 ${t('recall.here')}` : ''}`,
              }),
            ),
            h('button', {
              class: 'btn small primary',
              text: t('recall.start'),
              on: { click: () => (close(), this.startRecall([i])) },
            }),
          ),
        ),
        p.rooms.length > 1
          ? h(
              'div',
              { class: 'palace-item' },
              h('div', { class: 'grow' }, h('b', { text: t('recall.allRooms') })),
              h('button', {
                class: 'btn small primary',
                text: t('recall.start'),
                on: { click: () => (close(), this.startRecall(p.rooms.map((_, i) => i))) },
              }),
            )
          : null,
      ),
      h(
        'div',
        { class: 'row', style: { marginTop: '12px', justifyContent: 'flex-end' } },
        h('button', { class: 'btn', text: t('card.close'), on: { click: () => close() } }),
      ),
    );
  }

  startRecall(rooms: number[]): void {
    if (!this.world) return;
    this.stopModes();
    this.state = 'recall';
    this.recall = new RecallRun(this, rooms);
    this.recall.start();
    this.refreshButtons();
  }

  startExam(): void {
    if (!this.world) return;
    this.learn.close();
    this.stopModes();
    this.state = 'exam';
    this.exam = new ExamRun(this);
    this.exam.start();
    this.refreshButtons();
  }

  /** Leave recall/exam/tour and go back to free exploration. */
  endModes(): void {
    this.stopModes();
    this.tour = null;
    this.state = 'palace';
    this.world?.setBadgeMode(false);
    this.world?.setLabels(true);
    this.hud.setTimer(null);
    this.hud.setPrompt(null);
    this.showCard(null);
    this.mover = null;
    this.interactor.setDraggable(null);
    this.interactor.handlers = {
      hover: (id) => this.onHover(id),
      select: (id, s, p) => this.onSelect(id, s, p),
      background: () => this.onBackground(),
    };
    this.refreshButtons();
    this.refreshVisuals();
  }

  // ---- results
  showRecallResults(score: RecallScore, retry: () => void, ghostNote: string | null): void {
    this.state = 'results';
    this.hud.setTimer(null);
    const close = openModal(
      this.ui,
      ...recallResults(
        score,
        this.attempts,
        () => (close(), retry()),
        () => (close(), this.endModes()),
        ghostNote,
      ),
    );
    sfx.play(score.score >= 60 ? 'success' : 'wrong');
  }

  showExamResults(r: ExamResult, retry: () => void): void {
    this.state = 'results';
    this.hud.setTimer(null);
    const titleOf = (id: string): string => this.world?.locus(id)?.concept.title ?? id;
    const makePng = async (): Promise<Blob> => renderResultCard(this.palace?.topic ?? '', r, titleOf);
    const canShare = typeof navigator.canShare === 'function';
    const close = openModal(
      this.ui,
      ...examResults(r, titleOf, this.attempts, {
        canShare,
        onDownload: () =>
          void makePng()
            .then((b) => download('mind-palace-result.png', b))
            .catch(() => this.hud.toast(t('err.generic'), 'err')),
        onShare: () =>
          void makePng()
            .then((b) => {
              const file = new File([b], 'mind-palace-result.png', { type: 'image/png' });
              if (navigator.canShare?.({ files: [file] }))
                return navigator.share({ files: [file], title: 'Mind Palace' });
              download('mind-palace-result.png', b);
              return undefined;
            })
            .catch(() => undefined),
        onRetry: () => (close(), retry()),
        onClose: () => (close(), this.endModes()),
      }),
    );
    sfx.play(r.score >= 60 ? 'success' : 'wrong');
  }

  // ------------------------------------------------------------------------------------------ XR
  private async enterXr(mode: XrMode): Promise<void> {
    if (!this.xr) return;
    try {
      await this.xr.enter(mode);
    } catch (e) {
      this.hud.toast(`${t('err.xr')}${e instanceof Error ? ` (${e.message})` : ''}`, 'err', 6000);
    }
  }

  private onXrStart(mode: XrMode): void {
    this.rig.setXr(true);
    this.controllers?.setActive(mode === 'vr');
    this.touch.show(false);
    this.world?.setPassthrough(mode === 'ar');
    this.scene.background = null;
    if (this.currentCard) this.showCard(this.currentCard);
  }

  private onXrEnd(_mode: XrMode): void {
    this.rig.setXr(false);
    this.controllers?.setActive(false);
    this.world?.setPassthrough(false);
    this.panel.hide();
    this.interactor.setPickables(this.world?.hitMeshes ?? []);
    this.touch.show(isTouchDevice() && this.state !== 'home');
    this.resize();
    if (this.currentCard) this.hud.showCard(this.currentCard);
  }

  private vrMenu(): void {
    if (this.panel.visible) {
      this.showCard(null);
      return;
    }
    if (this.state !== 'palace') {
      this.showCard({
        id: 'vr-exit',
        title: t('hud.exitMode'),
        buttons: [
          { label: t('hud.exitMode'), kind: 'bad', onClick: () => (this.showCard(null), this.endModes()) },
          { label: t('card.close'), onClick: () => this.showCard(null) },
        ],
      });
      return;
    }
    this.showCard({
      id: 'vr-menu',
      title: t('app.name'),
      body: [t('xr.menuHelp')],
      buttons: [
        { label: `🧭 ${t('hud.tour')}`, onClick: () => (this.showCard(null), this.startTour()) },
        {
          label: `🧩 ${t('hud.recall')}`,
          onClick: () => (this.showCard(null), this.startRecall(this.palace?.rooms.map((_, i) => i) ?? [])),
        },
        { label: `📝 ${t('hud.exam')}`, onClick: () => (this.showCard(null), this.startExam()) },
        { label: `✖ ${t('xr.exit')}`, kind: 'bad', onClick: () => void this.xr?.exit() },
      ],
    });
  }

  get inVr(): boolean {
    return this.xr?.mode === 'vr';
  }

  // ------------------------------------------------------------------------------------------ frame loop
  private resize(): void {
    const r = this.renderer;
    if (!r) return;
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    r.setSize(w, hgt, false);
    this.camera.aspect = w / hgt;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, hgt);
    this.bloom?.setSize(w, hgt);
  }

  private frame(): void {
    const r = this.renderer;
    if (!r) return;
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - this.lastT) / 1000);
    this.lastT = nowMs;
    this.elapsed += dt;
    this.frames++;
    const w = this.world;
    if (!w || this.state === 'home' || this.state === 'generating') return;
    const t = this.elapsed;

    // movement
    if (!this.rig.inXr) {
      if (this.mover) this.stepMover(dt);
      else {
        this.desktop.enabled = true;
        this.desktop.update(
          dt,
          w.layout,
          this.touch.axes().fwd || this.touch.axes().strafe ? this.touch : undefined,
        );
      }
    } else this.controllers?.update();

    const head = this.rig.head();
    w.update(t, dt, head);
    this.ghost.update(dt);
    this.sparkles.update(dt);
    this.tour?.update(dt, t);
    this.recall?.update(dt, t);
    this.exam?.update(dt, t);
    if (!this.tour) this.guide.update(t, dt, head, this.rig.heading, 0);
    this.guide.group.visible = !this.tour || true;
    if (this.state === 'palace' && !this.tour) this.exploreTick(dt, head);

    this.hudClock -= dt;
    if (this.hudClock <= 0) {
      this.hudClock = 0.12;
      this.updateHudLive(head);
    }

    const useComposer = this.composer && this.settings.bloom && !r.xr.isPresenting && !this.mobile;
    if (useComposer) this.composer?.render(dt);
    else r.render(this.scene, this.camera);
  }

  private stepMover(dt: number): void {
    const m = this.mover;
    if (!m) return;
    this.desktop.enabled = false;
    m.follower.update(dt);
    this.rig.setXZ(m.follower.pos.x, m.follower.pos.z);
    // smoothly turn toward the heading of travel (or toward the object at the end)
    const target =
      m.follower.done && m.look
        ? Math.atan2(m.look.x - m.follower.pos.x, m.look.z - m.follower.pos.z)
        : m.follower.heading;
    let d = target + Math.PI - this.rig.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.rig.setLook(this.rig.yaw + d * Math.min(1, dt * 7), this.rig.pitch * (1 - Math.min(1, dt * 3)));
    if (m.follower.done && Math.abs(d) < 0.08) {
      this.mover = null;
      this.desktop.enabled = true;
      m.done?.();
    }
  }

  private dwell = 0;
  private dwellId: string | null = null;
  private dismissed: string | null = null;

  private exploreTick(dt: number, head: THREE.Vector3): void {
    const w = this.world;
    if (!w) return;
    const n = this.nearest();
    const open = this.learn.openId;
    if (open) {
      const l = w.locus(open);
      if (l && Math.hypot(l.pos.x - head.x, l.pos.z - head.z) > 4.6 && !this.mover) this.learn.close();
    }
    if (this.dismissed) {
      const l = w.locus(this.dismissed);
      if (!l || Math.hypot(l.pos.x - head.x, l.pos.z - head.z) > 5) this.dismissed = null;
    }
    if (this.architect) {
      this.hud.setPrompt(null);
      return;
    }
    if (!n || n.dist > 4) {
      this.dwell = 0;
      this.hud.setPrompt(open ? null : null);
      this.dwellId = null;
      return;
    }
    const l = w.locus(n.id);
    if (!l) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const to = new THREE.Vector3(l.pos.x - head.x, 0, l.pos.z - head.z).normalize();
    const facing = dir.x * to.x + dir.z * to.z > 0.35;
    if (n.dist < 3 && facing && n.id !== this.dismissed && open !== n.id) {
      this.dwell = this.dwellId === n.id ? this.dwell + dt : 0;
      this.dwellId = n.id;
      if (this.dwell > 0.45 && !this.mover) this.learn.open(n.id, { auto: true });
    } else this.dwell = 0;
    this.hud.setPrompt(
      open ? null : n.dist < 3.4 ? t(this.mobile ? 'hud.tapToOpen' : 'hud.clickToOpen') : null,
    );
  }

  get dismissedId(): string | null {
    return this.dismissed;
  }

  dismiss(id: string | null): void {
    this.dismissed = id;
  }

  private updateHudLive(head: THREE.Vector3): void {
    const w = this.world;
    if (!w) return;
    const region = w.regionAt(head.x, head.z);
    this.hud.setRegion(w.regionName(region, t('hud.foyer')));
    const active = this.learn.openId;
    drawMinimap(
      this.hud.minimap,
      w.layout,
      w.roomAccents,
      w.loci.map((l) => ({
        x: l.pos.x,
        z: l.pos.z,
        freshness: l.inst.getFreshness(),
        active: l.id === active,
        target: this.exam?.targetId === l.id,
      })),
      { x: head.x, z: head.z, heading: this.rig.heading },
      this.settings.ghost ? undefined : undefined,
    );
    if (this.frames % 30 === 0 && this.state === 'palace') this.refreshHud();
  }

  // exposed for e2e/debugging
  get debug(): { frames: number; state: AppState; loci: number } {
    return { frames: this.frames, state: this.state, loci: this.world?.loci.length ?? 0 };
  }
}

export { DEFAULT_SETTINGS };
