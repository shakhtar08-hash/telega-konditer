import { describe, expect, it } from "vitest";
import { determineCardSize, escapeHtml, renderMetaHtml, renderSectionTitle, renderStepItems, renderTipItems } from "./utils";

describe("escapeHtml", () => {
  it("escapes & < > \" '", () => {
    expect(escapeHtml(`<script>alert("xss") & 'test'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;) &amp; &#39;test&#39;&lt;/script&gt;",
    );
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("passes through safe text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("renderSectionTitle", () => {
  it("wraps escaped text in a section-title div", () => {
    expect(renderSectionTitle("Продолжение")).toBe('<div class="section-title">Продолжение</div>');
  });

  it("escapes HTML in the title", () => {
    expect(renderSectionTitle('<script>alert("x")</script>')).toBe(
      '<div class="section-title">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</div>',
    );
  });
});

describe("determineCardSize", () => {
  it("returns compact for <=1000 chars", () => {
    expect(determineCardSize("a".repeat(500))).toBe("compact");
    expect(determineCardSize("a".repeat(1000))).toBe("compact");
  });

  it("returns normal for >1000 chars", () => {
    expect(determineCardSize("a".repeat(1500))).toBe("normal");
    expect(determineCardSize("a".repeat(2500))).toBe("normal");
    expect(determineCardSize("a".repeat(3000))).toBe("normal");
  });
});

describe("renderMetaHtml", () => {
  it("renders all fields with readable emoji icons", () => {
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
    expect(html).toContain("&#x23F1;&#xFE0F;");
    expect(html).toContain("&#x1F36A;");
    expect(html).toContain("&#x2B50;");
    expect(html).toContain("&#x2696;&#xFE0F;");
    expect(html).toContain("&#x1F4E6;");
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

  it("omits empty string fields", () => {
    const html = renderMetaHtml({
      time: "",
      yield: "",
      difficulty: null,
      storage: null,
      weight: null,
    });

    expect(html).toBe("");
  });
});

describe("renderTipItems", () => {
  const tips = ["tip1", "tip2", "tip3", "tip4"];

  it("renders all tips without max limit", () => {
    const html = renderTipItems(tips);
    expect(html).toContain("tip1");
    expect(html).toContain("tip2");
    expect(html).toContain("tip3");
    expect(html).toContain("tip4");
  });

  it("returns empty string for empty tips", () => {
    expect(renderTipItems([])).toBe("");
  });

  it("escapes HTML in tips", () => {
    const html = renderTipItems(['<b>bold</b>']);
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });
});

describe("renderStepItems", () => {
  it("renders steps with sequential numbering by default", () => {
    const html = renderStepItems(["step one", "step two"]);
    expect(html).toContain("<span class=\"step-number\">1.</span> step one");
    expect(html).toContain("<span class=\"step-number\">2.</span> step two");
  });

  it("renders steps with startIndex offset", () => {
    const html = renderStepItems(["step three", "step four"], 2);
    expect(html).toContain("<span class=\"step-number\">3.</span> step three");
    expect(html).toContain("<span class=\"step-number\">4.</span> step four");
  });

  it("escapes HTML in step text", () => {
    const html = renderStepItems(["<script>alert(1)</script>"]);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});
