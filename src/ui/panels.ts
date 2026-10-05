import { clear, h } from './dom';
import { t, UI_LANGS } from '../i18n';
import type { Lang, LangChoice, PalaceData, StyleKey } from '../extract/types';
import type { Attempt, Meta, Settings } from '../storage/db';
import { SAMPLES } from '../input/samples';
import { detectLanguage } from '../input/language-detect';
import { DEFAULT_MODELS, type Provider } from '../extract/llm/common';
import { THEMES } from '../palace/themes';
import { historyChart } from './charts';
import type { ExamResult } from '../modes/exam';
import type { RecallScore } from '../modes/recall';
import { ACHIEVEMENTS } from '../learn/achievements';

export interface HomeApi {
  settings: Settings;
  meta: Meta;
  palaces: PalaceData[];
  draft: { text: string };
  saveSettings(): void;
  setUiLang(l: Lang): void;
  openSettings(): void;
  generate(text: string): void;
  loadFile(file: File): Promise<string | null>;
  openPalace(p: PalaceData): void;
  deletePalace(p: PalaceData): void;
  exportPalace(p: PalaceData): void;
  importPalace(): void;
  sharePalace(p: PalaceData): void;
  masteryOf(p: PalaceData): Promise<number>;
}

const STYLE_KEYS: Array<StyleKey | 'auto'> = ['auto', 'temple', 'lab', 'zen'];

