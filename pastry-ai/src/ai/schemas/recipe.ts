import { z } from "zod";

export const recipeOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

export type RecipeOutput = z.infer<typeof recipeOutputSchema>;
