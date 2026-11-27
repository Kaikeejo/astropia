// Shared runtime for canvas heroes: one place that handles the canvas, sharp pixels on retina,
// resizing, pausing off-screen, reduced motion, the mouse, the site's spot colours and thumbnails.
// Each hero engine only describes how to set up its scene and how to draw one frame.

/** A control in the playground panel (also used to build "copy code" later). */
export type Ctrl =
  | { group: string }
  | { key: string; label: string; type: 'range'; min: number; max: number; step: number }
  | { key: string; label: string; type: 'select'; options: string[] }
  | { key: 'colors'; label: string; type: 'colors' };

export interface HeroInstance<S = Record<string, any>> {
  update(next: Partial<S>): void;
  settings(): S;
  destroy(): void;
}

/** still: draw one frame, no animation (card thumbnails). fit: draw a miniature of the full hero. */
export interface MountOptions { still?: boolean; fit?: boolean }

/** Turns 'var(--brand-blue)' into that CSS variable's current value (plain colours pass through). */
export function resolveColor(c: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(c.trim());
  if (!m || typeof document === 'undefined') return c;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#ffffff';
}

/** '#4c8dff' -> [76, 141, 255] */
export function toRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
}
export const rgba = (rgb: [number, number, number], a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a))})`;
/** mix two colours, t = 0..1 */
export const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round) as [number, number, number];

/** Small seeded random number generator, so a seed always gives the same scene. */
export function random(seed: number) {
  let a = (Math.floor(seed) * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Frame {
  ctx: CanvasRenderingContext2D;
  /** drawing size in CSS pixels (in a thumbnail: the size of the full hero it's a miniature of) */
  W: number;
  H: number;
  /** seconds of animation so far, and since the last frame */
  t: number;
  dt: number;
  /** mouse position in drawing pixels; `on` is false when it's away */
  mouse: { x: number; y: number; on: boolean };
  /** true for thumbnails and reduced motion: draw a nice still moment */
  still: boolean;
  /** the hero's colours as RGB, resolved from the site's spot colours */
  colors: [number, number, number][];
}

export interface EngineDef<S, St> {
  defaults: S;
  /** settings that rebuild the scene when changed (others just change how it's drawn) */
  structural: (keyof S)[];
  setup(s: S, W: number, H: number, rnd: () => number): St;
  frame(st: St, s: S, f: Frame): void;
  /** the moment (seconds) shown in thumbnails and with reduced motion */
  stillTime?: number;
}

const FIT_WIDTH = 480; // thumbnails draw the hero as if it were this wide, then scale it down

export function createEngine<S extends { seed: number; colors: string[] }, St>(def: EngineDef<S, St>) {
  return function mount(el: HTMLElement, initial: Partial<S> = {}, opts: MountOptions = {}): HeroInstance<S> {
    const canvas = el.querySelector('canvas') ?? el.appendChild(document.createElement('canvas'));
    const ctx = canvas.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let S: S = { ...def.defaults, ...initial };
    let st: St;
    let W = 0, H = 0, zoom = 1, dpr = 1, t = def.stillTime ?? 3, last = 0, raf = 0, visible = true;
    const mouse = { x: -1e4, y: -1e4, on: false };
    const still = () => !!opts.still || reduce.matches;

    const build = () => { st = def.setup(S, W, H, random(S.seed)); };
    const resize = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, devicePixelRatio || 1);
      zoom = opts.fit ? Math.min(1, w / FIT_WIDTH) : 1;
      W = w / zoom; H = h / zoom;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      build(); draw(0);
    };
    function draw(dt: number) {
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
      ctx.clearRect(0, 0, W, H); // transparent: the page shows through
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      def.frame(st, S, { ctx, W, H, t, dt, mouse, still: still(), colors: S.colors.map((c) => toRgb(resolveColor(c))) });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    const loop = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now; t += dt;
      draw(dt);
      raf = visible && !still() ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf && visible && !still()) { last = 0; raf = requestAnimationFrame(loop); } };

    const ro = new ResizeObserver(resize); ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }); io.observe(el);
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / zoom; mouse.y = (e.clientY - r.top) / zoom;
      mouse.on = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    const onLeave = () => { mouse.on = false; };
    const onBrand = () => draw(0);
    if (!opts.still) { addEventListener('pointermove', onMove); document.addEventListener('pointerleave', onLeave); }
    addEventListener('astropia:brand', onBrand);
    reduce.addEventListener?.('change', () => { draw(0); start(); });
    resize(); start();

    return {
      update(next) {
        const rebuild = def.structural.some((k) => k in next && JSON.stringify(next[k]) !== JSON.stringify(S[k]));
        S = { ...S, ...next };
        if (rebuild) build();
        draw(0); start();
      },
      settings: () => ({ ...S }),
      destroy() {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave);
        removeEventListener('astropia:brand', onBrand);
      },
    };
  };
}

/** Soft round glow sprite (cached), for nebula dust and glows. */
const sprites = new Map<string, HTMLCanvasElement>();
export function glowSprite(rgb: [number, number, number], hard = 0.15): HTMLCanvasElement {
  const key = rgb.join(',') + '|' + hard;
  let c = sprites.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgba(rgb, 1)); grad.addColorStop(hard, rgba(rgb, 0.8)); grad.addColorStop(0.5, rgba(rgb, 0.25)); grad.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  sprites.set(key, c);
  return c;
}

export const COLORS_DEFAULT = ['var(--brand-blue)', 'var(--brand-pink)'];
export const WHITE: [number, number, number] = [255, 255, 255];
