import { describe, expect, it, vi } from "vitest";
import { createGeneratedRecipeContextRepository } from "./generated-recipe-context-repository";

describe("generated recipe context repository", () => {
  it("creates and reads a recipe context for the same user", async () => {
    const expectedData = {
      userId: "user_1",
      recipeText: "Текст рецепта",
      recipeJson: {
        name: "Тарт",
        ingredients: [] as string[],
        steps: [] as string[],
        whyFits: "",
        activeTime: "",
        chillingTime: "",
        totalTime: "",
        difficulty: "easy" as const,
        pastryTip: "",
        imagePrompt: "",
      },
      imageUrl: "https://img.test/tart.png",
      source: "create_recipe" as const,
    };

    const create = vi.fn().mockResolvedValue({
      id: "recipe_1",
      ...expectedData,
      createdAt: new Date("2026-07-07T10:00:00.000Z"),
    });
    const findFirst = vi.fn().mockResolvedValue({
      id: "recipe_1",
      ...expectedData,
      createdAt: new Date("2026-07-07T10:00:00.000Z"),
    });

    const repository = createGeneratedRecipeContextRepository({
      create,
      findFirst,
    });

    await repository.create(expectedData);

    const record = await repository.findByIdForUser("recipe_1", "user_1");

    expect(create).toHaveBeenCalledWith({ data: expectedData });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "recipe_1", userId: "user_1" },
    });
    expect(record?.imageUrl).toBe("https://img.test/tart.png");
  });

  it("returns null when the recipe context is missing", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);

    const repository = createGeneratedRecipeContextRepository({
      create: vi.fn(),
      findFirst,
    });

    await expect(
      repository.findByIdForUser("missing_recipe", "user_1"),
    ).resolves.toBeNull();

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "missing_recipe", userId: "user_1" },
    });
  });
});
