import type { StructuredRecipe } from "@/ai/schemas/recipe";

type GeneratedRecipeContextRecord = {
  id: string;
  userId: string;
  recipeText: string;
  recipeJson: StructuredRecipe | null;
  imageUrl: string | null;
  source: string;
  createdAt: Date;
};

type GeneratedRecipeContextModel = {
  create(args: {
    data: {
      userId: string;
      recipeText: string;
      recipeJson?: StructuredRecipe | null;
      imageUrl?: string | null;
      source: string;
    };
  }): Promise<GeneratedRecipeContextRecord>;
  findFirst(args: {
    where: { id: string; userId: string };
  }): Promise<GeneratedRecipeContextRecord | null>;
};

export function createGeneratedRecipeContextRepository(
  model: GeneratedRecipeContextModel,
) {
  return {
    create(input: {
      userId: string;
      recipeText: string;
      recipeJson?: StructuredRecipe | null;
      imageUrl?: string | null;
      source: "create_recipe";
    }) {
      return model.create({ data: input });
    },
    findByIdForUser(id: string, userId: string) {
      return model.findFirst({ where: { id, userId } });
    },
  };
}
