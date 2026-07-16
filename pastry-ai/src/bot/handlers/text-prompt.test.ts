import { describe, expect, it } from "vitest";
import { formatTextPromptResponseForTelegram } from "./text-prompt-format";

describe("text prompt formatting", () => {
  it("normalizes markdown-heavy recipe responses for Telegram plain text", () => {
    const input = [
      "### 2. Пересчитанные ингредиенты",
      "",
      "**Для коржей:**",
      "* Мука - **115 г**",
      "* Сахар - **38 г**",
      "",
      "- **Коэффициент:** 0.25",
    ].join("\n");

    expect(formatTextPromptResponseForTelegram(input)).toBe(
      [
        "2. Пересчитанные ингредиенты",
        "",
        "Для коржей:",
        "- Мука - 115 г",
        "- Сахар - 38 г",
        "",
        "- Коэффициент: 0.25",
      ].join("\n"),
    );
  });

  it("removes raw markdown markers from clarification lists", () => {
    const input = [
      "Чтобы я могла дать точный совет, пожалуйста, уточните:",
      "",
      "* **Какой именно крем расслоился?** (Например, масляный, крем-чиз на масле, ганаш, заварной).",
      "* **Из каких ингредиентов он состоит?**",
      "* **На каком этапе это произошло?**",
    ].join("\n");

    expect(formatTextPromptResponseForTelegram(input)).toBe(
      [
        "Чтобы я могла дать точный совет, пожалуйста, уточните:",
        "",
        "- Какой именно крем расслоился? (Например, масляный, крем-чиз на масле, ганаш, заварной).",
        "- Из каких ингредиентов он состоит?",
        "- На каком этапе это произошло?",
      ].join("\n"),
    );
  });
});
