// Pixel thumbnails (blue + pink), same designs as the Figma "Pixel Thumbnails v1" board.
// 4px squares on a 6px grid, on the same 640x400 canvas as the old line patterns
// (centered and cropped in each thumbnail, never stretched), so pixels stay 4px everywhere.
// The old line patterns live in patterns.ts / PatternLines.astro as a backup.
// Featured + Spotlight designs (galaxy, helix, constellation, streaks, skyline) are drawn inside a
// box the size of their Figma thumbnail, centered on the canvas.
import type { PatternName } from './patterns';

export const W = 640;
export const H = 400;
const STEP = 6, CELL = 4;
const COLS = Math.floor(W / STEP), ROWS = Math.floor(H / STEP);
const OX = (W - COLS * STEP + (STEP - CELL)) / 2, OY = (H - ROWS * STEP + (STEP - CELL)) / 2;
const cx = (COLS - 1) / 2, cy = (ROWS - 1) / 2;
// the "core" is the part a small card thumbnail shows (≈ the Figma 320x200 thumbnail)
const CORE_W = 53, CORE_H = 33;
// tones, not colours: each tone becomes its own SVG mask, filled with the site's CSS colour
const BLUE = 'blue', PINK = 'pink';
// single-colour designs (match the Featured card accents: Particle Galaxy = blue, Solar System = pink)
const SOLO: Record<string, string> = { galaxy: BLUE, helix: PINK };

type Put = (c: number, r: number, o: number) => void;
type Rnd = () => number;

function makeNoise(rnd: Rnd, G: number) {
  const L = Array.from({ length: Math.ceil(ROWS / G) + 2 }, () => Array.from({ length: Math.ceil(COLS / G) + 2 }, rnd));
  const sm = (x: number) => x * x * (3 - 2 * x);
  return (c: number, r: number) => {
    const gx = c / G, gy = r / G, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = sm(gx - x0), fy = sm(gy - y0);
    const t = L[y0][x0] + (L[y0][x0 + 1] - L[y0][x0]) * fx;
    const b = L[y0 + 1][x0] + (L[y0 + 1][x0 + 1] - L[y0 + 1][x0]) * fx;
    return t + (b - t) * fy;
  };
}

const MARK = [[0, .35, 1, 0], [.6, 1, 1, .5], [0, .8, 1, .25], [.2, 0, .55, 0]];
const ARROW = [[0, .2, 0, 1, 0, 0], [0, 0, 0, .55, 1, 0], [.25, .45, .7, .9, 1, 1], [0, 0, 0, .55, 1, 0], [0, 0, .15, 1, 0, .3]];

