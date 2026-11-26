import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const pattern = z.enum(['grid', 'angled', 'wavy', 'circles', 'dots', 'rays', 'squares', 'horizon']);

const heroes = defineCollection({
  loader: file('src/data/heroes.json'),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    category: z.string(),
    price: z.enum(['Free', 'Pro']),
    pattern,
    likes: z.number(),
    order: z.number(),
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
