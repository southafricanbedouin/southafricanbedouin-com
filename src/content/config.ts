import { defineCollection, z } from 'astro:content';

const baseera = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    edition: z.number(),
    date: z.string(),
    article: z.string(),
    articleUrl: z.string().optional(),
    author: z.string().optional(),
    finding: z.string(),
    pattern: z.string(),
    signal: z.string(),
    tags: z.array(z.string()).optional(),
    linkedinUrl: z.string().optional(),
  }),
});

export const collections = { baseera };
