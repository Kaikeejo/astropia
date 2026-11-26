# Astropia

Animated, copy-paste hero sections for Astro. Built from the Astropia Figma file.

## Run it

```bash
npm install     # first time only
npm run dev     # http://localhost:4321
```

## Where things live

| What | File |
|---|---|
| Colors, spacing, radius, gradients, fonts (= Figma variables) | `src/styles/tokens.css` |
| Text styles H1–H6, Paragraph, Accent (= Figma text styles) | `src/styles/global.css` |
| Content: heroes, featured, categories, spotlight | `src/data/*.json` |
| Page sections (Navbar, Hero, Fresh Heroes, …) | `src/components/sections/` |
| Cards (Hero, Featured, Category, Spotlight) | `src/components/cards/` |
| Small parts (Button, Chip, Icon, Pattern, Pixel icons, Starfield) | `src/components/ui/` |
| The 8 thumbnail patterns | `src/lib/patterns.ts` |
| Homepage | `src/pages/index.astro` |

## Common edits

- **Add a hero card:** add an entry to `src/data/heroes.json` (`pattern` is one of grid, angled, wavy, circles, dots, rays, squares, horizon).
- **Change a color everywhere:** edit it in `src/styles/tokens.css`.
- **Reorder sections:** move the lines in `src/pages/index.astro`.