const generators: Record<string, (put: Put, rnd: Rnd) => void> = {
  clusters(put, rnd) {
    for (let i = 0; i < 40; i++) {
      const k = rnd(), c0 = Math.floor(rnd() * (COLS - 7)), r0 = Math.floor(rnd() * (ROWS - 6)), base = .35 + rnd() * .65;
      if (k < .35) { const s = k < .17 ? MARK : ARROW; s.forEach((row, r) => row.forEach((v, c) => { if (v) put(c0 + c, r0 + r, base * v); })); }
      else {
        const w = 2 + Math.floor(rnd() * 6), h = 2 + Math.floor(rnd() * 5);
        for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
          const d = Math.hypot((c - (w - 1) / 2) / (w / 2), (r - (h - 1) / 2) / (h / 2));
          if (rnd() < 1.05 - d * .9) put(c0 + c, r0 + r, base * (.3 + rnd() * .7));
        }
      }
    }
    for (let i = 0; i < 100; i++) put(Math.floor(rnd() * COLS), Math.floor(rnd() * ROWS), .15 + rnd() * .3);
  },
  dissolve(put, rnd) {
    const n = makeNoise(rnd, 5);
    for (let r = 0; r < ROWS; r++) {
      const t = Math.min(1, Math.max(0, (r - (cy - CORE_H / 2)) / CORE_H)); // 0 at the core top .. 1 at the core bottom
      for (let c = 0; c < COLS; c++) {
        const p = Math.min(.95, Math.pow(t, 2.2) * (.4 + n(c, r) * 1.3)) + .01;
        if (rnd() < p) put(c, r, .25 + t * .75 * rnd() + t * .2);
      }
    }
  },
  burst(put, rnd) {
    const hx = CORE_W / 2, hy = CORE_H / 2;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const dx = (c - cx) / hx, dy = (r - cy) / hy * .62, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const ray = Math.pow(Math.abs(Math.cos(a * 7)), 18);
      const p = Math.max(0, .9 - d * 1.6) + ray * Math.max(0, .6 - d * .5);
      if (rnd() < p) put(c, r, Math.min(1, .3 + (1 - d) * .8));
    }
  },
  rings(put, rnd) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const d = Math.hypot(c - cx, r - cy), f = Math.abs(((d + rnd() * .8) % 6) - 3);
      if (f > 2.4 && rnd() < .85 - d / 60) put(c, r, Math.max(.2, 1 - d / 34));
    }
  },
  waves(put, rnd) {
    for (let y0 = 3; y0 < ROWS; y0 += 5) {
      const amp = 2 + rnd() * 2.5, k = .12 + rnd() * .1, ph = rnd() * 6;
      for (let c = 0; c < COLS; c++) {
        const y = Math.round(y0 + amp * Math.sin(c * k + ph)), fade = Math.max(0, 1 - Math.abs(c - cx) / (CORE_W * .7));
        if (rnd() < .85) put(c, y, .2 + .8 * fade);
        if (rnd() < .25) put(c, y + 1, .2);
      }
    }
  },
  diagonal(put, rnd) {
    const n = makeNoise(rnd, 6);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const band = (c + r * 1.4) % 12;
      if (band < 4 && rnd() < .35 + n(c, r) * .6) put(c, r, .25 + band / 4 * .75 * n(c, r) + .1);
    }
  },
  mark(put, rnd) {
    const S = 6, c0 = Math.round(cx - 2 * S), r0 = Math.round(cy - 2 * S) + 1;
    MARK.forEach((row, mr) => row.forEach((v, mc) => {
      if (!v) return;
      for (let r = 0; r < S - 1; r++) for (let c = 0; c < S - 1; c++) if (rnd() < .55 + v * .45) put(c0 + mc * S + c, r0 + mr * S + r, v * (.6 + rnd() * .4));
    }));
    for (let i = 0; i < 240; i++) put(Math.floor(rnd() * COLS), Math.floor(rnd() * ROWS), .12 + rnd() * .25);
  },
  noise(put, rnd) {
    const n = makeNoise(rnd, 4), m = makeNoise(rnd, 9);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = n(c, r) * .6 + m(c, r) * .4;
      if (v > .55 && rnd() < (v - .5) * 2.4) put(c, r, Math.min(1, (v - .45) * 2));
    }
  },
};

// existing pattern names (used in the data files) -> pixel design
const MAP: Record<string, keyof typeof generators> = {
  grid: 'clusters', horizon: 'dissolve', rays: 'burst', circles: 'rings',
  wavy: 'waves', angled: 'diagonal', squares: 'mark', dots: 'noise',
};

