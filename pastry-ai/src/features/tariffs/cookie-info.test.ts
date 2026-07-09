import { describe, expect, it } from "vitest";
import {
  buildFeatureCookieBlock,
  buildUserCookieLine,
  getFeatureCookieCost,
  getFeatureCookieExtraLine,
  getFeatureMaxPhotoCharge,
} from "./cookie-info";

describe("cookie-info", () => {
  describe("getFeatureCookieCost", () => {
    it("returns free message for free features", () => {
      expect(getFeatureCookieCost("ask-chef", 0)).toBe("Эта функция бесплатна");
      expect(getFeatureCookieCost("free-lesson", 0)).toBe("Эта функция бесплатна");
      expect(getFeatureCookieCost("vision", 0)).toBe("Эта функция бесплатна");
      expect(getFeatureCookieCost("recipe-recalculation", 0)).toBe("Эта функция бесплатна");
      expect(getFeatureCookieCost("margin-calculator", 0)).toBe("Эта функция бесплатна");
      expect(getFeatureCookieCost("recipe-margin", 0)).toBe("Эта функция бесплатна");
      expect(getFeatureCookieCost("carousel", 0)).toBe("Эта функция бесплатна");
    });

    it("returns paid message for paid features", () => {
      expect(getFeatureCookieCost("recipe-card", 0)).toBe("Эта функция съест 1 печеньку");
      expect(getFeatureCookieCost("photoshoot-pick-style", 0)).toBe("Эта функция съест 1 печеньку");
    });

    it("returns dynamic cost for photoshoot feature", () => {
      expect(getFeatureCookieCost("photoshoot", 8)).toBe("Эта функция съест 8 печенек");
      expect(getFeatureCookieCost("photoshoot", 3)).toBe("Эта функция съест 3 печеньки");
      expect(getFeatureCookieCost("photoshoot", 1)).toBe("Эта функция съест 1 печеньку");
    });

    it("returns recipe free text for recipe flows", () => {
      expect(getFeatureCookieCost("recipe-from-ingredients", 0)).toBe("Функция бесплатна для текста");
      expect(getFeatureCookieCost("best-recipe-search", 0)).toBe("Функция бесплатна для текста");
      expect(getFeatureCookieCost("recipes", 0)).toBe("Функция бесплатна для текста");
    });

    it("returns free for unknown features", () => {
      expect(getFeatureCookieCost("unknown", 0)).toBe("Эта функция бесплатна");
    });
  });

  describe("getFeatureCookieExtraLine", () => {
    it("returns photo charge note for recipe flows", () => {
      expect(getFeatureCookieExtraLine("recipe-from-ingredients")).toBe(
        "Дополнительно может потратиться до 4 печенек на фото примеры",
      );
      expect(getFeatureCookieExtraLine("best-recipe-search")).toBe(
        "Дополнительно может потратиться до 4 печенек на фото примеры",
      );
      expect(getFeatureCookieExtraLine("recipes")).toBe(
        "Дополнительно может потратиться до 4 печенек на фото примеры",
      );
    });

    it("returns null for non-recipe features", () => {
      expect(getFeatureCookieExtraLine("ask-chef")).toBeNull();
      expect(getFeatureCookieExtraLine("photoshoot")).toBeNull();
      expect(getFeatureCookieExtraLine("recipe-card")).toBeNull();
    });
  });

  describe("getFeatureMaxPhotoCharge", () => {
    it("returns 4 for recipe flows", () => {
      expect(getFeatureMaxPhotoCharge("recipe-from-ingredients")).toBe(4);
      expect(getFeatureMaxPhotoCharge("best-recipe-search")).toBe(4);
    });

    it("returns null for non-recipe features", () => {
      expect(getFeatureMaxPhotoCharge("ask-chef")).toBeNull();
    });
  });

  describe("buildUserCookieLine", () => {
    it("shows balance with correct pluralization", () => {
      expect(buildUserCookieLine(1)).toBe("На вашем счету: 1 печенька");
      expect(buildUserCookieLine(2)).toBe("На вашем счету: 2 печеньки");
      expect(buildUserCookieLine(5)).toBe("На вашем счету: 5 печенек");
      expect(buildUserCookieLine(21)).toBe("На вашем счету: 21 печенька");
      expect(buildUserCookieLine(10)).toBe("На вашем счету: 10 печенек");
    });

    it("returns fallback for null", () => {
      expect(buildUserCookieLine(null)).toBe("На вашем счету: 0 печенек");
    });
  });

  describe("buildFeatureCookieBlock", () => {
    it("builds full block for paid feature", () => {
      const block = buildFeatureCookieBlock("recipe-card", 0, 5);
      expect(block).toContain("Эта функция съест 1 печеньку");
      expect(block).toContain("На вашем счету: 5 печенек");
    });

    it("builds full block for free feature", () => {
      const block = buildFeatureCookieBlock("ask-chef", 0, 3);
      expect(block).toContain("Эта функция бесплатна");
      expect(block).toContain("На вашем счету: 3 печеньки");
    });

    it("builds full block for recipe feature with extra line", () => {
      const block = buildFeatureCookieBlock("recipe-from-ingredients", 0, 10);
      expect(block).toContain("Функция бесплатна для текста");
      expect(block).toContain("Дополнительно может потратиться до 4 печенек на фото примеры");
      expect(block).toContain("На вашем счету: 10 печенек");
    });

    it("uses zero fallback when user has no tariff", () => {
      const block = buildFeatureCookieBlock("recipe-card", 0, null);
      expect(block).toContain("На вашем счету: 0 печенек");
    });

    it("builds block for photoshoot with dynamic style count", () => {
      const block = buildFeatureCookieBlock("photoshoot", 8, 15);
      expect(block).toContain("Эта функция съест 8 печенек");
      expect(block).toContain("На вашем счету: 15 печенек");
    });
  });
});