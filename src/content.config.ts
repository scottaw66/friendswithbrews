import { z, defineCollection } from "astro:content";
import { glob } from "astro/loaders";

export const collections = {
  episodes: defineCollection({
    loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/episodes" }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      episode: z.number().int(),
      date: z.string().transform((str) => new Date(str)),
      audioFile: z.string(),
      length: z.string().regex(/(\d{2}:){2}\d{2}/),
      bytes: z.string(),
    }),
  }),
  transcripts: defineCollection({
    loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/transcripts" }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      episode: z.number().int(),
      date: z.string().transform((str) => new Date(str)),
      audioFile: z.string(),
      length: z.string().regex(/(\d{2}:){2}\d{2}/),
      bytes: z.string().optional(),
    }),
  }),
};
