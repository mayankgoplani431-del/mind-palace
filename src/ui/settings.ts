import { h } from './dom';
import { t, UI_LANGS } from '../i18n';
import type { Lang, StyleKey } from '../extract/types';
import type { Settings } from '../storage/db';
import { THEMES } from '../palace/themes';
import { getTimeOffsetDays } from '../learn/clock';

export interface SettingsApi {
  settings: Settings;
  /** Apply + persist; `rebuild` when a change needs the world or home screen re-created. */
  changed(rebuild?: 'ui' | 'world' | 'none'): void;
  timeTravel(days: number | 'reset'): void;
  clearData(): void;
  inPalace: boolean;
}

export function settingsBody(api: SettingsApi, close: () => void): Node[] {
  const s = api.settings;
  const check = (
    key: keyof Settings,
    label: string,
    rebuild: 'ui' | 'world' | 'none' = 'none',
  ): HTMLElement => {
    const i = h('input', { attrs: { type: 'checkbox' } });
    i.checked = Boolean(s[key]);
    i.addEventListener('change', () => {
      (s as unknown as Record<string, unknown>)[key] = i.checked;
      api.changed(rebuild);
    });
    return h(
      'label',
      { class: 'row', style: { gap: '10px', padding: '4px 0' } },
      i,
      h('span', { text: label }),
    );
  };

  const uiLang = h('select', { attrs: { 'aria-label': t('settings.uiLang') } });
  UI_LANGS.forEach((l) => {
    const o = h('option', { text: l.label, attrs: { value: l.code } });
    if (l.code === s.uiLang) o.selected = true;
    uiLang.append(o);
  });
  uiLang.addEventListener('change', () => {
    s.uiLang = uiLang.value as Lang;
    api.changed('ui');
  });

  const style = h('select', { attrs: { 'aria-label': t('settings.theme') } });
  (['auto', 'temple', 'lab', 'zen'] as Array<StyleKey | 'auto'>).forEach((k) => {
    const o = h('option', {
      text: k === 'auto' ? t('lang.auto') : THEMES[k].name[s.uiLang],
      attrs: { value: k },
    });
    if (k === s.style) o.selected = true;
    style.append(o);
  });
  style.addEventListener('change', () => {
    s.style = style.value as StyleKey | 'auto';
    api.changed('none');
  });

  const fs = h('input', {
    attrs: { type: 'range', min: '0.85', max: '1.6', step: '0.05', 'aria-label': t('settings.fontSize') },
  });
  fs.value = String(s.fontScale);
  fs.addEventListener('input', () => {
    s.fontScale = Number(fs.value);
    api.changed('none');
  });

  const offset = h('span', { class: 'chip', text: `${t('settings.timeOffset')}: +${getTimeOffsetDays()}d` });
  const tt = (d: number | 'reset', label: string): HTMLElement =>
    h('button', {
      class: 'btn small',
      text: label,
      on: {
        click: () => {
          api.timeTravel(d);
          offset.textContent = `${t('settings.timeOffset')}: +${getTimeOffsetDays()}d`;
        },
      },
    });

  return [
    h('h2', { text: `⚙️ ${t('hud.settings')}` }),
    h('label', { class: 'field' }, t('settings.uiLang'), uiLang),
    h('label', { class: 'field', style: { marginTop: '8px' } }, t('settings.theme'), style),
    check('night', t('settings.night'), 'world'),
    check('mute', t('settings.sound')),
    check('tts', t('settings.tts')),
    check('reducedMotion', t('settings.reducedMotion'), 'world'),
    check('highContrast', t('settings.highContrast')),
    check('bloom', t('settings.bloom')),
    check('gyro', t('settings.gyro')),
    check('ghost', t('settings.ghost'), 'world'),
    h('label', { class: 'field', style: { marginTop: '8px' } }, t('settings.fontSize'), fs),
    h(
      'div',
      { class: 'card', style: { marginTop: '12px', borderStyle: 'dashed' } },
      h('h3', { text: `🧪 ${t('settings.debug')}` }),
      h('p', { class: 'muted', text: t('settings.timeHelp'), style: { fontSize: '0.85rem' } }),
      h(
        'div',
        { class: 'row' },
        tt(1, '+1 day'),
        tt(7, '+7 days'),
        tt(30, '+30 days'),
        tt('reset', t('settings.reset')),
        offset,
      ),
    ),
    h('p', { class: 'note', text: t('home.keyPrivacy'), style: { marginTop: '12px' } }),
    h(
      'div',
      { class: 'row', style: { marginTop: '12px', justifyContent: 'space-between' } },
      h('button', {
        class: 'btn small bad',
        text: `🗑 ${t('settings.clear')}`,
        on: { click: () => confirm(t('settings.clearConfirm')) && api.clearData() },
      }),
      h('button', { class: 'btn primary', text: t('card.close'), on: { click: close } }),
    ),
  ];
}
