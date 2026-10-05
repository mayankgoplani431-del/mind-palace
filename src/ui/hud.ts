import { clear, h } from './dom';
import { t } from '../i18n';
import type { CardButton, CardContent } from './card';
import { masteryRing } from './charts';

export type HudButtonKey =
  | 'home'
  | 'tour'
  | 'recall'
  | 'exam'
  | 'labels'
  | 'night'
  | 'architect'
  | 'ghost'
  | 'settings'
  | 'vr'
  | 'ar'
  | 'exit'
  | 'skip';

export interface QuestItem {
  id: string;
  title: string;
  room: string;
  freshness: number;
}

export interface RingItem {
  label: string;
  pct: number;
  color: string;
}

const LABELS: Record<HudButtonKey, [string, string]> = {
  home: ['🏠', 'hud.home'],
  tour: ['🧭', 'hud.tour'],
  recall: ['🧩', 'hud.recall'],
  exam: ['📝', 'hud.exam'],
  labels: ['🏷️', 'hud.labels'],
  night: ['🌙', 'hud.night'],
  architect: ['🛠️', 'hud.architect'],
  ghost: ['👻', 'hud.ghost'],
  settings: ['⚙️', 'hud.settings'],
  vr: ['🥽', 'hud.enterVR'],
  ar: ['📱', 'hud.enterAR'],
  exit: ['✖', 'hud.exitMode'],
  skip: ['⏭', 'tour.skip'],
};

/** DOM heads-up display: breadcrumb, mode buttons, stats, refresh quests, minimap, prompt, toasts, card host. */
export class Hud {
  readonly el: HTMLElement;
  readonly minimap: HTMLCanvasElement;
  private readonly crumb: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly btns = new Map<HudButtonKey, HTMLButtonElement>();
  private readonly btnRow: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly quests: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly cardHost: HTMLElement;
  private readonly toasts: HTMLElement;
  private readonly left: HTMLElement;
  private currentCard: string | null = null;

  constructor(onButton: (k: HudButtonKey) => void) {
    this.crumb = h('div', { class: 'crumb', attrs: { 'aria-live': 'polite' } });
    this.timer = h('div', { class: 'crumb timer', style: { display: 'none' } });
    this.btnRow = h('div', { class: 'hud-btns', attrs: { role: 'toolbar' } });
    (Object.keys(LABELS) as HudButtonKey[]).forEach((k) => {
      const b = h('button', { class: 'btn small', on: { click: () => onButton(k) } });
      this.btns.set(k, b);
      this.btnRow.append(b);
    });
    this.stats = h('div', { class: 'card stats' });
    this.quests = h('div', { class: 'card quests' });
    this.left = h('div', { class: 'hud-left' }, this.stats, this.quests);
    this.minimap = h('canvas', {
      class: 'minimap',
      attrs: { width: '340', height: '340', 'aria-hidden': 'true' },
    });
    this.prompt = h('div', { class: 'prompt', style: { display: 'none' } });
    this.cardHost = h('div', {
      class: 'concept-card card',
      style: { display: 'none' },
      attrs: { role: 'dialog', 'aria-live': 'polite' },
    });
    this.toasts = h('div', { class: 'toast-host', attrs: { role: 'status' } });
    this.el = h(
      'div',
      { class: 'hud' },
      h('div', { class: 'hud-top' }, this.crumb, this.timer, this.btnRow),
      this.left,
      this.minimap,
      this.prompt,
      this.cardHost,
      this.toasts,
    );
    this.relabel();
  }

  /** Re-apply localized button labels (after a language change). */
  relabel(): void {
    for (const [k, b] of this.btns) {
      const [icon, key] = LABELS[k];
      b.innerHTML = '';
      b.append(h('span', { text: icon }), h('span', { class: 'lbl', text: ` ${t(key)}` }));
      b.setAttribute('aria-label', t(key));
    }
  }

  setButtons(visible: HudButtonKey[], on: Partial<Record<HudButtonKey, boolean>> = {}): void {
    for (const [k, b] of this.btns) {
      b.style.display = visible.includes(k) ? '' : 'none';
      b.classList.toggle('on', !!on[k]);
      b.setAttribute('aria-pressed', on[k] ? 'true' : 'false');
    }
  }

