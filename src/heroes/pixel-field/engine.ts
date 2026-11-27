import type { Ctrl } from '../runtime';

// Pixel Field hero: the Astropia pixel thumbnails as a live, animated, transparent hero background.
// Plain Canvas 2D (no three.js needed). Every setting below is a prop on <PixelField /> and a control
// in the playground. Generation (which pixels exist) and drawing (how they look each frame) are separate,
// so purely visual settings (opacity, twinkle, vignette, mouse...) update instantly without reshuffling.

export type PatternName =
  | 'clusters' | 'dissolve' | 'burst' | 'rings' | 'waves' | 'diagonal'
  | 'galaxy' | 'helix' | 'constellation' | 'streaks' | 'skyline' | 'mark' | 'noise';

export interface PixelFieldSettings {
  pattern: PatternName;
  seed: number;
  colors: string[];                 // 1-4 colours
  colorMode: 'mixed' | 'split' | 'solo';
  density: number;                  // 0.1 - 2
  pixelSize: number;                // px
  gap: number;                      // px between pixels
  scale: number;                    // size of the design (0.3 - 3)
  focusX: number;                   // 0-1, where the design sits
  focusY: number;
  opacityMin: number;               // 0-1
  opacityMax: number;
  twinkle: number;                  // 0-1 share of pixels that twinkle
  twinkleSpeed: number;             // 0-3
  highlights: number;               // white sparkle pixels
  vignette: number;                 // 0-1 strength
  vignetteSize: number;             // 0.2-1.5
  fadeTop: number;                  // 0-1 fade into the page
  fadeBottom: number;
  drift: number;                    // px per second (negative = reverse)
  driftAngle: number;               // degrees, 0 = to the right
  mouse: 'none' | 'glow' | 'repel';
  mouseRadius: number;              // px
}

export const DEFAULTS: PixelFieldSettings = {
  pattern: 'galaxy', seed: 7,
  colors: ['var(--brand-blue)', 'var(--brand-pink)'], colorMode: 'mixed', // site spot colours by default
  density: 1, pixelSize: 4, gap: 2, scale: 1.6, focusX: 0.5, focusY: 0.5,
  opacityMin: 0.2, opacityMax: 1,
  twinkle: 0.25, twinkleSpeed: 1, highlights: 6,
  vignette: 0.6, vignetteSize: 0.9, fadeTop: 0, fadeBottom: 0.3,
  drift: 0, driftAngle: 0,
  mouse: 'glow', mouseRadius: 160,
};