export function renderHome(api: HomeApi, error?: string): HTMLElement {
  const s = api.settings;
  const ta = h('textarea', {
    attrs: { placeholder: t('home.paste'), 'aria-label': t('home.notes'), spellcheck: 'false', lang: '' },
  });
  ta.value = api.draft.text;
  const info = h('div', { class: 'row muted', style: { fontSize: '0.8rem' } });
  const updateInfo = (): void => {
    api.draft.text = ta.value;
    clear(info);
    const n = ta.value.trim().length;
    info.append(h('span', { text: t('home.chars', { n }) }));
    if (n > 20) {
      const l = s.langChoice === 'auto' ? detectLanguage(ta.value) : s.langChoice;
      info.append(h('span', { class: 'chip', text: `${t('home.detected')}: ${t(`lang.${l}`)}` }));
    }
  };
  ta.addEventListener('input', updateInfo);
  updateInfo();

  const fileMsg = h('span', { class: 'muted', style: { fontSize: '0.8rem' } });
  const upload = h('button', {
    class: 'btn small',
    text: `📄 ${t('home.upload')}`,
    on: {
      click: () => {
        const input = h('input', {
          attrs: { type: 'file', accept: '.txt,.md,.markdown,.pdf,text/plain,application/pdf' },
          style: { display: 'none' },
        });
        input.addEventListener('change', async () => {
          const f = input.files?.[0];
          input.remove();
          if (!f) return;
          fileMsg.textContent = t('home.reading', { name: f.name });
          const text = await api.loadFile(f);
          fileMsg.textContent = text ? t('home.loaded', { name: f.name }) : '';
          if (text) {
            ta.value = text;
            updateInfo();
          }
        });
        document.body.append(input);
        input.click();
      },
    },
  });

  const samples = h(
    'div',
    { class: 'row' },
    h('span', { class: 'muted', text: `${t('home.samples')}:`, style: { fontSize: '0.85rem' } }),
    ...SAMPLES.map((sm) =>
      h('button', {
        class: 'btn small',
        text: sm.label[s.uiLang],
        on: {
          click: () => {
            ta.value = sm.text;
            updateInfo();
          },
        },
      }),
    ),
  );

  const langSel = h('select', { attrs: { 'aria-label': t('home.noteLang') } });
  (['auto', 'en', 'hi', 'mr'] as LangChoice[]).forEach((l) => {
    const o = h('option', { text: l === 'auto' ? t('lang.auto') : t(`lang.${l}`), attrs: { value: l } });
    if (l === s.langChoice) o.selected = true;
    langSel.append(o);
  });
  langSel.addEventListener('change', () => {
    s.langChoice = langSel.value as LangChoice;
    api.saveSettings();
    updateInfo();
  });

  const styleSel = h('select', { attrs: { 'aria-label': t('home.style') } });
  STYLE_KEYS.forEach((k) => {
    const o = h('option', {
      text: k === 'auto' ? t('lang.auto') : THEMES[k].name[s.uiLang],
      attrs: { value: k },
    });
    if (k === s.style) o.selected = true;
    styleSel.append(o);
  });
  styleSel.addEventListener('change', () => {
    s.style = styleSel.value as StyleKey | 'auto';
    api.saveSettings();
  });

  // engine
  const aiBox = h('div', { class: 'grid2', style: { gap: '8px', display: s.useLlm ? '' : 'none' } });
  const provider = h('select', { attrs: { 'aria-label': t('home.provider') } });
  (['anthropic', 'openai', 'gemini'] as Provider[]).forEach((p) => {
    const o = h('option', {
      text: { anthropic: 'Anthropic (Claude)', openai: 'OpenAI', gemini: 'Google Gemini' }[p],
      attrs: { value: p },
    });
    if (p === s.provider) o.selected = true;
    provider.append(o);
  });
  const model = h('input', {
    attrs: { type: 'text', list: 'models', 'aria-label': t('home.model'), autocomplete: 'off' },
  });
  model.value = s.model;
  const modelList = h('datalist', { attrs: { id: 'models' } });
  const fillModels = (): void => {
    clear(modelList);
    DEFAULT_MODELS[s.provider].forEach((m) => modelList.append(h('option', { attrs: { value: m } })));
  };
  fillModels();
  provider.addEventListener('change', () => {
    s.provider = provider.value as Provider;
    s.model = DEFAULT_MODELS[s.provider][0] as string;
    model.value = s.model;
    fillModels();
    api.saveSettings();
  });
  model.addEventListener('input', () => {
    s.model = model.value.trim();
    api.saveSettings();
  });
  const key = h('input', {
    attrs: {
      type: 'password',
      autocomplete: 'off',
      placeholder: 'API key',
      'aria-label': t('home.apiKey'),
      spellcheck: 'false',
    },
  });
  key.value = s.apiKey;
  key.addEventListener('input', () => {
    s.apiKey = key.value.trim();
    api.saveSettings();
  });
  aiBox.append(
    h('label', { class: 'field' }, t('home.provider'), provider),
    h('label', { class: 'field' }, t('home.model'), model, modelList),
    h('label', { class: 'field', style: { gridColumn: '1 / -1' } }, t('home.apiKey'), key),
    h('div', { class: 'note', style: { gridColumn: '1 / -1' }, text: t('home.keyPrivacy') }),
  );
  const engine = (use: boolean): void => {
    s.useLlm = use;
    aiBox.style.display = use ? '' : 'none';
    api.saveSettings();
  };
  const radio = (use: boolean, label: string): HTMLElement => {
    const r = h('input', { attrs: { type: 'radio', name: 'engine' } });
    r.checked = s.useLlm === use;
    r.addEventListener('change', () => engine(use));
    return h('label', { class: 'chip', style: { cursor: 'pointer' } }, r, label);
  };

  const gen = h('button', {
    class: 'btn primary',
    text: `✨ ${t('home.generate')}`,
    on: { click: () => api.generate(ta.value) },
  });

  const notesCard = h(
    'section',
    { class: 'card' },
    h('h2', { text: `📚 ${t('home.notes')}` }),
    ta,
    info,
    h('div', { class: 'row', style: { margin: '8px 0' } }, upload, fileMsg),
    samples,
    h(
      'div',
      { class: 'grid2', style: { margin: '12px 0 8px', gap: '8px' } },
      h('label', { class: 'field' }, t('home.noteLang'), langSel),
      h('label', { class: 'field' }, t('home.style'), styleSel),
    ),
    h(
      'div',
      { class: 'row', style: { marginBottom: '8px' } },
      h('span', { class: 'muted', text: `${t('home.engine')}:` }),
      radio(false, `🛡️ ${t('home.engine.offline')}`),
      radio(true, `🤖 ${t('home.engine.ai')}`),
    ),
    aiBox,
    error ? h('p', { class: 'err', text: error, attrs: { role: 'alert' } }) : null,
    h('div', { class: 'row', style: { marginTop: '12px' } }, gen),
  );

  // palaces + meta
  const list = h('div', { class: 'palace-list' });
  if (api.palaces.length === 0) list.append(h('p', { class: 'muted', text: t('home.noPalaces') }));
  for (const p of api.palaces) {
    const sub = h('span', {
      class: 'muted',
      style: { fontSize: '0.75rem' },
      text: `${p.rooms.length} ${t('home.rooms')} · ${p.rooms.reduce((n, r) => n + r.concepts.length, 0)} ${t('home.concepts')} · ${t(`lang.${p.language}`)} · …`,
    });
    void api
      .masteryOf(p)
      .then(
        (m) =>
          (sub.textContent = `${p.rooms.length} ${t('home.rooms')} · ${p.rooms.reduce((n, r) => n + r.concepts.length, 0)} ${t('home.concepts')} · ${t(`lang.${p.language}`)} · ${m}%`),
      );
    list.append(
      h(
        'div',
        { class: 'palace-item' },
        h('div', { class: 'grow' }, h('b', { text: p.topic }), sub),
        h('button', {
          class: 'btn small primary',
          text: t('home.resume'),
          on: { click: () => api.openPalace(p) },
        }),
        h('button', {
          class: 'btn small',
          title: t('home.export'),
          text: '⬇',
          attrs: { 'aria-label': t('home.export') },
          on: { click: () => api.exportPalace(p) },
        }),
        h('button', {
          class: 'btn small',
          title: t('home.share'),
          text: '🔗',
          attrs: { 'aria-label': t('home.share') },
          on: { click: () => api.sharePalace(p) },
        }),
        h('button', {
          class: 'btn small bad',
          title: t('home.delete'),
          text: '🗑',
          attrs: { 'aria-label': t('home.delete') },
          on: { click: () => api.deletePalace(p) },
        }),
      ),
    );
  }
  const palacesCard = h(
    'section',
    { class: 'card' },
    h('h2', { text: `🏛️ ${t('home.myPalaces')}` }),
    list,
    h(
      'div',
      { class: 'row', style: { marginTop: '10px' } },
      h('button', {
        class: 'btn small',
        text: `⬆ ${t('home.import')}`,
        on: { click: () => api.importPalace() },
      }),
    ),
  );

  const ach = h('div', { class: 'row' });
  for (const a of ACHIEVEMENTS) {
    const got = api.meta.achievements[a.id];
    ach.append(
      h('span', {
        class: 'chip',
        title: t(`ach.${a.id}.desc`),
        style: { opacity: got ? '1' : '0.45' },
        text: `${a.icon} ${t(`ach.${a.id}`)}`,
      }),
    );
  }
  const metaCard = h(
    'section',
    { class: 'card' },
    h('h2', { text: `🔥 ${t('hud.streak')}: ${api.meta.streak} ${t('hud.days')}` }),
    ach,
  );

  const how = h(
    'section',
    { class: 'card' },
    h('h2', { text: `💡 ${t('home.howTitle')}` }),
    h(
      'ol',
      { style: { margin: '0', paddingLeft: '1.2em' } },
      h('li', { text: t('home.how1') }),
      h('li', { text: t('home.how2') }),
      h('li', { text: t('home.how3') }),
    ),
  );

  const lang = h(
    'div',
    { class: 'row', attrs: { role: 'group', 'aria-label': t('settings.uiLang') } },
    ...UI_LANGS.map((l) =>
      h('button', {
        class: `btn small${l.code === s.uiLang ? ' on' : ''}`,
        text: l.label,
        attrs: { 'aria-pressed': String(l.code === s.uiLang) },
        on: { click: () => api.setUiLang(l.code) },
      }),
    ),
    h('button', {
      class: 'btn small',
      text: `⚙️ ${t('hud.settings')}`,
      on: { click: () => api.openSettings() },
    }),
  );

  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'wrap' },
      h(
        'div',
        { class: 'brand' },
        h('img', { attrs: { src: `${import.meta.env.BASE_URL}icons/icon-192.png`, alt: '' } }),
        h('div', {}, h('h1', { text: t('app.name') }), h('div', { class: 'sub', text: t('app.tagline') })),
        h('div', { class: 'spacer' }),
        lang,
      ),
      h(
        'div',
        { class: 'grid2' },
        notesCard,
        h(
          'div',
          { style: { display: 'grid', gap: '16px', alignContent: 'start' } },
          palacesCard,
          metaCard,
          how,
        ),
      ),
    ),
  );
}

