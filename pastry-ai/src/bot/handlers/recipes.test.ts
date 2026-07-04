import { describe, expect, it } from "vitest";
import {
  buildRecipePromptText,
  shouldGenerateRecipeSearch,
  shouldHandleRecipeText,
  splitTelegramText,
} from "./recipes";

const showAll = "Покажи все";
const ingredients = "Есть:\n- сливки 33%\n- клубника";
const previousRequest = "Предыдущие ингредиенты пользователя";

describe("recipe text handler helpers", () => {
  it("handles text only after the recipe prompt was selected", () => {
    expect(
      shouldHandleRecipeText({
        lastFeature: "recipes",
        lastPromptSlug: "recipe-from-ingredients",
      }),
    ).toBe(true);
  });

  it("ignores text for other prompts", () => {
    expect(
      shouldHandleRecipeText({
        lastFeature: "vision",
        lastPromptSlug: "dessert-identification",
      }),
    ).toBe(false);
  });

  it("handles other selected text recipe prompts", () => {
    expect(
      shouldHandleRecipeText({
        lastFeature: "recipes",
        lastPromptSlug: "best-recipe-search",
      }),
    ).toBe(true);
  });

  it("ignores slash commands while a recipe prompt is active", () => {
    expect(
      shouldHandleRecipeText(
        {
          lastFeature: "recipes",
          lastPromptSlug: "recipe-from-ingredients",
        },
        "/stop",
      ),
    ).toBe(false);
  });

  it("adds the previous ingredient request for follow-up answers", () => {
    expect(buildRecipePromptText(showAll, ingredients)).toContain(
      `${previousRequest}:\n${ingredients}`,
    );
  });

  it("treats ingredient adjustment questions as follow-ups", () => {
    expect(
      buildRecipePromptText("А если добавить в список яйца?", ingredients),
    ).toContain(`${previousRequest}:\n${ingredients}`);
  });

  it("treats 'давай добавим' requests as follow-ups", () => {
    expect(
      buildRecipePromptText("давай добавим яйца и разрыхлитель", ingredients),
    ).toContain(`${previousRequest}:\n${ingredients}`);
  });

  it("treats recipe detail requests as scenario actions instead of new searches", () => {
    expect(shouldGenerateRecipeSearch("show_one")).toBe(false);
  });

  it("treats unknown follow-ups as clarification cases", () => {
    expect(shouldGenerateRecipeSearch("clarify")).toBe(false);
  });

  it("splits long Telegram messages into chunks", () => {
    const chunks = splitTelegramText(["A".repeat(2500), "B".repeat(2500)].join("\n\n"), 3000);

    expect(chunks.length).toBe(2);
    expect(chunks.every((chunk) => chunk.length <= 3000)).toBe(true);
    expect(chunks.join("\n\n")).toBe(["A".repeat(2500), "B".repeat(2500)].join("\n\n"));
  });
});
