import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const pattern = z.enum(['grid', 'angled', 'wavy', 'circles', 'dots', 'rays', 'squares', 'horizon', 'galaxy', 'helix', 'constellation', 'streaks', 'skyline']);

const heroes = defineCollection({
  loader: file('src/data/heroes.json'),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    category: z.string(),
    price: z.enum(['Free', 'Pro']),
    isNew: z.boolean().default(false), // shows a NEW tag on the card
    added: z.string(), // date added (YYYY-MM-DD), used by the Newest / Oldest sort
    pattern,
    likes: z.number(),
    order: z.number(),
    engine: z.enum(['pixel-field', 'warp', 'constellation', 'orbits', 'nebula', 'black-hole']).optional(), // live hero: gets its own page at /heroes/<id>
    settings: z.record(z.string(), z.any()).optional(), // engine settings (preset) for this hero
  }),
});

const featured = defineCollection({
  loader: file('src/data/featured.json'),
  schema: z.object({
    name: z.string(),
    badge: z.string(),
    headline: z.string(),
    description: z.string(),
    file: z.string(),
    accent: z.enum(['blue', 'pink']).default('blue'), // card glow + Learn more colour
    pattern,
    order: z.number(),
  }),
});

const categories = defineCollection({
  loader: file('src/data/categories.json'),
  schema: z.object({ name: z.string(), count: z.number(), pattern, order: z.number() }),
});

const spotlight = defineCollection({
  loader: file('src/data/spotlight.json'),
  schema: z.object({ name: z.string(), initials: z.string(), role: z.string(), patterns: z.array(pattern).length(3), order: z.number() }),
});

export const collections = { heroes, featured, categories, spotlight };