// ------------------------------------------------------------------------------------------------
// overlays
// ------------------------------------------------------------------------------------------------

export function openModal(host: HTMLElement, ...content: Array<Node | null>): () => void {
  const modal = h(
    'div',
    { class: 'modal card', attrs: { role: 'dialog', 'aria-modal': 'true' } },
    ...content,
  );
  const back = h('div', { class: 'modal-back', on: { click: (e) => e.target === back && close() } }, modal);
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  function close(): void {
    window.removeEventListener('keydown', onKey);
    back.remove();
  }
  window.addEventListener('keydown', onKey);
  host.append(back);
  modal.querySelector<HTMLElement>('button, input, select')?.focus();
  return close;
}

export function generatingOverlay(): { el: HTMLElement; set(done: number, total: number): void } {
  const bar = h('div', {});
  const msg = h('p', { class: 'muted', text: t('gen.working', { n: 1, total: '…' }) });
  const el = h(
    'div',
    { class: 'modal-back' },
    h(
      'div',
      { class: 'modal card', attrs: { role: 'status' } },
      h('h2', { text: `🏗️ ${t('gen.title')}` }),
      msg,
      h('div', { class: 'bar' }, bar),
    ),
  );
  return {
    el,
    set(done, total) {
      bar.style.width = `${Math.round((done / Math.max(1, total)) * 100)}%`;
      msg.textContent = t('gen.working', { n: Math.min(done + 1, total), total });
    },
  };
}

