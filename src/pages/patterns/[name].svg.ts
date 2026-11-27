// Builds static SVG masks for each pixel thumbnail at build time, one per tone
// (e.g. /patterns/rays-blue.svg, /patterns/rays-pink.svg, /patterns/rays-white.svg).
// Pattern.astro paints each mask with the site's spot colour, so the colour pickers recolour them.
import type { APIRoute, GetStaticPaths } from 'astro';
import { W, H, pixelPattern } from '../../lib/pixelPatterns';
import type { PatternName } from '../../lib/patterns';

const NAMES: PatternName[] = ['grid', 'angled', 'wavy', 'circles', 'dots', 'rays', 'squares', 'horizon', 'galaxy', 'helix', 'constellation', 'streaks', 'skyline'];
const TONES = ['blue', 'pink', 'white'];

export const getStaticPaths: GetStaticPaths = () => NAMES.flatMap((name) => TONES.map((tone) => ({ params: { name: `${name}-${tone}` } })));

export const GET: APIRoute = ({ params }) => {
  const [, name, tone] = /^(.+)-(blue|pink|white)$/.exec(params.name!)!;
  const layers = pixelPattern(name as PatternName).filter((l) => l.fill === tone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    layers.map((l) => `<path d="${l.d}" fill-opacity="${l.opacity}"/>`).join('') + `</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
