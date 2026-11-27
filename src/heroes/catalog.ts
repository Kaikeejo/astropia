// Defaults + playground controls for every engine (used at build time by the hero pages).
import type { Ctrl } from './runtime';
import * as pixel from './pixel-field/engine';
import * as warp from './space/warp';
import * as constellation from './space/constellation';
import * as nebula from './space/nebula';
import * as blackHole from './space/black-hole';

export const CATALOG: Record<string, { defaults: Record<string, any>; controls: Ctrl[] }> = {
  'pixel-field': { defaults: pixel.DEFAULTS, controls: pixel.CONTROLS },
  warp: { defaults: warp.DEFAULTS, controls: warp.CONTROLS },
  constellation: { defaults: constellation.DEFAULTS, controls: constellation.CONTROLS },
  nebula: { defaults: nebula.DEFAULTS, controls: nebula.CONTROLS },
  'black-hole': { defaults: blackHole.DEFAULTS, controls: blackHole.CONTROLS },
};
export const ENGINE_NAMES = Object.keys(CATALOG) as [string, ...string[]];