export function scoreRing(score: number): HTMLElement {
  const col = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';
  const el = h('div', {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: '130px',
      height: '130px',
      borderRadius: '50%',
      margin: '0 auto',
      fontSize: '2.4rem',
      fontWeight: '800',
    },
    text: String(score),
  });
  el.style.background = `conic-gradient(${col} ${score * 3.6}deg, rgba(255,255,255,0.12) 0)`;
  const inner = h('div', {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: '104px',
      height: '104px',
      borderRadius: '50%',
      background: 'var(--panel-solid)',
    },
    text: String(score),
  });
  el.textContent = '';
  el.append(inner);
  return el;
}

export function recallResults(
  s: RecallScore,
  attempts: Attempt[],
  onRetry: () => void,
  onClose: () => void,
  ghostNote: string | null,
): Array<Node | null> {
  return [
    h('h2', { text: `🧩 ${t('recall.done')}` }),
    scoreRing(s.score),
    h(
      'div',
      { class: 'row', style: { justifyContent: 'center', margin: '10px 0' } },
      h('span', { class: 'chip', text: `${t('recall.accuracy')}: ${Math.round(s.accuracy * 100)}%` }),
      h('span', { class: 'chip', text: `${t('recall.time')}: ${s.timeSec.toFixed(0)}s` }),
      h('span', { class: 'chip', text: `${t('recall.hints')}: ${s.hints}` }),
      s.perfect ? h('span', { class: 'chip', text: `🏆 ${t('ach.perfect_recall')}` }) : null,
    ),
    ghostNote ? h('p', { class: 'note', text: ghostNote }) : null,
    h('h3', { text: t('recall.history') }),
    historyChart(attempts),
    h(
      'div',
      { class: 'row', style: { marginTop: '12px', justifyContent: 'flex-end' } },
      h('button', { class: 'btn', text: t('recall.retry'), on: { click: onRetry } }),
      h('button', { class: 'btn primary', text: t('card.close'), on: { click: onClose } }),
    ),
  ];
}

export function examResults(
  r: ExamResult,
  titleOf: (id: string) => string,
  attempts: Attempt[],
  actions: { onDownload(): void; onShare(): void; onRetry(): void; onClose(): void; canShare: boolean },
): Array<Node | null> {
  const rows = r.perConcept.map((a) =>
    h(
      'tr',
      { style: r.weakest.includes(a.conceptId) ? { background: 'rgba(248,113,113,0.15)' } : {} },
      h('td', { text: a.correct ? '✅' : a.chosen < 0 ? '⏱' : '❌' }),
      h('td', { text: titleOf(a.conceptId) }),
      h('td', { text: a.chosen < 0 ? '—' : `${(a.ms / 1000).toFixed(1)}s` }),
    ),
  );
  return [
    h('h2', { text: `📝 ${t('exam.results')}` }),
    scoreRing(r.score),
    h(
      'div',
      { class: 'row', style: { justifyContent: 'center', margin: '10px 0' } },
      h('span', { class: 'chip', text: `${r.correct}/${r.total}` }),
      h('span', { class: 'chip', text: `⏱ ${r.timeSec.toFixed(0)}s / ${r.limitSec}s` }),
    ),
    r.weakest.length
      ? h('p', { class: 'note', text: `${t('exam.weakest')}: ${r.weakest.map(titleOf).join(' · ')}` })
      : null,
    h('table', { class: 't' }, h('tbody', {}, ...rows)),
    h('h3', { text: t('recall.history'), style: { marginTop: '12px' } }),
    historyChart(attempts),
    h(
      'div',
      { class: 'row', style: { marginTop: '12px', justifyContent: 'flex-end' } },
      h('button', { class: 'btn', text: `🖼️ ${t('exam.download')}`, on: { click: actions.onDownload } }),
      actions.canShare
        ? h('button', { class: 'btn', text: `📤 ${t('exam.share')}`, on: { click: actions.onShare } })
        : null,
      h('button', { class: 'btn', text: t('recall.retry'), on: { click: actions.onRetry } }),
      h('button', { class: 'btn primary', text: t('card.close'), on: { click: actions.onClose } }),
    ),
  ];
}
