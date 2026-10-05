import type { Layout } from './layout';
import { CORRIDOR_WIDTH } from './layout';

export interface MiniLocus {
  x: number;
  z: number;
  /** 0..1 */
  freshness: number;
  active: boolean;
  target: boolean;
}

/** Draws the top-down map: foyer, rooms, corridors, loci dots (colour = freshness) and the player arrow. */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  layout: Layout,
  accents: number[],
  loci: MiniLocus[],
  player: { x: number; z: number; heading: number },
  ghost?: Array<{ x: number; z: number }>,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const k = (W / 2 - 6) / (layout.extent + 2);
  const sx = (x: number): number => W / 2 + x * k;
  const sz = (z: number): number => W / 2 + z * k;
  ctx.clearRect(0, 0, W, W);
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(120,135,220,0.35)';
  for (const c of layout.corridors) {
    ctx.strokeStyle = 'rgba(120,135,220,0.45)';
    ctx.lineWidth = CORRIDOR_WIDTH * k;
    ctx.beginPath();
    ctx.moveTo(sx(c.a.x), sz(c.a.z));
    ctx.lineTo(sx(c.b.x), sz(c.b.z));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(sx(0), sz(0), layout.foyer.radius * k, 0, Math.PI * 2);
  ctx.fill();
  layout.rooms.forEach((r, i) => {
    ctx.fillStyle = `#${(accents[i] ?? 0x8b7bff).toString(16).padStart(6, '0')}55`;
    ctx.beginPath();
    ctx.arc(sx(r.center.x), sz(r.center.z), r.radius * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), sx(r.center.x), sz(r.center.z) + 4);
  });
  if (ghost && ghost.length > 1) {
    ctx.strokeStyle = 'rgba(180,200,255,0.55)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ghost.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sz(p.z)) : ctx.moveTo(sx(p.x), sz(p.z))));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const l of loci) {
    const f = l.freshness;
    ctx.fillStyle = `hsl(${Math.round(45 + f * 80)} ${Math.round(15 + f * 80)}% ${Math.round(45 + f * 15)}%)`;
    ctx.beginPath();
    ctx.arc(sx(l.x), sz(l.z), l.active || l.target ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fill();
    if (l.target) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // player arrow (heading φ: direction (sin φ, cos φ))
  const px = sx(player.x);
  const pz = sz(player.z);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(Math.PI - player.heading);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0b1020';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
