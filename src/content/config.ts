import { z, defineCollection } from "astro:content";

const episodeCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    episode: z.number().int(),
    date: z.string().transform((str) => new Date(str)),
    audioFile: z.string(),
    length: z.string().regex(/(\d{2}:){2}\d{2}/),
    bytes: z.string(),
  }),
});

export const collections = {
  episodes: episodeCollection,
};
