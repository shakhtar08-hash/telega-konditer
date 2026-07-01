import { z } from "zod";

const confidenceLevelSchema = z.enum(["high", "medium", "low"]);
const difficultyLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "professional",
]);

export const visionOutputSchema = z.object({
  chefTips: z.array(z.string()).min(1),
  composition: z.object({
    base: z.array(z.string()),
    coating: z.array(z.string()),
    cream: z.array(z.string()),
    decor: z.array(z.string()),
    filling: z.array(z.string()),
  }),
  confidence: z.object({
    level: confidenceLevelSchema,
    reason: z.string(),
  }),
  difficulty: z.object({
    level: difficultyLevelSchema,
    reason: z.string(),
  }),
  fillingHypotheses: z.array(z.string()),
  recipeIdea: z.object({
    ingredients: z.array(z.string()).min(1),
    method: z.array(z.string()).min(1),
    title: z.string(),
  }),
  similarDesserts: z.array(z.string()).min(1),
  summary: z.string(),
  techniques: z.array(z.string()).min(1),
});

export type VisionOutput = z.infer<typeof visionOutputSchema>;
