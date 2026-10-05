import type { ExamResult } from '../modes/exam';
import { drawLabel, font, ensureFonts, wrapText } from '../palace/labels';
import { t } from '../i18n';

/** Renders the shareable exam result as a PNG blob (1080x1350, no external assets). */
export async function renderResultCard(
  topic: string,
  r: ExamResult,
  titleOf: (id: string) => string,
): Promise<Blob> {
  await ensureFonts();
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  if (!x) throw new Error('Canvas not available');
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1b2350');
  g.addColorStop(1, '#0b1020');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // stars
  for (let i = 0; i < 120; i++) {
    x.fillStyle = `rgba(255,255,255,${0.1 + ((i * 37) % 10) / 25})`;
    x.fillRect((i * 997) % W, (i * 463) % H, 2, 2);
  }
  x.textAlign = 'center';
  x.fillStyle = '#9fb2ff';
  x.font = font(40);
  x.fillText('MIND PALACE', W / 2, 110);
  x.fillStyle = '#ffffff';
  x.font = font(58);
  const lines = wrapText(x, topic, W - 160, 2);
  lines.forEach((ln, i) => x.fillText(ln, W / 2, 200 + i * 70));

  // score ring
  const cx = W / 2;
  const cy = 480;
  x.lineWidth = 34;
  x.strokeStyle = 'rgba(255,255,255,0.12)';
  x.beginPath();
  x.arc(cx, cy, 160, 0, Math.PI * 2);
  x.stroke();
  x.strokeStyle = r.score >= 80 ? '#4ade80' : r.score >= 50 ? '#fbbf24' : '#f87171';
  x.lineCap = 'round';
  x.beginPath();
  x.arc(cx, cy, 160, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * r.score) / 100);
  x.stroke();
  x.fillStyle = '#fff';
  x.font = font(120);
  x.fillText(String(r.score), cx, cy + 40);
  x.font = font(34, 400);
  x.fillStyle = '#a3aed6';
  x.fillText(`${r.correct}/${r.total} · ${Math.round(r.timeSec)}s`, cx, cy + 105);

  // per-concept rows
  x.textAlign = 'left';
  let y = 720;
  x.font = font(34);
  x.fillStyle = '#9fb2ff';
  x.fillText(t('exam.perConcept'), 90, y);
  y += 30;
  for (const a of r.perConcept.slice(0, 8)) {
    y += 62;
    x.fillStyle = a.correct ? '#4ade80' : '#f87171';
    x.beginPath();
    x.arc(110, y - 12, 14, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fff';
    x.font = font(34, 400);
    const label = wrapText(x, titleOf(a.conceptId), W - 300, 1)[0] ?? '';
    x.fillText(label, 150, y);
    x.fillStyle = '#a3aed6';
    x.textAlign = 'right';
    x.fillText(a.chosen < 0 ? '—' : `${(a.ms / 1000).toFixed(1)}s`, W - 90, y);
    x.textAlign = 'left';
  }
  if (r.weakest.length) {
    y += 90;
    x.fillStyle = '#fbbf24';
    x.font = font(32);
    const weak = r.weakest.map(titleOf).join(' · ');
    x.fillText(`${t('exam.weakest')}:`, 90, y);
    x.fillStyle = '#fff';
    x.font = font(30, 400);
    wrapText(x, weak, W - 180, 2).forEach((ln, i) => x.fillText(ln, 90, y + 46 + i * 40));
  }
  x.textAlign = 'center';
  x.fillStyle = '#6f7bb8';
  x.font = font(28, 400);
  x.fillText(new Date().toLocaleDateString(), W / 2, H - 50);
  void drawLabel;
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('PNG export failed'))), 'image/png'),
  );
}
