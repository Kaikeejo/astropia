// Builds one static SVG file per pixel thumbnail at build time (e.g. /patterns/rays.svg).
// Cards reference these as images, so each design downloads once and is cached,
// instead of repeating thousands of pixels inside the page HTML for every card.
import type { APIRoute, GetStaticPaths } from 'astro';
import { W, H, pixelPattern } from '../../lib/pixelPatterns';
import type { PatternName } from '../../lib/patterns';

const NAMES: PatternName[] = ['grid', 'angled', 'wavy', 'circles', 'dots', 'rays', 'squares', 'horizon', 'galaxy', 'helix', 'constellation', 'streaks', 'skyline'];

export const getStaticPaths: GetStaticPaths = () => NAMES.map((name) => ({ params: { name } }));

export const GET: APIRoute = ({ params }) => {
  const layers = pixelPattern(params.name as PatternName);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    layers.map((l) => `<path d="${l.d}" fill="${l.fill}" fill-opacity="${l.opacity}"/>`).join('') + `</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
