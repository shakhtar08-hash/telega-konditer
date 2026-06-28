import { z } from "zod";

export const photoshootOutputSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string(),
});

export type PhotoshootOutput = z.infer<typeof photoshootOutputSchema>;
