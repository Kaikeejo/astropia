// Black hole: a disk of particles spiralling into a dark centre with a glowing ring,
// plus a wormhole tunnel.
import { createEngine, glowSprite, rgba, mix, COLORS_DEFAULT, WHITE, type Ctrl } from '../runtime';

export interface BlackHoleSettings {
  seed: number; colors: string[];
  mode: 'horizon' | 'wormhole';
  count: number; holeSize: number; size: number; tilt: number;
  particleSize: number; opacity: number; ringGlow: number;
  spin: number; infall: number;
  focusX: number; focusY: number; mouse: 'none' | 'parallax';
}

export const DEFAULTS: BlackHoleSettings = {
  seed: 7, colors: COLORS_DEFAULT, mode: 'horizon',
  count: 1800, holeSize: 1, size: 1, tilt: 0.28,
  particleSize: 1.3, opacity: 0.9, ringGlow: 0.7,
  spin: 0.5, infall: 0.3,
  focusX: 0.5, focusY: 0.5, mouse: 'parallax',
};

export const CONTROLS: Ctrl[] = [
  { group: 'Shape' },
  { key: 'mode', label: 'Type', type: 'select', options: ['horizon', 'wormhole'] },
  { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 999, step: 1 },
  { key: 'count', label: 'Particles', type: 'range', min: 200, max: 4000, step: 50 },
  { key: 'size', label: 'Size', type: 'range', min: 0.3, max: 2, step: 0.01 },
  { key: 'holeSize', label: 'Centre size', type: 'range', min: 0.3, max: 2.5, step: 0.01 },
  { key: 'tilt', label: 'Tilt', type: 'range', min: 0.06, max: 1, step: 0.01 },
  { group: 'Colour' },
  { key: 'colors', label: 'Colours', type: 'colors' },
  { key: 'particleSize', label: 'Particle size', type: 'range', min: 0.4, max: 4, step: 0.05 },
  { key: 'opacity', label: 'Opacity', type: 'range', min: 0.1, max: 1, step: 0.01 },
  { key: 'ringGlow', label: 'Glow', type: 'range', min: 0, max: 1.5, step: 0.01 },
  { group: 'Motion' },
  { key: 'spin', label: 'Spin', type: 'range', min: 0, max: 2, step: 0.01 },
  { key: 'infall', label: 'Pull', type: 'range', min: 0, max: 1.5, step: 0.01 },
  { key: 'focusX', label: 'Position X', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'focusY', label: 'Position Y', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'mouse', label: 'Mouse', type: 'select', options: ['none', 'parallax'] },
];

interface P { r: number; a: number; u: number; v: number }
interface State { ps: P[]; rnd: () => number; px: number; py: number }

