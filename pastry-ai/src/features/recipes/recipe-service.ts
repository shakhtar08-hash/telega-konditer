import { z } from "zod";
import type { RecipeAgentInput } from "@/ai/agents/recipe-agent";
import type { RecipeOutput } from "@/ai/schemas/recipe";

const recipeInputSchema = z.object({
  ingredientsText: z.string().trim().min(1, "Ingredients are required"),
});

type RecipeAgent = {
  execute(input: RecipeAgentInput): Promise<RecipeOutput>;
};

export function createRecipeService(dependencies: { recipeAgent: RecipeAgent }) {
  return {
    async createFromIngredients(input: {
      ingredientsText: string;
      promptSlug?: string;
      excludeRecipes?: string[];
    }): Promise<RecipeOutput> {
      const parsed = recipeInputSchema.parse(input);
      const ingredientsText = parsed.ingredientsText.trim();
      if (!ingredientsText) throw new Error("Ingredients are required");
      return dependencies.recipeAgent.execute({
        ingredientsText,
        promptSlug: input.promptSlug,
        excludeRecipes: input.excludeRecipes,
      });
    },
  };
}