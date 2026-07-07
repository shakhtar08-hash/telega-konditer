import { z } from "zod";
import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import type { RecipeOutput } from "../schemas/recipe";

type PromptLoader = {
  load(feature: "recipes", slug: string): Promise<PromptRecord>;
};

export type RecipeAgentInput = {
  ingredientsText: string;
  promptSlug?: string;
};

export function createRecipeAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: RecipeAgentInput): Promise<RecipeOutput> {
      const prompt = await dependencies.promptLoader.load(
        "recipes",
        input.promptSlug ?? "recipe-from-ingredients",
      );
      const renderedPrompt = prompt.userTemplate.replace(
        "{{ingredients}}",
        input.ingredientsText,
      );

      const recipeSchema = z.object({
        recipes: z.array(
          z.object({
            name: z.string().min(1),
            whyFits: z.string().min(1),
            ingredients: z.array(z.string().min(1)).min(1).max(20),
            steps: z.array(z.string().min(1)).min(3).max(15),
            activeTime: z.string().min(1),
            chillingTime: z.string().min(1),
            totalTime: z.string().min(1),
            difficulty: z.enum(["easy", "medium", "hard"]),
            pastryTip: z.string().min(1),
            imagePrompt: z.string().min(1),
          }),
        ).min(2).max(4),
      });

      return dependencies.aiService.generateObject({
        system: `${prompt.systemPrompt}\n\n${recipeOutputContract}`,
        prompt: renderedPrompt,
        provider: prompt.provider,
        model: prompt.model,
        temperature: prompt.temperature,
        schema: recipeSchema,
      });
    },
  };
}

const recipeOutputContract = [
  "Return only structured recipe data that matches the response schema.",
  "Do not place user-facing prose outside the schema.",
  "Generate 2 to 4 recipes (recipes array min 2, max 4). Never return fewer than 2 recipes.",
  "For each recipe, fill every field completely.",
  "Use Russian for all recipe fields except imagePrompt.",
  "Use English for imagePrompt.",
  "imagePrompt must be one paragraph for premium realistic pastry photography.",
  "imagePrompt must describe only the finished dessert and scene.",
  "Do not mention AI, prompts, generation, recipe instructions, or ingredient lists inside imagePrompt.",
].join(" ");