// ---- Featured + Spotlight designs: drawn in a box (Figma thumbnail size), centered on the canvas ----
type Box = { put: Put; rnd: Rnd; COLS: number; ROWS: number; cx: number; cy: number; noise: (G: number) => (c: number, r: number) => number };
const boxed: Record<string, { w: number; h: number; gen: (b: Box) => void }> = {
  galaxy: { w: 664, h: 272, gen: ({ put, rnd, cx, cy }) => {
    for (let i = 0; i < 2600; i++) {
      const arm = i % 2, t = Math.pow(rnd(), 0.7) * 3.4, a = t * 1.9 + arm * Math.PI + (rnd() - .5) * .55;
      const rad = t * 13 + (rnd() - .5) * (2 + t * 2.2);
      put(cx + Math.cos(a) * rad * 1.6, cy + Math.sin(a) * rad * .62, 1 - t / 3.6 + rnd() * .15);
    }
    for (let i = 0; i < 260; i++) { const a = rnd() * Math.PI * 2, rr = Math.pow(rnd(), 2) * 5; put(cx + Math.cos(a) * rr * 1.6, cy + Math.sin(a) * rr * .7, 1); }
    for (let i = 0; i < 90; i++) put(rnd() * 200, rnd() * 80, .15 + rnd() * .2);
  } },
  helix: { w: 664, h: 272, gen: ({ put, rnd, COLS, cy }) => {
    for (let c = 0; c < COLS; c++) for (const ph of [0, Math.PI]) {
      const s = Math.sin(c * .11 + ph), depth = (Math.cos(c * .11 + ph) + 1) / 2;
      if (rnd() < .9) put(c, cy + s * 14, .25 + depth * .75);
      if (rnd() < .35) put(c, cy + s * 14 + (rnd() < .5 ? 1 : -1), .2 + depth * .3);
    }
    for (let k = 0; k < 9; k++) {
      const c = 8 + k * 12 + rnd() * 3, ph = k % 2 ? Math.PI : 0, y = cy + Math.sin(c * .11 + ph) * 14, size = 1 + Math.floor(rnd() * 3);
      for (let dy = -size; dy <= size; dy++) for (let dx = -size; dx <= size; dx++) if (dx * dx + dy * dy <= size * size + 1) put(c + dx, y + dy, 1);
    }
    for (let i = 0; i < 70; i++) put(rnd() * COLS, rnd() * 45, .15 + rnd() * .25);
  } },
  constellation: { w: 432, h: 280, gen: ({ put, rnd, COLS, ROWS, cx, cy }) => {
    const nodes = Array.from({ length: 11 }, () => [cx + (rnd() - .5) * COLS * .75, cy + (rnd() - .5) * ROWS * .7]);
    for (let i = 1; i < nodes.length; i++) {
      const [x0, y0] = nodes[i - 1], [x1, y1] = nodes[(i * 3) % nodes.length === i ? i - 1 : i];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= n; s++) if (s % 2 === 0 && rnd() < .85) put(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n, .35);
    }
    for (const [x, y] of nodes) { put(x, y, 1); put(x + 1, y, .7); put(x - 1, y, .7); put(x, y + 1, .7); put(x, y - 1, .7); }
    for (let i = 0; i < 80; i++) put(rnd() * COLS, rnd() * ROWS, .12 + rnd() * .25);
  } },
  streaks: { w: 432, h: 280, gen: ({ put, rnd, COLS, ROWS }) => {
    for (let i = 0; i < 34; i++) {
      const c = Math.floor(rnd() * COLS), len = 5 + Math.floor(rnd() * 16), r0 = Math.floor(rnd() * (ROWS + len)) - len;
      for (let k = 0; k < len; k++) if (rnd() < .9) put(c, r0 + k, Math.pow((k + 1) / len, 1.6));
    }
  } },
  skyline: { w: 432, h: 280, gen: ({ put, rnd, COLS, ROWS, noise }) => {
    const n = noise(5);
    for (let c = 2; c < COLS - 2; c += 2) {
      const h = Math.floor(4 + n(c, 0) * ROWS * .85 * (.6 + rnd() * .4));
      for (let k = 0; k < h; k++) { const t = k / h; if (rnd() < .92 - t * .3) put(c, ROWS - 1 - k, .3 + (1 - t) * .6); }
      put(c, ROWS - 1 - h - 1 - Math.floor(rnd() * 3), 1);
    }
  } },
};

export type PixelLayer = { d: string; fill: string; opacity: number };

