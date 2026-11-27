// BACKUP: original line thumbnails (used by PatternLines.astro). Path data for the 8 thumbnail patterns. Same geometry as the Figma "Thumbnail Pattern" component:
// a 640x400 canvas, centered and cropped (never stretched) inside each thumbnail.
export type LinePatternName = 'grid' | 'angled' | 'wavy' | 'circles' | 'dots' | 'rays' | 'squares' | 'horizon';
// the 5 newer designs only exist as pixel thumbnails; in the line backup they borrow the closest line pattern
export type PatternName = LinePatternName | 'galaxy' |'helix' |'constellation' |'streaks' |'skyline';
const LINE_FALLBACK: Record<string, LinePatternName> = { galaxy: 'rays', helix: 'circles', constellation: 'dots', streaks: 'angled', skyline: 'horizon' };

export const W = 640;
export const H = 400;
const cx = W / 2;
const cy = H / 2;

export function patternPath(pattern: PatternName): { d: string; filled?: boolean } {
  const name: LinePatternName = (LINE_FALLBACK[pattern] ?? pattern) as LinePatternName;
  let d = '';
  switch (name) {
    case 'grid':
      for (let x = 0; x <= W; x += 16) d += `M${x} 0V${H}`;
      for (let y = 8; y <= H; y += 16) d += `M0 ${y}H${W}`;
      return { d };
    case 'angled':
      for (let k = -H; k <= W; k += 24) d += `M${k} ${H}L${k + H} 0`;
      return { d };
    case 'wavy':
      for (let y = 16; y <= H; y += 24) {
        d += `M0 ${y}`;
        for (let x = 0; x < W; x += 64) d += `Q${x + 16} ${y - 10} ${x + 32} ${y}T${x + 64} ${y}`;
      }
      return { d };
    case 'circles':
      for (let r = 24; r <= 480; r += 32) d += `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
      return { d };
    case 'dots':
      for (let y = 8; y <= H; y += 16) for (let x = 8; x <= W; x += 16) d += `M${x - 1.5} ${y}a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0`;
      return { d, filled: true };
    case 'rays':
      for (let i = 0; i < 48; i++) {
        const a = (i * Math.PI * 2) / 48;
        d += `M${(cx + Math.cos(a) * 24).toFixed(1)} ${(cy + Math.sin(a) * 24).toFixed(1)}L${(cx + Math.cos(a) * 520).toFixed(1)} ${(cy + Math.sin(a) * 520).toFixed(1)}`;
      }
      return { d };
    case 'squares':
      for (let r = 16; r <= 420; r += 32) d += `M${cx - r} ${cy - r}h${2 * r}v${2 * r}h${-2 * r}Z`;
      return { d };
    case 'horizon': {
      const hy = 96;
      for (let i = -20; i <= 20; i++) d += `M${cx} ${hy}L${cx + i * 64} ${H + 40}`;
      let y = hy + 6, step = 6;
      while (y < H + 40) { d += `M0 ${y.toFixed(1)}H${W}`; step *= 1.35; y += step; }
      return { d };
    }
  }
}
