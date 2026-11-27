// Orbits: planets and moons on thin rings around a glowing star (or two stars, or an atom's nucleus).
import { createEngine, rgba, mix, COLORS_DEFAULT, WHITE, type Ctrl } from '../runtime';

export interface OrbitsSettings {
  seed: number; colors: string[];
  mode: 'system' | 'binary' | 'atom' | 'moons';
  planets: number; belt: number; stars: number;
  size: number; tilt: number; rotation: number;
  planetSize: number; sunSize: number;
  ringOpacity: number; trails: number;
  speed: number; focusX: number; focusY: number;
  mouse: 'none' | 'parallax';
}

export const DEFAULTS: OrbitsSettings = {
  seed: 7, colors: COLORS_DEFAULT, mode: 'system',
  planets: 6, belt: 0, stars: 90,
  size: 1, tilt: 0.42, rotation: -12,
  planetSize: 1, sunSize: 1,
  ringOpacity: 0.22, trails: 0.5,
  speed: 0.5, focusX: 0.5, focusY: 0.5,
  mouse: 'parallax',
};

export const CONTROLS: Ctrl[] = [
  { group: 'System' },
  { key: 'mode', label: 'Type', type: 'select', options: ['system', 'binary', 'atom', 'moons'] },
  { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 999, step: 1 },
  { key: 'planets', label: 'Planets', type: 'range', min: 1, max: 10, step: 1 },
  { key: 'belt', label: 'Asteroids', type: 'range', min: 0, max: 2000, step: 50 },
  { key: 'stars', label: 'Background stars', type: 'range', min: 0, max: 400, step: 10 },
  { group: 'Colour' },
  { key: 'colors', label: 'Colours', type: 'colors' },
  { group: 'Shape' },
  { key: 'size', label: 'Size', type: 'range', min: 0.3, max: 2, step: 0.01 },
  { key: 'tilt', label: 'Tilt', type: 'range', min: 0.08, max: 1, step: 0.01 },
  { key: 'rotation', label: 'Rotation', type: 'range', min: -60, max: 60, step: 1 },
  { key: 'planetSize', label: 'Planet size', type: 'range', min: 0.3, max: 3, step: 0.05 },
  { key: 'sunSize', label: 'Star size', type: 'range', min: 0, max: 3, step: 0.05 },
  { key: 'ringOpacity', label: 'Ring opacity', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'trails', label: 'Trails', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Motion' },
  { key: 'speed', label: 'Speed', type: 'range', min: 0, max: 3, step: 0.01 },
  { key: 'focusX', label: 'Position X', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'focusY', label: 'Position Y', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'mouse', label: 'Mouse', type: 'select', options: ['none', 'parallax'] },
];

interface Ring { r: number; rot: number; tilt: number; bodies: { ph: number; size: number; tone: number; moon?: { r: number; ph: number } }[] }
interface State { rings: Ring[]; belt: { r: number; ph: number; tone: number; s: number }[]; stars: { x: number; y: number; s: number; ph: number }[]; px: number; py: number }

export const mount = createEngine<OrbitsSettings, State>({
  defaults: DEFAULTS,
  structural: ['seed', 'mode', 'planets', 'belt', 'stars', 'colors'],
  stillTime: 4,
  setup(S, W, H, rnd) {
    const rings: Ring[] = [];
    const n = S.mode === 'atom' ? 3 : S.planets;
    for (let i = 0; i < n; i++) {
      const u = S.mode === 'atom' ? 1 : S.mode === 'binary' ? 0.42 + 0.58 * (i + 1) / n : 0.2 + 0.8 * (i + 1) / n;
      const ring: Ring = { r: u, rot: S.mode === 'atom' ? (i * 60) : 0, tilt: S.mode === 'atom' ? 0.28 : 1, bodies: [] };
      const count = S.mode === 'atom' ? 1 : 1;
      for (let k = 0; k < count; k++) ring.bodies.push({
        ph: rnd() * Math.PI * 2,
        size: S.mode === 'atom' ? 7 : S.mode === 'moons' ? 1.5 + rnd() * 2.5 : 2.5 + rnd() * 5 * (0.5 + u),
        tone: i % Math.max(1, S.colors.length),
        moon: S.mode === 'system' && rnd() < 0.35 && u > 0.4 ? { r: 10 + rnd() * 8, ph: rnd() * 6 } : undefined,
      });
      rings.push(ring);
    }
    const belt = [];
    if (S.belt > 0) {
      const inner = S.mode === 'binary' ? 0.5 : 0.48, outer = inner + 0.16;
      for (let i = 0; i < S.belt; i++) belt.push({ r: inner + (outer - inner) * (rnd() + rnd()) / 2, ph: rnd() * Math.PI * 2, tone: Math.floor(rnd() * S.colors.length), s: 0.6 + rnd() * 1.3 });
    }
    const stars = Array.from({ length: S.stars }, () => ({ x: rnd() * W, y: rnd() * H, s: rnd(), ph: rnd() * 6 }));
    return { rings, belt, stars, px: 0, py: 0 };
  },
  frame(st, S, { ctx, W, H, t, dt, mouse, still, colors }) {
    const c0 = colors[0], c1 = colors[1] ?? colors[0];
    // background stars (static, gently twinkling)
    for (const s of st.stars) {
      const a = (0.15 + s.s * 0.5) * (still ? 1 : 0.7 + 0.3 * Math.sin(t * 1.5 + s.ph));
      ctx.fillStyle = rgba(WHITE, a); const z = 0.6 + s.s * 1.2; ctx.fillRect(s.x, s.y, z, z);
    }
    // parallax: the whole system leans a little toward the mouse
    const tx = S.mouse === 'parallax' && mouse.on && !still ? (mouse.x / W - 0.5) * 30 : 0;
    const ty = S.mouse === 'parallax' && mouse.on && !still ? (mouse.y / H - 0.5) * 20 : 0;
    st.px += (tx - st.px) * Math.min(1, dt * 2 || 1); st.py += (ty - st.py) * Math.min(1, dt * 2 || 1);
    const cx = S.focusX * W + st.px, cy = S.focusY * H + st.py;
    const R = Math.min(W * 0.48, H * 0.9) * S.size * (S.mode === 'atom' ? 0.42 : 1);
    const k = R / 320; // scale for sizes
    const rot = (S.rotation * Math.PI) / 180;
    const ws = S.speed * (S.mode === 'atom' ? 2.2 : 0.6);

    const pos = (r: number, ang: number, ringRot: number, ringTilt: number) => {
      const ex = Math.cos(ang) * r, ey = Math.sin(ang) * r * S.tilt * ringTilt;
      const rr = rot + (ringRot * Math.PI) / 180;
      return [cx + ex * Math.cos(rr) - ey * Math.sin(rr), cy + ex * Math.sin(rr) + ey * Math.cos(rr), Math.sin(ang)] as const;
    };
    const ellipse = (r: number, ringRot: number, ringTilt: number) => {
      ctx.beginPath(); ctx.ellipse(cx, cy, r, Math.max(0.5, r * S.tilt * ringTilt), rot + (ringRot * Math.PI) / 180, 0, Math.PI * 2);
    };

    // rings + trails, then bodies sorted back-to-front around the star
    ctx.lineWidth = 1;
    const bodies: { x: number; y: number; z: number; draw: () => void }[] = [];
    st.rings.forEach((ring, i) => {
      const r = ring.r * R, rgb = i % 2 ? c1 : c0;
      ctx.strokeStyle = rgba(rgb, S.ringOpacity); ellipse(r, ring.rot, ring.tilt); ctx.stroke();
      for (const b of ring.bodies) {
        const w = ws / Math.pow(Math.max(0.15, ring.r), 1.5);
        const ang = b.ph + t * w;
        // trail: fading arc behind the planet
        if (S.trails > 0) {
          const span = S.trails * 1.3, steps = 14;
          for (let s = 0; s < steps; s++) {
            const a0 = ang - (span * s) / steps, a1 = ang - (span * (s + 1)) / steps;
            ctx.strokeStyle = rgba(colors[b.tone] ?? c0, (1 - s / steps) * 0.55);
            ctx.lineWidth = Math.max(1, b.size * k * 0.5) * (1 - s / steps * 0.6);
            ctx.beginPath(); ctx.ellipse(cx, cy, r, Math.max(0.5, r * S.tilt * ring.tilt), rot + (ring.rot * Math.PI) / 180, a1, a0); ctx.stroke();
          }
          ctx.lineWidth = 1;
        }
        const [x, y, z] = pos(r, ang, ring.rot, ring.tilt);
        const size = b.size * k * S.planetSize;
        bodies.push({ x, y, z: S.mode === 'atom' ? 1 : z, draw: () => {
          const rgb = colors[b.tone] ?? c0;
          const g = ctx.createRadialGradient(x - size * 0.35, y - size * 0.35, size * 0.1, x, y, size);
          g.addColorStop(0, rgba(mix(rgb, WHITE, 0.55), 1)); g.addColorStop(1, rgba(mix(rgb, [0, 0, 0], 0.25), 1));
          ctx.fillStyle = rgba(rgb, 0.18); ctx.beginPath(); ctx.arc(x, y, size * 2.4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
          if (b.moon) {
            const ma = b.moon.ph + t * ws * 3;
            const mx = x + Math.cos(ma) * b.moon.r * k * S.planetSize, my = y + Math.sin(ma) * b.moon.r * k * S.planetSize * S.tilt;
            ctx.fillStyle = rgba(WHITE, 0.85); ctx.beginPath(); ctx.arc(mx, my, Math.max(0.8, size * 0.28), 0, Math.PI * 2); ctx.fill();
          }
        } });
      }
    });
    // asteroid belt
    for (const a of st.belt) {
      const ang = a.ph + t * ws / Math.pow(a.r, 1.5);
      const [x, y, z] = pos(a.r * R, ang, 0, 1);
      ctx.fillStyle = rgba(colors[a.tone] ?? c0, 0.35 + 0.45 * (z > 0 ? 1 : 0.5));
      const s = a.s * Math.max(0.6, k); ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }

    // the centre: star(s), a big planet, or a nucleus
    const centre = () => {
      const sun = 18 * k * S.sunSize;
      if (S.sunSize <= 0) return;
      const glow = (x: number, y: number, r: number, rgb: [number, number, number]) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        g.addColorStop(0, rgba(WHITE, 1)); g.addColorStop(0.18, rgba(mix(rgb, WHITE, 0.4), 0.9)); g.addColorStop(0.45, rgba(rgb, 0.25)); g.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
      };
      if (S.mode === 'binary') {
        const a = t * ws * 1.6, d = 26 * k * S.sunSize;
        const [x1, y1] = pos(d, a, 0, 1), [x2, y2] = pos(d, a + Math.PI, 0, 1);
        glow(x1, y1, sun * 0.7, c0); glow(x2, y2, sun * 0.55, c1);
      } else if (S.mode === 'moons') {
        const r = sun * 2.4;
        const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
        g.addColorStop(0, rgba(mix(c0, WHITE, 0.4), 1)); g.addColorStop(0.7, rgba(c0, 1)); g.addColorStop(1, rgba(mix(c0, [0, 0, 0], 0.5), 1));
        ctx.fillStyle = rgba(c1, 0.12); ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        // a thin ring around the big planet
        ctx.strokeStyle = rgba(c1, 0.6); ctx.lineWidth = 2 * k;
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.7, r * 1.7 * S.tilt * 0.6, rot, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
        ctx.lineWidth = 1;
      } else if (S.mode === 'atom') {
        for (let i = 0; i < 7; i++) {
          const a = i * 2.4 + t * 0.6, d = i ? 13 * k : 0;
          const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
          ctx.fillStyle = rgba(i % 2 ? c1 : c0, 1); ctx.beginPath(); ctx.arc(x, y, 11 * k * S.sunSize, 0, Math.PI * 2); ctx.fill();
        }
        glow(cx, cy, sun * 0.6, c0);
      } else glow(cx, cy, sun, c0);
    };
    // back half, centre, front half
    bodies.sort((a, b) => a.z - b.z);
    for (const b of bodies) if (b.z < 0) b.draw();
    centre();
    for (const b of bodies) if (b.z >= 0) b.draw();
  },
});
