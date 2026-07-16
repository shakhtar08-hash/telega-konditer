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
  excludeRecipes?: string[];
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
        ).min(1).max(1),
      });

      let contract = recipeOutputContract;

      if (input.excludeRecipes && input.excludeRecipes.length > 0) {
        contract += `\n\nDo NOT return any of these already-given recipes: ${input.excludeRecipes.join(", ")}. The user has already received these recipes — you must return a different recipe that is not similar in name, composition, or concept.`;
      }

      return dependencies.aiService.generateObject({
        system: `${prompt.systemPrompt}\n\n${contract}`,
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
  "Return exactly 1 recipe.",
  "Do NOT return multiple recipes.",
  "For each recipe, fill every field completely.",
  "Use Russian for all recipe fields except imagePrompt.",
  "Use English for imagePrompt.",
  "imagePrompt must be one paragraph for premium realistic pastry photography.",
  "imagePrompt must describe only the finished dessert and scene.",
  "Do not mention AI, prompts, generation, recipe instructions, or ingredient lists inside imagePrompt.",
  "INPUT INTERPRETATION RULES:",
  "If the prompt slug is 'recipe-from-ingredients', the user provides INGREDIENTS. Do not treat a named dish (e.g. 'блины со сгущенкой') as an ingredient list.",
  "If the prompt slug is 'best-recipe-search', the user provides a DISH NAME or dessert query. Treat 'блины со сгущенкой' as a dish name, not as ingredients. Only consider ingredients if the user explicitly lists them as constraints.",
].join(" ");