import { z } from "zod";

export const photoshootImageSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string(),
  styleId: z.string(),
  styleName: z.string(),
});

export const photoshootOutputSchema = z.object({
  images: z.array(photoshootImageSchema),
});

export type PhotoshootImage = z.infer<typeof photoshootImageSchema>;
export type PhotoshootOutput = z.infer<typeof photoshootOutputSchema>;