// Controls shown in the playground panel (the pattern is fixed per card, so it isn't here).
export const CONTROLS: Ctrl[] = [
  { group: 'Design' },
  { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 999, step: 1 },
  { key: 'density', label: 'Amount', type: 'range', min: 0.1, max: 2, step: 0.05 },
  { key: 'scale', label: 'Design size', type: 'range', min: 0.4, max: 3, step: 0.05 },
  { key: 'focusX', label: 'Position X', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'focusY', label: 'Position Y', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Colour' },
  { key: 'colors', label: 'Colours', type: 'colors' },
  { key: 'colorMode', label: 'Colour mode', type: 'select', options: ['mixed', 'split', 'solo'] },
  { key: 'highlights', label: 'White pixels', type: 'range', min: 0, max: 40, step: 1 },
  { group: 'Pixels' },
  { key: 'pixelSize', label: 'Pixel size', type: 'range', min: 1, max: 16, step: 1 },
  { key: 'gap', label: 'Gap', type: 'range', min: 0, max: 12, step: 1 },
  { key: 'opacityMin', label: 'Opacity min', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'opacityMax', label: 'Opacity max', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Edges' },
  { key: 'vignette', label: 'Vignette', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'vignetteSize', label: 'Vignette size', type: 'range', min: 0.2, max: 1.5, step: 0.01 },
  { key: 'fadeTop', label: 'Fade top', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'fadeBottom', label: 'Fade bottom', type: 'range', min: 0, max: 1, step: 0.01 },
  { group: 'Motion' },
  { key: 'twinkle', label: 'Twinkle', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'twinkleSpeed', label: 'Twinkle speed', type: 'range', min: 0, max: 3, step: 0.05 },
  { key: 'drift', label: 'Drift', type: 'range', min: -60, max: 60, step: 1 },
  { key: 'driftAngle', label: 'Drift angle', type: 'range', min: 0, max: 360, step: 1 },
  { key: 'mouse', label: 'Mouse', type: 'select', options: ['none', 'glow', 'repel'] },
  { key: 'mouseRadius', label: 'Mouse radius', type: 'range', min: 40, max: 400, step: 5 },
];

// ---------------------------------------------------------------- generation
type Put = (c: number, r: number, o: number) => void;
interface Ctx { put: Put; rnd: () => number; COLS: number; ROWS: number; cx: number; cy: number; bw: number; bh: number; amt: number; s: number; noise: (G: number) => (c: number, r: number) => number }

const MARK = [[0, .35, 1, 0], [.6, 1, 1, .5], [0, .8, 1, .25], [.2, 0, .55, 0]];
const ARROW = [[0, .2, 0, 1, 0, 0], [0, 0, 0, .55, 1, 0], [.25, .45, .7, .9, 1, 1], [0, 0, 0, .55, 1, 0], [0, 0, .15, 1, 0, .3]];

const GEN: Record<PatternName, (x: Ctx) => void> = {
  clusters({ put, rnd, COLS, ROWS, amt }) {
    const n = Math.round(40 * amt * (COLS * ROWS) / 7000);
    for (let i = 0; i < n; i++) {
      const k = rnd(), c0 = Math.floor(rnd() * COLS), r0 = Math.floor(rnd() * ROWS), base = .35 + rnd() * .65;
      if (k < .35) { (k < .17 ? MARK : ARROW).forEach((row, r) => row.forEach((v, c) => { if (v) put(c0 + c, r0 + r, base * v); })); continue; }
      const w = 2 + Math.floor(rnd() * 6), h = 2 + Math.floor(rnd() * 5);
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        const d = Math.hypot((c - (w - 1) / 2) / (w / 2), (r - (h - 1) / 2) / (h / 2));
        if (rnd() < 1.05 - d * .9) put(c0 + c, r0 + r, base * (.3 + rnd() * .7));
      }
    }
    for (let i = 0; i < n * 2.5; i++) put(Math.floor(rnd() * COLS), Math.floor(rnd() * ROWS), .15 + rnd() * .3);
  },
  dissolve({ put, rnd, COLS, ROWS, cy, bh, amt, noise }) {
    const n = noise(5);
    for (let r = 0; r < ROWS; r++) {
      const t = Math.min(1, Math.max(0, (r - (cy - bh / 2)) / bh));
      for (let c = 0; c < COLS; c++) if (rnd() < (Math.min(.95, Math.pow(t, 2.2) * (.4 + n(c, r) * 1.3)) + .01) * amt) put(c, r, .25 + t * .75 * rnd() + t * .2);
    }
  },
  burst({ put, rnd, COLS, ROWS, cx, cy, bw, bh, amt }) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const dx = (c - cx) / (bw / 2), dy = (r - cy) / (bh / 2) * .62, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const ray = Math.pow(Math.abs(Math.cos(a * 7)), 18);
      if (rnd() < (Math.max(0, .9 - d * 1.6) + ray * Math.max(0, .6 - d * .5)) * amt) put(c, r, Math.min(1, .3 + (1 - d) * .8));
    }
  },
  rings({ put, rnd, COLS, ROWS, cx, cy, amt, s }) {
    const P = Math.max(4, 6 * s), R = 34 * s;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const d = Math.hypot(c - cx, r - cy), f = Math.abs(((d + rnd() * .8) % P) - P / 2);
      if (f > P * .4 && rnd() < (.85 - d / (R * 1.75)) * amt) put(c, r, Math.max(.2, 1 - d / R));
    }
  },
  waves({ put, rnd, COLS, ROWS, cx, bw, amt, s }) {
    for (let y0 = 3; y0 < ROWS; y0 += 5 * s) {
      const amp = (2 + rnd() * 2.5) * s, k = (.12 + rnd() * .1) / s, ph = rnd() * 6;
      for (let c = 0; c < COLS; c++) {
        const y = Math.round(y0 + amp * Math.sin(c * k + ph)), fade = Math.max(0, 1 - Math.abs(c - cx) / (bw * .7));
        if (rnd() < .85 * amt) put(c, y, .2 + .8 * fade);
        if (rnd() < .25 * amt) put(c, y + 1, .2);
      }
    }
  },
  diagonal({ put, rnd, COLS, ROWS, amt, s, noise }) {
    const n = noise(6), P = 12 * s;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const band = (c + r * 1.4) % P;
      if (band < P / 3 && rnd() < (.35 + n(c, r) * .6) * amt) put(c, r, .25 + band / (P / 3) * .75 * n(c, r) + .1);
    }
  },
  galaxy({ put, rnd, COLS, ROWS, cx, cy, amt, s }) {
    for (let i = 0; i < 2600 * amt * s * s; i++) {
      const arm = i % 2, t = Math.pow(rnd(), .7) * 3.4, a = t * 1.9 + arm * Math.PI + (rnd() - .5) * .55;
      const rad = (t * 13 + (rnd() - .5) * (2 + t * 2.2)) * s;
      put(cx + Math.cos(a) * rad * 1.6, cy + Math.sin(a) * rad * .62, 1 - t / 3.6 + rnd() * .15);
    }
    for (let i = 0; i < 260 * amt * s; i++) { const a = rnd() * Math.PI * 2, rr = Math.pow(rnd(), 2) * 5 * s; put(cx + Math.cos(a) * rr * 1.6, cy + Math.sin(a) * rr * .7, 1); }
    for (let i = 0; i < 120 * amt; i++) put(rnd() * COLS, rnd() * ROWS, .15 + rnd() * .2);
  },
  helix({ put, rnd, COLS, ROWS, cy, amt, s }) {
    const A = 14 * s, K = .11 / s;
    for (let c = 0; c < COLS; c++) for (const ph of [0, Math.PI]) {
      const sn = Math.sin(c * K + ph), depth = (Math.cos(c * K + ph) + 1) / 2;
      if (rnd() < .9 * amt) put(c, cy + sn * A, .25 + depth * .75);
      if (rnd() < .35 * amt) put(c, cy + sn * A + (rnd() < .5 ? 1 : -1), .2 + depth * .3);
    }
    for (let x = 8 * s; x < COLS; x += 12 * s) {
      const k = Math.round(x / (12 * s)), ph = k % 2 ? Math.PI : 0, y = cy + Math.sin(x * K + ph) * A, size = Math.max(1, Math.round((1 + rnd() * 2) * s));
      for (let dy = -size; dy <= size; dy++) for (let dx = -size; dx <= size; dx++) if (dx * dx + dy * dy <= size * size + 1) put(x + dx, y + dy, 1);
    }
    for (let i = 0; i < 80 * amt; i++) put(rnd() * COLS, rnd() * ROWS, .15 + rnd() * .25);
  },
  constellation({ put, rnd, COLS, ROWS, cx, cy, bw, bh, amt }) {
    const nodes = Array.from({ length: Math.max(4, Math.round(11 * amt)) }, () => [cx + (rnd() - .5) * bw * .9, cy + (rnd() - .5) * bh * .8]);
    for (let i = 1; i < nodes.length; i++) {
      const [x0, y0] = nodes[i - 1], [x1, y1] = nodes[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k += 2) if (rnd() < .85) put(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, .35);
    }
    for (const [x, y] of nodes) { put(x, y, 1); put(x + 1, y, .7); put(x - 1, y, .7); put(x, y + 1, .7); put(x, y - 1, .7); }
    for (let i = 0; i < 120 * amt; i++) put(rnd() * COLS, rnd() * ROWS, .12 + rnd() * .25);
  },
  streaks({ put, rnd, COLS, ROWS, amt }) {
    for (let i = 0; i < COLS * .6 * amt; i++) {
      const c = Math.floor(rnd() * COLS), len = 5 + Math.floor(rnd() * 16), r0 = Math.floor(rnd() * (ROWS + len)) - len;
      for (let k = 0; k < len; k++) if (rnd() < .9) put(c, r0 + k, Math.pow((k + 1) / len, 1.6));
    }
  },
  skyline({ put, rnd, COLS, ROWS, amt, noise }) {
    const n = noise(5);
    for (let c = 1; c < COLS - 1; c += 2) {
      const h = Math.floor((4 + n(c, 0) * ROWS * .7 * (.6 + rnd() * .4)) * Math.min(1.4, amt));
      for (let k = 0; k < h; k++) { const t = k / h; if (rnd() < .92 - t * .3) put(c, ROWS - 1 - k, .3 + (1 - t) * .6); }
      put(c, ROWS - 2 - h - Math.floor(rnd() * 3), 1);
    }
  },
  mark({ put, rnd, COLS, ROWS, cx, cy, amt, s }) {
    const S = Math.max(2, Math.round(6 * s)), c0 = Math.round(cx - 2 * S), r0 = Math.round(cy - 2 * S);
    MARK.forEach((row, mr) => row.forEach((v, mc) => {
      if (!v) return;
      for (let r = 0; r < S - 1; r++) for (let c = 0; c < S - 1; c++) if (rnd() < (.55 + v * .45) * Math.min(1, amt)) put(c0 + mc * S + c, r0 + mr * S + r, v * (.6 + rnd() * .4));
    }));
    for (let i = 0; i < 300 * amt; i++) put(rnd() * COLS, rnd() * ROWS, .12 + rnd() * .25);
  },
  noise({ put, rnd, COLS, ROWS, amt, noise }) {
    const n = noise(4), m = noise(9);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = n(c, r) * .6 + m(c, r) * .4;
      if (v > .55 && rnd() < (v - .5) * 2.4 * amt) put(c, r, Math.min(1, (v - .45) * 2));
    }
  },
};

