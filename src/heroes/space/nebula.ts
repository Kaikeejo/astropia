// Nebula dust: thousands of soft glowing particles in slow swirling clouds.
import { createEngine, glowSprite, rgba, COLORS_DEFAULT, WHITE, type Ctrl } from '../runtime';

export interface NebulaSettings {
  seed: number; colors: string[];
  mode: 'drift' | 'vortex' | 'galaxy' | 'supernova' | 'aurora';
  count: number; size: number; glow: number; opacity: number; white: number;
  spread: number; swirl: number; speed: number; twinkle: number;
  focusX: number; focusY: number;
  mouse: 'none' | 'stir'; mouseRadius: number;
}

export const DEFAULTS: NebulaSettings = {
  seed: 7, colors: COLORS_DEFAULT, mode: 'drift',
  count: 1400, size: 3, glow: 0.8, opacity: 0.75, white: 0.08,
  spread: 1, swirl: 0.5, speed: 0.5, twinkle: 0.2,
  focusX: 0.5, focusY: 0.5,
  mouse: 'stir', mouseRadius: 160,
};

export const CONTROLS: Ctrl[] = [
  { group: 'Dust' },
  { key: 'mode', label: 'Type', type: 'select', options: ['drift', 'vortex', 'galaxy', 'supernova', 'aurora'] },
  { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 999, step: 1 },
  { key: 'count', label: 'Amount', type: 'range', min: 200, max: 4000, step: 50 },
  { key: 'size', label: 'Particle size', type: 'range', min: 0.5, max: 6, step: 0.1 },
  { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 2, step: 0.01 },
  { key: 'opacity', label: 'Opacity', type: 'range', min: 0.05, max: 1, step: 0.01 },
  { group: 'Colour' },
  { key: 'colors', label: 'Colours', type: 'colors' },
  { key: 'white', label: 'White sparks', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Shape' },
  { key: 'spread', label: 'Size', type: 'range', min: 0.3, max: 2, step: 0.01 },
  { key: 'swirl', label: 'Swirl', type: 'range', min: 0, max: 1.5, step: 0.01 },
  { key: 'focusX', label: 'Position X', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'focusY', label: 'Position Y', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Motion' },
  { key: 'speed', label: 'Speed', type: 'range', min: 0, max: 3, step: 0.01 },
  { key: 'twinkle', label: 'Twinkle', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'mouse', label: 'Mouse', type: 'select', options: ['none', 'stir'] },
  { key: 'mouseRadius', label: 'Mouse radius', type: 'range', min: 60, max: 400, step: 5 },
];

// a: angle / phase, r: radius (0-1), u/v: extra randoms, tone: colour index (-1 = white)
interface P { x: number; y: number; a: number; r: number; u: number; v: number; arm: number; tone: number; ox: number; oy: number }
interface State { ps: P[]; W: number; H: number }

const gauss = (rnd: () => number) => (rnd() + rnd() + rnd() - 1.5) / 1.5;
const flow = (x: number, y: number, t: number) =>
  Math.sin(x * 1.7 + t * 0.6) + Math.sin(y * 2.3 - t * 0.45) + Math.sin((x + y) * 1.3 + t * 0.3) + Math.sin((x - y) * 0.9 - t * 0.2);

export const mount = createEngine<NebulaSettings, State>({
  defaults: DEFAULTS,
  structural: ['seed', 'mode', 'count', 'white', 'colors'],
  stillTime: 6,
  setup(S, W, H, rnd) {
    const ps: P[] = [];
    const n = S.colors.length;
    for (let i = 0; i < S.count; i++) {
      const p: P = { x: 0, y: 0, a: rnd() * Math.PI * 2, r: rnd(), u: rnd(), v: rnd(), arm: 0, tone: rnd() < S.white ? -1 : 0, ox: 0, oy: 0 };
      if (S.mode === 'drift') { p.x = gauss(rnd); p.y = gauss(rnd); }
      if (S.mode === 'vortex') p.r = Math.pow(rnd(), 0.6);
      if (S.mode === 'galaxy') { p.r = Math.pow(rnd(), 0.8); p.arm = rnd() < 0.5 ? 0 : Math.PI; p.u = gauss(rnd); }
      if (S.mode === 'aurora') { p.x = rnd(); p.y = gauss(rnd); }
      // colour by position: colour 1 on one side / inside, colour 2 on the other / outside
      if (p.tone === 0) {
        const side = S.mode === 'drift' ? (p.x + 1) / 2 + gauss(rnd) * 0.25 : S.mode === 'aurora' ? p.x + gauss(rnd) * 0.2 : p.r + gauss(rnd) * 0.2;
        p.tone = Math.min(n - 1, Math.max(0, Math.floor(side * n)));
      }
      ps.push(p);
    }
    return { ps, W, H };
  },
  frame(st, S, { ctx, W, H, t, dt, mouse, still, colors }) {
    const cx = S.focusX * W, cy = S.focusY * H;
    const R = Math.min(W, H) * 0.42 * S.spread;
    const T = t * S.speed;
    const sprites = colors.map((c) => glowSprite(c));
    const white = glowSprite(WHITE, 0.3);
    const base = S.size * (1 + S.glow * 3);

    // supernova: a bright core that pulses with each wave
    if (S.mode === 'supernova') {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35);
      g.addColorStop(0, rgba(WHITE, 0.9 * S.opacity)); g.addColorStop(0.15, rgba(colors[0], 0.5 * S.opacity)); g.addColorStop(1, rgba(colors[0], 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.35, 0, Math.PI * 2); ctx.fill();
    }

    for (const p of st.ps) {
      let x = 0, y = 0, alpha = 1, stretch = 1;
      if (S.mode === 'drift') {
        // a cloud that slowly churns: each particle is pushed around its home by a flow field
        const hx = p.x * R * 1.6, hy = p.y * R;
        const f = flow(hx / R, hy / R, T + p.u * 0.5) * S.swirl;
        x = cx + hx + Math.cos(f + p.a) * R * 0.18 * S.swirl;
        y = cy + hy + Math.sin(f + p.a) * R * 0.12 * S.swirl;
        alpha = Math.max(0, 1 - Math.hypot(p.x, p.y) * 0.9);
      } else if (S.mode === 'vortex') {
        const r = p.r * R * 1.4;
        const a = p.a + T * 0.6 / Math.max(0.15, Math.sqrt(p.r)) + p.r * S.swirl * 4;
        const wob = 1 + Math.sin(a * 3 + p.u * 6) * 0.06 * S.swirl;
        x = cx + Math.cos(a) * r * wob * 1.35; y = cy + Math.sin(a) * r * wob * 0.7;
        alpha = Math.max(0, 1 - p.r * 0.85);
      } else if (S.mode === 'galaxy') {
        const r = p.r * R * 1.5;
        const a = p.arm + p.r * (2.2 + S.swirl * 3) + p.u * (0.35 + p.r * 0.4) + T * 0.25;
        x = cx + Math.cos(a) * r * 1.25; y = cy + Math.sin(a) * r * 0.5;
        alpha = Math.max(0, 1 - p.r * 0.8) * (0.5 + 0.5 * (1 - Math.abs(p.u)));
      } else if (S.mode === 'supernova') {
        // waves of dust flying outward from the centre, fading as they spread
        const life = (T * 0.12 + p.u) % 1;
        const r = Math.pow(life, 0.7) * R * 1.7 * (0.85 + p.r * 0.3);
        const a = p.a + Math.sin(p.a * 5 + p.v * 9) * 0.12 * S.swirl;
        x = cx + Math.cos(a) * r * 1.3; y = cy + Math.sin(a) * r * 0.85;
        alpha = (1 - life) * Math.min(1, life * 8);
      } else {
        // aurora: curtains of light waving across the hero
        // each particle sits somewhere up a curtain: bright at the bottom edge, fading upward
        const px = ((p.x * (W + 200) + T * 12 * (0.5 + p.v)) % (W + 200)) - 100;
        const wave = Math.sin(px / W * 5 + T * 0.6) * 0.5 + Math.sin(px / W * 11 - T * 0.4) * 0.3 * S.swirl;
        const up = Math.pow(p.r, 1.6);
        x = px + p.y * 6; y = cy + R * 0.45 + wave * R * 0.5 - up * R * 1.1;
        stretch = 4 + up * 6;
        alpha = Math.pow(1 - up, 1.5) * Math.min(1, (1 - up) * 3);
      }
      // mouse: stir the dust away from the cursor
      let tx = 0, ty = 0;
      if (S.mouse === 'stir' && mouse.on && !still) {
        const dx = x - mouse.x, dy = y - mouse.y, d = Math.hypot(dx, dy);
        if (d < S.mouseRadius && d > 0.1) { const k = (1 - d / S.mouseRadius) * S.mouseRadius * 0.35; tx = (dx / d) * k; ty = (dy / d) * k; }
      }
      p.ox += (tx - p.ox) * Math.min(1, dt * 4 || 1); p.oy += (ty - p.oy) * Math.min(1, dt * 4 || 1);
      x += p.ox; y += p.oy;
      if (x < -40 || x > W + 40 || y < -60 || y > H + 60) continue;
      const tw = still ? 1 : 1 - S.twinkle * 0.6 * (0.5 + 0.5 * Math.sin(t * (1 + p.v * 2) + p.a * 4));
      const a = alpha * S.opacity * tw * (p.tone < 0 ? 1.4 : 1);
      if (a < 0.01) continue;
      let s = base * (0.5 + p.v * 1.1) * (p.tone < 0 ? 0.6 : 1);
      // a few big, faint puffs make it read as a cloud rather than just dots
      const puff = p.tone >= 0 && p.v < 0.1 && S.mode !== 'aurora';
      if (puff) s *= 7;
      ctx.globalAlpha = Math.min(1, puff ? a * 0.18 : a);
      ctx.drawImage(p.tone < 0 ? white : sprites[p.tone] ?? sprites[0], x - s / 2, y - (s * stretch) / 2, s, s * stretch);
    }
    ctx.globalAlpha = 1;
  },
});
