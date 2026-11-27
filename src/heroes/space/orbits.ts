// Orbits (Atom): electrons racing around a nucleus on crossing rings. Every body is a solid dot.
import { createEngine, rgba, COLORS_DEFAULT, WHITE, type Ctrl } from '../runtime';

export interface OrbitsSettings {
  seed: number; colors: string[];
  orbits: number; stars: number;
  size: number; flatness: number; rotation: number;
  electronSize: number; nucleusSize: number;
  ringOpacity: number; trails: number;
  speed: number; focusX: number; focusY: number;
  mouse: 'none' | 'parallax';
}

export const DEFAULTS: OrbitsSettings = {
  seed: 7, colors: COLORS_DEFAULT,
  orbits: 3, stars: 90,
  size: 1, flatness: 0.28, rotation: 0,
  electronSize: 1, nucleusSize: 1,
  ringOpacity: 0.3, trails: 0.8,
  speed: 0.5, focusX: 0.5, focusY: 0.5,
  mouse: 'parallax',
};

export const CONTROLS: Ctrl[] = [
  { group: 'Atom' },
  { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 999, step: 1 },
  { key: 'orbits', label: 'Orbits', type: 'range', min: 1, max: 8, step: 1 },
  { key: 'stars', label: 'Background stars', type: 'range', min: 0, max: 400, step: 10 },
  { group: 'Colour' },
  { key: 'colors', label: 'Colours', type: 'colors' },
  { group: 'Shape' },
  { key: 'size', label: 'Size', type: 'range', min: 0.3, max: 2.5, step: 0.01 },
  { key: 'flatness', label: 'Ring flatness', type: 'range', min: 0.05, max: 1, step: 0.01 },
  { key: 'rotation', label: 'Rotation', type: 'range', min: -90, max: 90, step: 1 },
  { key: 'electronSize', label: 'Electron size', type: 'range', min: 0.3, max: 3, step: 0.05 },
  { key: 'nucleusSize', label: 'Nucleus size', type: 'range', min: 0, max: 3, step: 0.05 },
  { key: 'ringOpacity', label: 'Ring opacity', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'trails', label: 'Trails', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Motion' },
  { key: 'speed', label: 'Speed', type: 'range', min: 0, max: 3, step: 0.01 },
  { key: 'focusX', label: 'Position X', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'focusY', label: 'Position Y', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'mouse', label: 'Mouse', type: 'select', options: ['none', 'parallax'] },
];

interface State { electrons: { ph: number; tone: number }[]; stars: { x: number; y: number; s: number; ph: number }[]; px: number; py: number }

export const mount = createEngine<OrbitsSettings, State>({
  defaults: DEFAULTS,
  structural: ['seed', 'orbits', 'stars', 'colors'],
  stillTime: 4,
  setup(S, W, H, rnd) {
    const electrons = Array.from({ length: S.orbits }, (_, i) => ({ ph: rnd() * Math.PI * 2, tone: i % Math.max(1, S.colors.length) }));
    const stars = Array.from({ length: S.stars }, () => ({ x: rnd() * W, y: rnd() * H, s: rnd(), ph: rnd() * 6 }));
    return { electrons, stars, px: 0, py: 0 };
  },
  frame(st, S, { ctx, W, H, t, dt, mouse, still, colors }) {
    const c0 = colors[0], c1 = colors[1] ?? colors[0];
    // background stars (static, gently twinkling)
    for (const s of st.stars) {
      const a = (0.15 + s.s * 0.5) * (still ? 1 : 0.7 + 0.3 * Math.sin(t * 1.5 + s.ph));
      ctx.fillStyle = rgba(WHITE, a); const z = 0.6 + s.s * 1.2; ctx.fillRect(s.x, s.y, z, z);
    }
    // parallax: the atom leans a little toward the mouse
    const tx = S.mouse === 'parallax' && mouse.on && !still ? (mouse.x / W - 0.5) * 30 : 0;
    const ty = S.mouse === 'parallax' && mouse.on && !still ? (mouse.y / H - 0.5) * 20 : 0;
    st.px += (tx - st.px) * Math.min(1, dt * 2 || 1); st.py += (ty - st.py) * Math.min(1, dt * 2 || 1);
    const cx = S.focusX * W + st.px, cy = S.focusY * H + st.py;
    const R = Math.min(W * 0.48, H * 0.9) * 0.42 * S.size;
    const k = R / 320;
    const w = S.speed * 2.2;
    const dot = (x: number, y: number, r: number, rgb: [number, number, number]) => {
      ctx.fillStyle = rgba(rgb, 1); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };

    // nucleus: a small cluster of solid dots
    if (S.nucleusSize > 0) {
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + t * 0.6, d = i ? 13 * k * S.nucleusSize : 0;
        dot(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 11 * k * S.nucleusSize, i % 2 ? c1 : c0);
      }
    }

    // one ring per electron, spread evenly around the nucleus
    st.electrons.forEach((e, i) => {
      const rot = ((S.rotation + (i * 180) / S.orbits) * Math.PI) / 180;
      const ry = Math.max(0.5, R * S.flatness);
      const rgb = colors[e.tone] ?? c0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(i % 2 ? c1 : c0, S.ringOpacity);
      ctx.beginPath(); ctx.ellipse(cx, cy, R, ry, rot, 0, Math.PI * 2); ctx.stroke();
      const ang = e.ph + t * w;
      const size = 7 * k * S.electronSize;
      // trail: fading arc behind the electron
      if (S.trails > 0) {
        const span = S.trails * 1.3, steps = 14;
        for (let s = 0; s < steps; s++) {
          const a0 = ang - (span * s) / steps, a1 = ang - (span * (s + 1)) / steps;
          ctx.strokeStyle = rgba(rgb, (1 - s / steps) * 0.55);
          ctx.lineWidth = Math.max(1, size * 0.5) * (1 - (s / steps) * 0.6);
          ctx.beginPath(); ctx.ellipse(cx, cy, R, ry, rot, a1, a0); ctx.stroke();
        }
      }
      const ex = Math.cos(ang) * R, ey = Math.sin(ang) * ry;
      dot(cx + ex * Math.cos(rot) - ey * Math.sin(rot), cy + ex * Math.sin(rot) + ey * Math.cos(rot), size, rgb);
    });
  },
});
