// Constellations: drifting stars that join up with fine lines when close, and reach for the mouse.
import { createEngine, rgba, COLORS_DEFAULT, WHITE, type Ctrl } from '../runtime';

export interface ConstellationSettings {
  seed: number; colors: string[];
  layout: 'free' | 'grid';
  density: number; dotSize: number; bright: number; white: number;
  linkDistance: number; lineWidth: number; lineOpacity: number; pulses: number;
  speed: number; twinkle: number;
  mouse: 'none' | 'connect' | 'repel'; mouseRadius: number;
}

export const DEFAULTS: ConstellationSettings = {
  seed: 7, colors: COLORS_DEFAULT, layout: 'free',
  density: 1, dotSize: 1.8, bright: 0.12, white: 0.3,
  linkDistance: 130, lineWidth: 1, lineOpacity: 0.45, pulses: 0,
  speed: 0.3, twinkle: 0.3,
  mouse: 'connect', mouseRadius: 180,
};

export const CONTROLS: Ctrl[] = [
  { group: 'Stars' },
  { key: 'layout', label: 'Layout', type: 'select', options: ['free', 'grid'] },
  { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 999, step: 1 },
  { key: 'density', label: 'Amount', type: 'range', min: 0.1, max: 3, step: 0.05 },
  { key: 'dotSize', label: 'Star size', type: 'range', min: 0.5, max: 5, step: 0.1 },
  { key: 'bright', label: 'Big stars', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Colour' },
  { key: 'colors', label: 'Colours', type: 'colors' },
  { key: 'white', label: 'White stars', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Lines' },
  { key: 'linkDistance', label: 'Link distance', type: 'range', min: 40, max: 300, step: 5 },
  { key: 'lineWidth', label: 'Line width', type: 'range', min: 0.25, max: 3, step: 0.05 },
  { key: 'lineOpacity', label: 'Line opacity', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'pulses', label: 'Pulses', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Motion' },
  { key: 'speed', label: 'Speed', type: 'range', min: 0, max: 2, step: 0.01 },
  { key: 'twinkle', label: 'Twinkle', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'mouse', label: 'Mouse', type: 'select', options: ['none', 'connect', 'repel'] },
  { key: 'mouseRadius', label: 'Mouse radius', type: 'range', min: 60, max: 400, step: 5 },
];

interface Dot { x: number; y: number; hx: number; hy: number; vx: number; vy: number; tone: number; big: boolean; ph: number; ox: number; oy: number }
interface State { dots: Dot[]; W: number; H: number }

const hash = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

export const mount = createEngine<ConstellationSettings, State>({
  defaults: DEFAULTS,
  structural: ['seed', 'density', 'layout', 'bright', 'white', 'colors', 'linkDistance'],
  stillTime: 2,
  setup(S, W, H, rnd) {
    const dots: Dot[] = [];
    const make = (x: number, y: number): Dot => {
      const a = rnd() * Math.PI * 2;
      return { x, y, hx: x, hy: y, vx: Math.cos(a), vy: Math.sin(a), tone: rnd() < S.white ? -1 : Math.floor(rnd() * S.colors.length), big: rnd() < S.bright, ph: rnd() * Math.PI * 2, ox: 0, oy: 0 };
    };
    if (S.layout === 'grid') {
      const gap = Math.max(30, S.linkDistance * 0.62 / Math.sqrt(S.density));
      for (let y = -gap / 2; y < H + gap; y += gap * 0.87) {
        const row = Math.round(y / gap);
        for (let x = (row % 2 ? gap / 2 : 0) - gap / 2; x < W + gap; x += gap) dots.push(make(x + (rnd() - 0.5) * gap * 0.3, y + (rnd() - 0.5) * gap * 0.3));
      }
    } else {
      const n = Math.min(450, Math.round(Math.max(W * H, 900 * 500) / 9000 * S.density)); // thumbnails keep enough stars
      for (let i = 0; i < n; i++) dots.push(make(rnd() * W, rnd() * H));
    }
    return { dots, W, H };
  },
  frame(st, S, { ctx, W, H, t, dt, mouse, still, colors }) {
    const { dots } = st;
    const m = 20;
    // move
    for (const d of dots) {
      if (S.layout === 'grid') {
        const amp = S.linkDistance * 0.12;
        d.x = d.hx + Math.sin(t * S.speed * 1.4 + d.ph) * amp;
        d.y = d.hy + Math.cos(t * S.speed * 1.1 + d.ph * 1.3) * amp;
      } else if (!still) {
        d.x += d.vx * S.speed * 20 * dt; d.y += d.vy * S.speed * 20 * dt;
        if (d.x < -m) d.x += W + 2 * m; else if (d.x > W + m) d.x -= W + 2 * m;
        if (d.y < -m) d.y += H + 2 * m; else if (d.y > H + m) d.y -= H + 2 * m;
      }
      // mouse repel: ease each star's offset
      let tx = 0, ty = 0;
      if (S.mouse === 'repel' && mouse.on && !still) {
        const dx = d.x - mouse.x, dy = d.y - mouse.y, dist = Math.hypot(dx, dy);
        if (dist < S.mouseRadius && dist > 0.1) { const k = (1 - dist / S.mouseRadius) * S.mouseRadius * 0.4; tx = (dx / dist) * k; ty = (dy / dist) * k; }
      }
      d.ox += (tx - d.ox) * Math.min(1, dt * 8 || 1); d.oy += (ty - d.oy) * Math.min(1, dt * 8 || 1);
    }
    // lines
    const L = S.linkDistance, L2 = L * L;
    ctx.lineWidth = S.lineWidth;
    const pulses: [number, number, [number, number, number]][] = [];
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i], ax = a.x + a.ox, ay = a.y + a.oy;
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j], bx = b.x + b.ox, by = b.y + b.oy;
        const dx = ax - bx, dy = ay - by, d2 = dx * dx + dy * dy;
        if (d2 > L2) continue;
        const k = 1 - Math.sqrt(d2) / L;
        const rgb = a.tone < 0 ? (b.tone < 0 ? colors[0] : colors[b.tone] ?? colors[0]) : colors[a.tone] ?? colors[0];
        ctx.strokeStyle = rgba(rgb, k * S.lineOpacity);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        // pulses: little lights travelling along some of the links
        if (S.pulses > 0 && k > 0.2) {
          const h = hash(i, j);
          if (h < S.pulses * 0.35) {
            const p = (t * (0.25 + h) + h * 7) % 1;
            pulses.push([ax + (bx - ax) * p, ay + (by - ay) * p, rgb]);
          }
        }
      }
    }
    // mouse: lines from the cursor to nearby stars
    if (S.mouse === 'connect' && mouse.on && !still) {
      for (const d of dots) {
        const dx = d.x - mouse.x, dy = d.y - mouse.y, dist = Math.hypot(dx, dy);
        if (dist > S.mouseRadius) continue;
        const rgb = colors[d.tone < 0 ? 0 : d.tone] ?? colors[0];
        ctx.strokeStyle = rgba(rgb, (1 - dist / S.mouseRadius) * Math.min(1, S.lineOpacity * 1.6));
        ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(d.x, d.y); ctx.stroke();
      }
    }
    for (const [x, y, rgb] of pulses) {
      ctx.fillStyle = rgba(rgb, 1); ctx.beginPath(); ctx.arc(x, y, S.lineWidth + 1, 0, Math.PI * 2); ctx.fill();
    }
    // stars
    for (const d of dots) {
      const x = d.x + d.ox, y = d.y + d.oy;
      const tw = still ? 0.85 : 1 - S.twinkle * (0.5 + 0.5 * Math.sin(t * 2.2 + d.ph * 3));
      const rgb = d.tone < 0 ? WHITE : colors[d.tone] ?? colors[0];
      const r = S.dotSize * (d.big ? 1.9 : 1);
      ctx.fillStyle = rgba(rgb, (d.big ? 1 : 0.9) * tw);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  },
});
