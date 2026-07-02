import { describe, expect, it } from "vitest";
import {
  buildRecipePromptText,
  splitTelegramText,
  shouldHandleRecipeText,
} from "./recipes";

const showAll = "\u041f\u043e\u043a\u0430\u0436\u0438 \u0432\u0441\u0435";
const ingredients = "\u0415\u0441\u0442\u044c:\n- \u0441\u043b\u0438\u0432\u043a\u0438 33%\n- \u043a\u043b\u0443\u0431\u043d\u0438\u043a\u0430";
const previousRequest =
  "\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439 \u0437\u0430\u043f\u0440\u043e\u0441 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f";

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

  it("splits long Telegram messages into chunks", () => {
    const chunks = splitTelegramText(["A".repeat(2500), "B".repeat(2500)].join("\n\n"), 3000);

    expect(chunks.length).toBe(2);
    expect(chunks.every((chunk) => chunk.length <= 3000)).toBe(true);
    expect(chunks.join("\n\n")).toBe(["A".repeat(2500), "B".repeat(2500)].join("\n\n"));
  });
});