interface Cell { c: number; r: number; o: number; color: number; white: boolean; tw: number; ph: number; sp: number }

function generate(S: PixelFieldSettings, cols: number, rows: number): Cell[] {
  let seed = (Math.abs(Math.floor(S.seed)) % 2147483646) + 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const makeNoise = (G: number) => {
    const L = Array.from({ length: Math.ceil(rows / G) + 2 }, () => Array.from({ length: Math.ceil(cols / G) + 2 }, rnd));
    const sm = (x: number) => x * x * (3 - 2 * x);
    return (c: number, r: number) => {
      c = Math.max(0, c); r = Math.max(0, r);
      const gx = c / G, gy = r / G, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = sm(gx - x0), fy = sm(gy - y0);
      const row0 = L[Math.min(y0, L.length - 2)], row1 = L[Math.min(y0 + 1, L.length - 1)];
      const t = row0[x0] + (row0[x0 + 1] - row0[x0]) * fx, b = row1[x0] + (row1[x0 + 1] - row1[x0]) * fx;
      return t + (b - t) * fy;
    };
  };
  const step = S.pixelSize + S.gap;
  const bw = Math.max(8, Math.round(480 * S.scale / step)), bh = Math.max(6, Math.round(300 * S.scale / step));
  const s = bw / 80; // design scale in cells (1 = the original thumbnail at 6px steps)
  const map = new Map<number, number>();
  const put: Put = (c, r, o) => {
    c = Math.round(c); r = Math.round(r);
    if (c < 0 || r < 0 || c >= cols || r >= rows || o <= 0) return;
    const k = r * cols + c;
    map.set(k, Math.max(map.get(k) ?? 0, Math.min(1, o)));
  };
  GEN[S.pattern]?.({ put, rnd, COLS: cols, ROWS: rows, cx: S.focusX * (cols - 1), cy: S.focusY * (rows - 1), bw, bh, amt: S.density, s, noise: makeNoise });

  const n = Math.max(1, S.colors.length), cn = makeNoise(8);
  const cells: Cell[] = [];
  for (const [k, o] of map) {
    const c = k % cols, r = Math.floor(k / cols);
    let color = 0;
    if (S.colorMode === 'split') color = Math.min(n - 1, Math.floor(c / cols * n));
    else if (S.colorMode === 'mixed') {
      const v = (c - (S.focusX * cols - bw / 2)) / bw * .75 + cn(c, r) * .5 + (rnd() - .5) * .3;
      color = Math.min(n - 1, Math.max(0, Math.floor((v - .12) * n)));
    }
    cells.push({ c, r, o, color, white: false, tw: rnd(), ph: rnd() * Math.PI * 2, sp: .6 + rnd() * .9 });
  }
  // white sparkle pixels, picked from the brightest
  const bright = cells.filter((x) => x.o >= .75);
  for (let i = 0; i < Math.min(S.highlights, bright.length); i++) bright[Math.floor(rnd() * bright.length)].white = true;
  return cells;
}

