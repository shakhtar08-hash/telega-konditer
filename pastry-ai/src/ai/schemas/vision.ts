import { z } from "zod";

export const visionOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  similarRecipe: z.string(),
});

export type VisionOutput = z.infer<typeof visionOutputSchema>;