/** Paths for one thumbnail, grouped by colour and opacity level so the SVG stays small. */
export function pixelPattern(name: PatternName): PixelLayer[] {
  const isBoxed = name in boxed;
  const keyName = isBoxed ? name : MAP[name as keyof typeof MAP];
  let seed = isBoxed ? 5000 + Object.keys(boxed).indexOf(name) * 104729 : 1000 + Object.keys(generators).indexOf(keyName) * 7919;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // the area the design is drawn in (in cells), centered on the canvas
  const bw = isBoxed ? Math.floor(boxed[name].w / STEP) : COLS, bh = isBoxed ? Math.floor(boxed[name].h / STEP) : ROWS;
  const c0 = Math.round((COLS - bw) / 2), r0 = Math.round((ROWS - bh) / 2);
  const cells = new Map<string, number>();
  const put: Put = (c, r, o) => {
    c = Math.round(c) + c0; r = Math.round(r) + r0;
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS || o <= 0) return;
    const k = c + ',' + r;
    cells.set(k, Math.max(cells.get(k) ?? 0, Math.min(1, o)));
  };
  if (isBoxed) {
    boxed[name].gen({ put, rnd, COLS: bw, ROWS: bh, cx: (bw - 1) / 2, cy: (bh - 1) / 2, noise: (G) => makeNoise(rnd, G) });
  } else {
    generators[keyName](put, rnd);
  }
  // Featured + Spotlight designs: a couple of white "highlight" pixels, picked from the brightest cells
  // (own random sequence, so the rest of the design stays exactly the same)
  const white = new Set<string>();
  if (isBoxed) {
    let s2 = 777 + Object.keys(boxed).indexOf(name) * 31;
    const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    const bright = [...cells].filter(([, o]) => o >= 0.75).map(([k]) => k);
    while (white.size < Math.min(5, bright.length)) white.add(bright[Math.floor(r2() * bright.length)]);
    // a few designs get extra white pixels in the planet / cluster nearest the middle of the thumbnail
    const CENTER_EXTRA: Record<string, number> = { helix: 2 };
    const extra = CENTER_EXTRA[name] ?? 0;
    if (extra) {
      const mid = (k: string) => { const [c, r] = k.split(',').map(Number); return Math.hypot(c - cx, r - cy); };
      const near = bright.filter((k) => !white.has(k)).sort((a, b) => mid(a) - mid(b));
      // spread them out a little (skip direct neighbours) so they read as separate sparkles
      for (const k of near) {
        if (white.size >= 5 + extra) break;
        const [c, r] = k.split(',').map(Number);
        const tooClose = [...white].some((w) => { const [wc, wr] = w.split(',').map(Number); return Math.abs(wc - c) <= 1 && Math.abs(wr - r) <= 1; });
        if (!tooClose) white.add(k);
      }
    }
  }
  // each pixel is pure blue or pure pink (never blended): blue leans left, pink leans right
  const colorNoise = makeNoise(rnd, 8);
  const LEVELS = 6, groups = new Map<string, string>();
  const spanStart = isBoxed ? c0 : cx - CORE_W / 2, span = isBoxed ? bw : CORE_W;
  for (const [k, o] of cells) {
    const [c, r] = k.split(',').map(Number);
    const mixed = ((c - spanStart) / span * .75 + colorNoise(c, r) * .5 + (rnd() - .5) * .3) > .62 ? PINK : BLUE;
    const fill = white.has(k) ? 'white' : SOLO[name] ?? mixed;
    const lvl = white.has(k) ? LEVELS - 1 : Math.min(LEVELS - 1, Math.floor(o * LEVELS));
    const g = fill + '|' + lvl;
    groups.set(g, (groups.get(g) ?? '') + `M${OX + c * STEP} ${OY + r * STEP}h${CELL}v${CELL}h-${CELL}z`);
  }
  return [...groups].map(([g, d]) => {
    const [fill, lvl] = g.split('|');
    return { d, fill, opacity: +(.25 + ((+lvl + .5) / LEVELS) * .75).toFixed(3) };
  });
}