export const mount = createEngine<BlackHoleSettings, State>({
  defaults: DEFAULTS,
  structural: ['seed', 'count', 'mode'],
  stillTime: 5,
  setup(S, W, H, rnd) {
    const ps: P[] = Array.from({ length: S.count }, () => ({ r: 0.12 + Math.pow(rnd(), 0.8) * 0.88, a: rnd() * Math.PI * 2, u: rnd(), v: rnd() }));
    return { ps, rnd, px: 0, py: 0 };
  },
  frame(st, S, { ctx, W, H, t, dt, mouse, still, colors }) {
    const c0 = colors[0], c1 = colors[1] ?? colors[0];
    const tx = S.mouse === 'parallax' && mouse.on && !still ? (mouse.x / W - 0.5) * 30 : 0;
    const ty = S.mouse === 'parallax' && mouse.on && !still ? (mouse.y / H - 0.5) * 20 : 0;
    st.px += (tx - st.px) * Math.min(1, dt * 2 || 1); st.py += (ty - st.py) * Math.min(1, dt * 2 || 1);
    const cx = S.focusX * W + st.px, cy = S.focusY * H + st.py;
    const R = Math.min(W * 0.5, H * 0.95) * S.size;
    const rh = R * 0.12 * S.holeSize; // radius of the dark centre
    const k = R / 360;
    const ps = S.particleSize * Math.max(0.6, k);
    // colour by heat: white-hot inside, colour 2 in the middle, colour 1 outside
    const heat = (u: number): [number, number, number] => (u < 0.18 ? mix(WHITE, c1, u / 0.18) : mix(c1, c0, Math.min(1, (u - 0.18) / 0.5)));

    const glowDisc = (r: number, rgb: [number, number, number], a: number) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rgba(rgb, a)); g.addColorStop(1, rgba(rgb, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    };

    if (S.mode === 'horizon') {
      const inner = rh * 1.25;
      const pts: { x: number; y: number; front: boolean; rgb: [number, number, number]; a: number; s: number }[] = [];
      for (const p of st.ps) {
        if (!still) {
          const w = S.spin * 1.6 / Math.pow(Math.max(0.12, p.r), 1.5);
          p.a += w * dt;
          p.r -= S.infall * 0.05 * dt / Math.max(0.15, p.r);
          if (p.r * R < inner) { p.r = 0.75 + st.rnd() * 0.25; p.a = st.rnd() * Math.PI * 2; }
        }
        const r = inner + (p.r - 0.12) / 0.88 * (R - inner);
        const thick = (p.u - 0.5) * 0.08 * R * (1 - p.r * 0.5);
        const x = cx + Math.cos(p.a) * r, y = cy + Math.sin(p.a) * r * S.tilt + thick * S.tilt;
        const u = (r - inner) / (R - inner);
        const a = S.opacity * Math.min(1, (1 - u) * 1.8) * (0.55 + p.v * 0.45) * Math.min(1, u * 12 + 0.3);
        pts.push({ x, y, front: Math.sin(p.a) > 0, rgb: heat(u), a, s: ps * (0.6 + p.v * 0.9) });
      }
      // outer glow
      glowDisc(R * 0.65, c0, 0.12 * S.ringGlow);
      const dot = (q: (typeof pts)[number]) => { ctx.fillStyle = rgba(q.rgb, q.a); ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); };
      for (const q of pts) if (!q.front) dot(q);
      // lensed light: the far side of the disk bent up and over the hole (soft halo)
      const halo = ctx.createRadialGradient(cx, cy, rh, cx, cy, rh * 2.1);
      halo.addColorStop(0, rgba(mix(c1, WHITE, 0.3), 0.55 * S.ringGlow)); halo.addColorStop(0.35, rgba(c1, 0.22 * S.ringGlow)); halo.addColorStop(1, rgba(c0, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, rh * 2.1, 0, Math.PI * 2); ctx.fill();
      // the dark centre: punch a hole so nothing shows through it
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, rh, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // photon ring
      ctx.lineWidth = Math.max(1, rh * 0.07);
      ctx.strokeStyle = rgba(mix(c1, WHITE, 0.5), 0.9 * Math.min(1, S.ringGlow + 0.2)); ctx.beginPath(); ctx.arc(cx, cy, rh * 1.04, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = rh * 0.25; ctx.strokeStyle = rgba(c1, 0.18 * S.ringGlow); ctx.beginPath(); ctx.arc(cx, cy, rh * 1.18, 0, Math.PI * 2); ctx.stroke();
      for (const q of pts) if (q.front) dot(q);
      return;
    }

    // wormhole: soft glowing dust (like Vortex) swirling down into the tunnel
    glowDisc(rh * 3, c1, 0.35 * S.ringGlow);
    const sprites = [c0, c1].map((c) => glowSprite(c)), whiteSprite = glowSprite(WHITE, 0.3);
    const base = ps * 3.2;
    for (const p of st.ps) {
      const u = ((p.u - t * S.infall * 0.08) % 1 + 1) % 1; // 0 = deep inside, 1 = outer edge
      const r = (rh + (R * 1.2 - rh) * u * u) * (0.92 + p.v * 0.16);
      const ang = p.a + (1 - u) * 4 * S.spin + t * S.spin * 0.4;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * Math.max(0.35, S.tilt * 2.2);
      const a = S.opacity * Math.min(1, u * 4) * (1 - u * 0.7) * (0.45 + p.v * 0.55);
      if (a < 0.01) continue;
      const white = p.v > 0.93, puff = p.v < 0.08;
      // colour 2 near the centre, colour 1 further out (mixed a little for a softer blend)
      const sprite = white ? whiteSprite : sprites[u + (p.r - 0.5) * 0.35 < 0.45 ? 1 : 0];
      const size = base * (0.45 + u * 1.3) * (puff ? 6 : white ? 0.6 : 0.6 + p.r * 0.8);
      ctx.globalAlpha = Math.min(1, puff ? a * 0.18 : a);
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rh * 1.3);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rh * 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },
});
