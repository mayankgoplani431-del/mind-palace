import * as THREE from 'three';

const FONT_STACK = '"Noto Sans", "Noto Sans Devanagari", system-ui, sans-serif';

let fontsReady: Promise<void> | null = null;

/** Canvas text only uses a web font once it is loaded; Devanagari needs an explicit load. */
export function ensureFonts(): Promise<void> {
  if (!fontsReady) {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    fontsReady = fonts
      ? Promise.all([
          fonts.load('700 40px "Noto Sans"', 'Aa'),
          fonts.load('400 40px "Noto Sans"', 'Aa'),
          fonts.load('700 40px "Noto Sans Devanagari"', 'अआ'),
          fonts.load('400 40px "Noto Sans Devanagari"', 'अआ'),
        ]).then(
          () => undefined,
          () => undefined,
        )
      : Promise.resolve();
  }
  return fontsReady;
}

export function font(px: number, weight = 700): string {
  return `${weight} ${px}px ${FONT_STACK}`;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1]?.replace(/\s*\S*$/, '…') ?? '…';
    return kept;
  }
  return lines;
}

export interface LabelOpts {
  width?: number;
  height?: number;
  fontPx?: number;
  color?: string;
  bg?: string;
  border?: string;
  badge?: string;
  maxLines?: number;
  /** World height of the sprite in metres. */
  worldHeight?: number;
}

/** Draws a rounded pill label on a canvas; returns the canvas (for textures and sprite materials). */
export function drawLabel(text: string, o: LabelOpts = {}): HTMLCanvasElement {
  const W = o.width ?? 512;
  const H = o.height ?? 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const r = H / 2.6;
  ctx.fillStyle = o.bg ?? 'rgba(14,20,48,0.82)';
  ctx.strokeStyle = o.border ?? 'rgba(160,175,255,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, H - 8, r);
  ctx.fill();
  ctx.stroke();
  const px = o.fontPx ?? 46;
  ctx.font = font(px);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = o.color ?? '#ffffff';
  const padL = o.badge ? H * 0.9 : 28;
  const lines = wrapText(ctx, text, W - padL - 28, o.maxLines ?? 2);
  const lh = px * 1.22;
  const y0 = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, padL + (W - padL - 28) / 2, y0 + i * lh));
  if (o.badge) {
    ctx.fillStyle = o.border ?? '#8b7bff';
    ctx.beginPath();
    ctx.arc(H * 0.5, H / 2, H * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b1020';
    ctx.font = font(px * 0.95);
    ctx.fillText(o.badge, H * 0.5, H / 2 + 2);
  }
  return canvas;
}

export function makeLabelSprite(text: string, o: LabelOpts = {}): THREE.Sprite {
  const canvas = drawLabel(text, o);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
  const s = new THREE.Sprite(mat);
  const h = o.worldHeight ?? 0.34;
  s.scale.set((h * canvas.width) / canvas.height, h, 1);
  s.renderOrder = 10;
  return s;
}

export function disposeSprite(s: THREE.Sprite): void {
  s.material.map?.dispose();
  s.material.dispose();
}