  setNightLabel(night: boolean): void {
    const b = this.btns.get('night');
    if (b) {
      b.innerHTML = '';
      b.append(
        h('span', { text: night ? '☀️' : '🌙' }),
        h('span', { class: 'lbl', text: ` ${night ? t('hud.day') : t('hud.night')}` }),
      );
    }
  }

  setRegion(text: string): void {
    this.crumb.innerHTML = '';
    this.crumb.append(h('span', { text: '📍 ' }), h('b', { text }));
  }

  setTimer(text: string | null): void {
    this.timer.style.display = text ? '' : 'none';
    if (text) this.timer.textContent = text;
  }

  setPrompt(text: string | null): void {
    this.prompt.style.display = text ? '' : 'none';
    if (text && this.prompt.textContent !== text) this.prompt.textContent = text;
  }

  showSide(show: boolean): void {
    this.left.style.display = show ? '' : 'none';
  }

  toast(text: string, kind: 'info' | 'err' = 'info', ms = 3600): void {
    const el = h('div', { class: `toast${kind === 'err' ? ' err' : ''}`, text });
    this.toasts.append(el);
    setTimeout(() => el.remove(), ms);
  }

  setStats(streak: number, rings: RingItem[]): void {
    clear(this.stats);
    this.stats.append(
      h('h3', { text: `🔥 ${t('hud.streak')}: ${streak} ${t('hud.days')}` }),
      h('div', {
        class: 'muted',
        text: t('hud.mastery'),
        style: { fontSize: '0.75rem', marginBottom: '4px' },
      }),
      h('div', { class: 'rings' }, ...rings.map((r) => masteryRing(r.pct, r.label, r.color))),
    );
  }

  setQuests(items: QuestItem[], onPick: (id: string) => void): void {
    clear(this.quests);
    this.quests.append(h('h3', { text: `✨ ${t('hud.quests')}` }));
    if (items.length === 0) {
      this.quests.append(
        h('div', { class: 'muted', text: t('hud.noQuests'), style: { fontSize: '0.8rem' } }),
      );
      return;
    }
    for (const q of items.slice(0, 8)) {
      const dot = h('span', { class: 'dot' });
      dot.style.background = `hsl(${Math.round(q.freshness * 90)} ${40 + q.freshness * 40}% 55%)`;
      this.quests.append(
        h(
          'button',
          { class: 'quest', title: q.room, on: { click: () => onPick(q.id) } },
          dot,
          h('span', { text: q.title }),
          h('span', {
            class: 'muted',
            text: `${Math.round(q.freshness * 100)}%`,
            style: { marginLeft: 'auto' },
          }),
        ),
      );
    }
  }

  // ---------------------------------------------------------------- card host
  get cardId(): string | null {
    return this.currentCard;
  }

  private btn(b: CardButton): HTMLButtonElement {
    const el = h('button', {
      class: `btn small${b.kind && b.kind !== 'plain' ? ` ${b.kind}` : ''}${b.state ? ` opt ${b.state}` : ''}`,
      text: b.label,
      on: { click: b.onClick },
    });
    el.disabled = !!b.disabled;
    return el;
  }

  showCard(c: CardContent | null): void {
    this.currentCard = c?.id ?? null;
    if (!c) {
      this.cardHost.style.display = 'none';
      clear(this.cardHost);
      return;
    }
    clear(this.cardHost);
    const parts: Array<Node | null> = [
      c.eyebrow ? h('div', { class: 'muted', text: c.eyebrow, style: { fontSize: '0.8rem' } }) : null,
      h('h2', { text: c.title }),
      ...(c.body ?? []).map((p) => h('p', { text: p })),
      c.quote ? h('p', { class: 'mnemonic', text: `💡 ${c.quote}` }) : null,
      c.chips?.length
        ? h('div', { class: 'kw' }, ...c.chips.map((k) => h('span', { class: 'chip', text: k })))
        : null,
      ...(c.options ?? []).map((o) => {
        const b = this.btn(o);
        b.classList.add('opt');
        return b;
      }),
      c.buttons?.length
        ? h('div', { class: 'row', style: { marginTop: '8px' } }, ...c.buttons.map((b) => this.btn(b)))
        : null,
      c.footer
        ? h('div', { class: 'muted', text: c.footer, style: { fontSize: '0.8rem', marginTop: '6px' } })
        : null,
    ];
    this.cardHost.append(...parts.filter((p): p is Node => p !== null));
    this.cardHost.style.display = '';
  }
}
