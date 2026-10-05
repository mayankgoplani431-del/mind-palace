import type { Attempt } from '../storage/db';
import { t } from '../i18n';

const NS = 'http://www.w3.org/2000/svg';

function svg(tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** Score history line chart (0-100) for recall/exam attempts. */
export function historyChart(attempts: Attempt[], w = 420, h = 150): SVGElement {
  const root = svg('svg', {
    viewBox: `0 0 ${w} ${h}`,
    width: '100%',
    role: 'img',
    'aria-label': t('chart.history'),
  });
  const padL = 28;
  const padB = 20;
  const innerW = w - padL - 10;
  const innerH = h - padB - 10;
  for (const g of [0, 50, 100]) {
    const y = 10 + innerH * (1 - g / 100);
    root.append(svg('line', { x1: padL, x2: w - 10, y1: y, y2: y, stroke: 'rgba(160,175,255,0.25)' }));
    const txt = svg('text', { x: 4, y: y + 4, fill: '#a3aed6', 'font-size': 10 });
    txt.textContent = String(g);
    root.append(txt);
  }
  if (attempts.length === 0) {
    const txt = svg('text', {
      x: w / 2,
      y: h / 2,
      fill: '#a3aed6',
      'font-size': 12,
      'text-anchor': 'middle',
    });
    txt.textContent = t('chart.empty');
    root.append(txt);
    return root;
  }
  const pts = attempts.map((a, i) => ({
    x: padL + (attempts.length === 1 ? innerW / 2 : (innerW * i) / (attempts.length - 1)),
    y: 10 + innerH * (1 - a.score / 100),
    a,
  }));
  root.append(
    svg('polyline', {
      points: pts.map((p) => `${p.x},${p.y}`).join(' '),
      fill: 'none',
      stroke: '#8b7bff',
      'stroke-width': 2.5,
    }),
  );
  for (const p of pts) {
    const c = svg('circle', { cx: p.x, cy: p.y, r: 4, fill: p.a.kind === 'exam' ? '#fbbf24' : '#22d3ee' });
    const title = svg('title', {});
    title.textContent = `${p.a.kind} · ${p.a.score} · ${new Date(p.a.at).toLocaleDateString()}`;
    c.append(title);
    root.append(c);
  }
  return root;
}

/** Circular mastery ring (0..100). */
export function masteryRing(pct: number, label: string, color = '#22d3ee'): HTMLElement {
  const r = 20;
  const c = 2 * Math.PI * r;
  const wrap = document.createElement('div');
  wrap.className = 'ring';
  wrap.title = `${label}: ${pct}%`;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', `${label}: ${pct}%`);
  const s = svg('svg', { viewBox: '0 0 52 52' });
  s.append(
    svg('circle', { cx: 26, cy: 26, r, fill: 'none', stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 6 }),
  );
  s.append(
    svg('circle', {
      cx: 26,
      cy: 26,
      r,
      fill: 'none',
      stroke: color,
      'stroke-width': 6,
      'stroke-linecap': 'round',
      'stroke-dasharray': `${(c * pct) / 100} ${c}`,
    }),
  );
  const span = document.createElement('span');
  span.textContent = `${pct}%`;
  wrap.append(s, span);
  return wrap;
}
