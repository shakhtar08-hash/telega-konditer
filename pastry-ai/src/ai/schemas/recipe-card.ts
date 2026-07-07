import { z } from "zod";

export const recipeCardIngredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
});

export const recipeCardOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredients: z.array(recipeCardIngredientSchema),
  steps: z.array(z.string()),
  tips: z.array(z.string()),
  meta: z.object({
    time: z.string(),
    yield: z.string(),
    difficulty: z.string().nullable(),
    storage: z.string().nullable(),
    weight: z.string().nullable(),
  }),
});

export type RecipeCardOutput = z.infer<typeof recipeCardOutputSchema>;
export type RecipeCardIngredient = z.infer<typeof recipeCardIngredientSchema>;