// ---------------------------------------------------------------- drawing
/** Turns 'var(--brand-blue)' into the current value of that CSS variable (plain colours pass through). */
export function resolveColor(c: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(c.trim());
  if (!m || typeof document === 'undefined') return c;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#ffffff';
}

export interface PixelFieldInstance { update(next: Partial<PixelFieldSettings>): void; settings(): PixelFieldSettings; destroy(): void }
const STRUCTURAL: (keyof PixelFieldSettings)[] = ['pattern', 'seed', 'colors', 'colorMode', 'density', 'pixelSize', 'gap', 'scale', 'focusX', 'focusY', 'highlights'];

// still: draw one static frame (no animation, no mouse) - used for card thumbnails.
// fit: a miniature of the full hero for small spaces (card thumbnails): pixels and gaps at half
//      size, and the design shrunk to the element's width, so the whole hero reads at a glance.
export interface MountOptions { still?: boolean; fit?: boolean }

export function mount(el: HTMLElement, initial: Partial<PixelFieldSettings> = {}, opts: MountOptions = {}): PixelFieldInstance {
  const canvas = el.querySelector('canvas') ?? el.appendChild(document.createElement('canvas'));
  const ctx = canvas.getContext('2d')!;
  const mini = (x: PixelFieldSettings): PixelFieldSettings => opts.fit
    ? { ...x, pixelSize: Math.max(1, Math.round(x.pixelSize / 2)), gap: Math.max(1, Math.round(x.gap / 2)) } : x;
  let S: PixelFieldSettings = mini({ ...DEFAULTS, ...initial });
  let cells: Cell[] = [], W = 0, H = 0, cols = 0, rows = 0, dpr = 1;
  let raf = 0, visible = true, t0 = performance.now();
  const mouse = { x: -1e4, y: -1e4 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const rebuild = () => {
    const step = S.pixelSize + S.gap;
    cols = Math.ceil(W / step) + 1; rows = Math.ceil(H / step) + 1;
    const G = opts.fit ? { ...S, scale: Math.max(0.12, S.scale * Math.min(1, W / 640)) } : S;
    cells = generate(G, cols, rows);
  };
  const resize = () => {
    const r = el.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = W * dpr; canvas.height = H * dpr;
    rebuild(); draw(performance.now());
  };

  function draw(now: number) {
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H); // transparent: the page background shows through
    const step = S.pixelSize + S.gap, size = S.pixelSize;
    const a = S.driftAngle * Math.PI / 180, still = reduce.matches || !!opts.still;
    const fieldW = cols * step, fieldH = rows * step;
    const ox = still ? 0 : (Math.cos(a) * S.drift * t) % fieldW, oy = still ? 0 : (Math.sin(a) * S.drift * t) % fieldH;
    const fx = S.focusX * W, fy = S.focusY * H, vr = Math.max(.05, S.vignetteSize);
    const R = S.mouseRadius, R2 = R * R;
    let last = '';
    const palette = S.colors.map(resolveColor);
    for (const cell of cells) {
      let x = cell.c * step + ox, y = cell.r * step + oy;
      if (S.drift && !still) { x = ((x % fieldW) + fieldW) % fieldW - step; y = ((y % fieldH) + fieldH) % fieldH - step; }
      // opacity: base value mapped into [min, max]
      let alpha = S.opacityMin + cell.o * (S.opacityMax - S.opacityMin);
      // twinkle
      if (!still && cell.tw < S.twinkle) alpha *= 1 - .85 * (.5 + .5 * Math.sin(t * cell.sp * S.twinkleSpeed * 2 + cell.ph));
      // vignette around the focus point (ellipse that follows the hero's shape)
      if (S.vignette > 0) {
        const d = Math.hypot((x - fx) / (W / 2), (y - fy) / (H / 2));
        alpha *= 1 - S.vignette * Math.min(1, Math.max(0, (d - vr * .45) / (vr * .75)));
      }
      // fade into the page at the top / bottom
      if (S.fadeTop > 0) alpha *= Math.min(1, y / (H * S.fadeTop * .6 + 1));
      if (S.fadeBottom > 0) alpha *= Math.min(1, (H - y) / (H * S.fadeBottom * .6 + 1));
      // mouse
      if (S.mouse !== 'none' && !still) {
        const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const k = 1 - Math.sqrt(d2) / R;
          if (S.mouse === 'glow') alpha = Math.min(1, alpha + k * .7);
          else { const d = Math.sqrt(d2) || 1; x += dx / d * k * R * .35; y += dy / d * k * R * .35; }
        }
      }
      if (alpha <= .01) continue;
      const fill = cell.white ? '#ffffff' : palette[cell.color] ?? palette[0];
      if (fill !== last) { ctx.fillStyle = fill; last = fill; }
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    ctx.globalAlpha = 1;
  }
  const animates = () => !opts.still && !reduce.matches && (S.twinkle > 0 || S.drift !== 0 || S.mouse !== 'none');
  const loop = (now: number) => { draw(now); raf = visible && animates() ? requestAnimationFrame(loop) : 0; };
  const start = () => { if (!raf && visible && animates()) raf = requestAnimationFrame(loop); };

  const ro = new ResizeObserver(resize); ro.observe(el);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }); io.observe(el);
  const onMove = (e: PointerEvent) => { const r = el.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; if (!raf) draw(performance.now()); };
  const onLeave = () => { mouse.x = mouse.y = -1e4; };
  if (!opts.still) { addEventListener('pointermove', onMove); document.addEventListener('pointerleave', onLeave); }
  // redraw when the site's spot colours change (colour pickers)
  const onBrand = () => draw(performance.now());
  addEventListener('astropia:brand', onBrand);
  resize(); start();

  return {
    update(next) {
      const structural = STRUCTURAL.some((k) => k in next && JSON.stringify(next[k]) !== JSON.stringify(S[k]));
      S = { ...S, ...next };
      if (structural) rebuild();
      draw(performance.now()); start();
    },
    settings: () => ({ ...S }),
    destroy() { removeEventListener('astropia:brand', onBrand); cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); },
  };
}
