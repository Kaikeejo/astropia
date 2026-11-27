// Every hero engine, loaded only when a page needs it (so a page with Pixel heroes never
// downloads the Space code, and the other way round).
import type { HeroInstance, MountOptions } from './runtime';

type Mount = (el: HTMLElement, settings?: Record<string, any>, opts?: MountOptions) => HeroInstance;
const ENGINES: Record<string, () => Promise<{ mount: Mount }>> = {
  'pixel-field': () => import('./pixel-field/engine') as any,
  warp: () => import('./space/warp') as any,
  constellation: () => import('./space/constellation') as any,
  orbits: () => import('./space/orbits') as any,
  nebula: () => import('./space/nebula') as any,
  'black-hole': () => import('./space/black-hole') as any,
};

export type HeroEl = HTMLElement & { hero?: HeroInstance; heroReady?: Promise<HeroInstance> };

/** Starts a hero engine on an element (with a <canvas> inside, or one is added). */
export async function mountHero(engine: string, el: HTMLElement, settings: Record<string, any> = {}, opts: MountOptions = {}) {
  const load = ENGINES[engine];
  if (!load) throw new Error(`Unknown hero engine: ${engine}`);
  const { mount } = await load();
  return mount(el, settings, opts);
}
