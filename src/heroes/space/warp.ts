// Warp: stars fly out of the centre, from a gentle cruise to full hyperspace streaks.
import { createEngine, rgba, COLORS_DEFAULT, WHITE, type Ctrl } from '../runtime';

export interface WarpSettings {
  seed: number; colors: string[];
  shape: 'field' | 'tunnel';
  count: number; speed: number; streak: number; size: number;
  white: number; opacity: number; centerFade: number;
  focusX: number; focusY: number; mouse: 'none' | 'steer';
}

export const DEFAULTS: WarpSettings = {
  seed: 7, colors: COLORS_DEFAULT, shape: 'field',
  count: 800, speed: 0.6, streak: 0.4, size: 1.6,
  white: 0.5, opacity: 1, centerFade: 0.15,
  focusX: 0.5, focusY: 0.5, mouse: 'steer',
};

export const CONTROLS: Ctrl[] = [
  { group: 'Stars' },
  { key: 'shape', label: 'Shape', type: 'select', options: ['field', 'tunnel'] },
  { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 999, step: 1 },
  { key: 'count', label: 'Amount', type: 'range', min: 50, max: 1500, step: 10 },
  { key: 'size', label: 'Star size', type: 'range', min: 0.5, max: 4, step: 0.1 },
  { key: 'opacity', label: 'Opacity', type: 'range', min: 0.1, max: 1, step: 0.01 },
  { group: 'Colour' },
  { key: 'colors', label: 'Colours', type: 'colors' },
  { key: 'white', label: 'White stars', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Motion' },
  { key: 'speed', label: 'Speed', type: 'range', min: -2, max: 3, step: 0.05 },
  { key: 'streak', label: 'Streaks', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'centerFade', label: 'Centre fade', type: 'range', min: 0, max: 0.6, step: 0.01 },
  { key: 'focusX', label: 'Centre X', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'focusY', label: 'Centre Y', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'mouse', label: 'Mouse', type: 'select', options: ['none', 'steer'] },
];

interface Star { x: number; y: number; z: number; tone: number }
interface State { stars: Star[]; rnd: () => number; cx: number; cy: number }

const place = (s: Star, S: WarpSettings, rnd: () => number) => {
  if (S.shape === 'tunnel') { const a = rnd() * Math.PI * 2, r = 0.3 + rnd() * 0.08; s.x = Math.cos(a) * r; s.y = Math.sin(a) * r; }
  else { s.x = (rnd() * 2 - 1) * 1.2; s.y = (rnd() * 2 - 1) * 1.2; }
};

export const mount = createEngine<WarpSettings, State>({
  defaults: DEFAULTS,
  structural: ['seed', 'count', 'shape', 'white', 'colors'],
  stillTime: 0,
  setup(S, W, H, rnd) {
    const stars: Star[] = [];
    for (let i = 0; i < S.count; i++) {
      const s: Star = { x: 0, y: 0, z: 0.03 + rnd() * 0.97, tone: rnd() < S.white ? -1 : Math.floor(rnd() * S.colors.length) };
      place(s, S, rnd); stars.push(s);
    }
    return { stars, rnd, cx: S.focusX * W, cy: S.focusY * H };
  },
  frame(st, S, { ctx, W, H, dt, mouse, still, colors }) {
    // the vanishing point drifts toward the mouse when "steer" is on
    const tx = S.mouse === 'steer' && mouse.on && !still ? S.focusX * W + (mouse.x - S.focusX * W) * 0.25 : S.focusX * W;
    const ty = S.mouse === 'steer' && mouse.on && !still ? S.focusY * H + (mouse.y - S.focusY * H) * 0.25 : S.focusY * H;
    st.cx += (tx - st.cx) * Math.min(1, dt * 3 || 1); st.cy += (ty - st.cy) * Math.min(1, dt * 3 || 1);
    const R = Math.max(W, H) * 0.5, v = S.speed * 0.25;
    const tail = S.streak * 0.12 * Math.sign(S.speed || 1);
    ctx.lineCap = 'round';
    for (const s of st.stars) {
      if (!still) {
        s.z -= v * dt;
        // flying forward: respawn far away; flying backward: respawn up close
        if (s.z <= 0.02) { s.z = 0.97 + st.rnd() * 0.03; place(s, S, st.rnd); }
        else if (s.z > 1) { s.z = 0.03 + st.rnd() * 0.05; place(s, S, st.rnd); }
      }
      const px = st.cx + (s.x / s.z) * R, py = st.cy + (s.y / s.z) * R;
      if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue;
      const near = 1 - s.z;
      const d = Math.hypot(px - st.cx, py - st.cy);
      const fade = S.centerFade > 0 ? Math.min(1, d / (S.centerFade * R)) : 1;
      const a = (0.3 + 0.7 * Math.pow(Math.max(0, near), 1.2)) * S.opacity * fade;
      if (a < 0.01) continue;
      const rgb = s.tone < 0 ? WHITE : colors[s.tone] ?? colors[0];
      const w = S.size * (0.45 + near * 1.6);
      if (tail !== 0) {
        const z2 = Math.min(1, s.z + tail * (0.4 + Math.abs(S.speed)));
        const qx = st.cx + (s.x / z2) * R, qy = st.cy + (s.y / z2) * R;
        ctx.strokeStyle = rgba(rgb, a); ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
      } else {
        ctx.fillStyle = rgba(rgb, a);
        ctx.fillRect(px - w / 2, py - w / 2, w, w);
      }
    }
  },
});
