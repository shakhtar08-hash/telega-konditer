import { describe, it, expect } from "vitest";
import { determineCardSize, renderMetaHtml, renderTipItems } from "./utils";

describe("determineCardSize", () => {
  it("returns compact for ≤1000 chars", () => {
    expect(determineCardSize("a".repeat(500))).toBe("compact");
    expect(determineCardSize("a".repeat(1000))).toBe("compact");
  });
  it("returns normal for 1001-2500 chars", () => {
    expect(determineCardSize("a".repeat(1500))).toBe("normal");
    expect(determineCardSize("a".repeat(2500))).toBe("normal");
  });
  it("returns long for >2500 chars", () => {
    expect(determineCardSize("a".repeat(2501))).toBe("long");
    expect(determineCardSize("a".repeat(3000))).toBe("long");
  });
});

describe("renderMetaHtml", () => {
  it("renders all fields when present", () => {
    const html = renderMetaHtml({
      time: "35 мин",
      yield: "12 шт",
      difficulty: "Легко",
      storage: "До 3 дней",
      weight: "≈ 50 г",
    });
    expect(html).toContain("35 мин");
    expect(html).toContain("12 шт");
    expect(html).toContain("Легко");
    expect(html).toContain("До 3 дней");
    expect(html).toContain("≈ 50 г");
  });
  it("omits null fields", () => {
    const html = renderMetaHtml({
      time: "35 мин",
      yield: "12 шт",
      difficulty: null,
      storage: null,
      weight: null,
    });
    expect(html).toContain("35 мин");
    expect(html).toContain("12 шт");
    expect(html).not.toContain("null");
  });
});

describe("renderTipItems", () => {
  const tips = ["tip1", "tip2", "tip3", "tip4"];
  it("limits tips to maxTips", () => {
    const html = renderTipItems(tips, 2);
    expect(html).toContain("tip1");
    expect(html).toContain("tip2");
    expect(html).not.toContain("tip3");
  });
  it("returns empty string for empty tips", () => {
    expect(renderTipItems([], 3)).toBe("");
  });
});
