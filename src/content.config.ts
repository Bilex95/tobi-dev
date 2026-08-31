import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/caseStudies' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    role: z.string(),
    timeframe: z.string(),
    stack: z.array(z.string()),
    repo: z.string().url(),
    summary: z.string(),
    order: z.number().int().positive(),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { caseStudies, blog };
