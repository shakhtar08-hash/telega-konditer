# Recipe Card Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-layout CSS-switching with per-template HTML rendering, add nullable meta fields (difficulty/storage/weight), add auto-sizing (compact/normal/long), and fix image handling (no placeholder text).

**Architecture:** Each template becomes a standalone HTML-string function in `src/components/recipe-card/templates/`. A shared `sizeConfig` object controls density (padding, font sizes, gaps, maxTips) per card size. The dispatcher `renderRecipeCardHtml()` selects the template function and injects size-based CSS custom properties.

**Tech Stack:** TypeScript, Zod, Prisma, Playwright (unchanged — rendering stays string-based).

## Global Constraints

- All user-facing text in Russian
- No React runtime dependency — pure string templates
- `imageUrl` is optional; if absent, hero block is completely omitted (no placeholder, no prompt text)
- New meta fields (`difficulty`, `storage`, `weight`) are nullable (`string | null`); meta block omits null fields
- AI prompt must include `# RECIPE METADATA` section with strict rules (see spec)
- `CardSize` auto-detection: ≤1000 chars → compact, 1001–2500 → normal, >2500 → long
- Update docs/roadmap.md after completion

---

### Task 1: Extend Zod schema with nullable meta fields

**Files:**
- Modify: `src/ai/schemas/recipe-card.ts`

**Interfaces:**
- Consumes: existing `z` import
- Produces: `recipeCardOutputSchema` with nullable `difficulty`, `storage`, `weight`

- [ ] **Step 1: Update schema**

Change `meta` to:

```typescript
meta: z.object({
  time: z.string(),
  yield: z.string(),
  difficulty: z.string().nullable(),
  storage: z.string().nullable(),
  weight: z.string().nullable(),
}),
```

- [ ] **Step 2: Run typecheck to verify**

Run: `npm run typecheck`
Expected: no TS errors (existing code may need updates — address in later tasks)

- [ ] **Step 3: Commit**

```bash
git add src/ai/schemas/recipe-card.ts
git commit -m "feat(recipe-card): extend meta schema with nullable difficulty, storage, weight"
```

---

### Task 2: Create sizeConfig and shared render utils

**Files:**
- Create: `src/components/recipe-card/templates/size-config.ts`
- Create: `src/components/recipe-card/templates/utils.ts`

**Interfaces:**
- Produces: `CardSize` type, `sizeConfig` object, `renderMetaHtml()`, `renderIngredientRows()`, `renderStepItems()`, `renderTipItems()`

- [ ] **Step 1: Write failing tests first**

Create `src/components/recipe-card/templates/utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { determineCardSize, renderMetaHtml, renderTipItems } from "./utils";
import type { CardSize } from "./size-config";

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
    expect(html).not.toContain("difficulty");
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
```

Run: `npx vitest run src/components/recipe-card/templates/utils.test.ts`
Expected: FAIL (files not found)

- [ ] **Step 2: Create size-config.ts**

```typescript
export type CardSize = "compact" | "normal" | "long";

export type SizeConfigEntry = {
  width: number;
  minHeight: number;
  padding: number;
  titleFontSize: number;
  bodyFontSize: number;
  stepFontSize: number;
  gap: number;
  heroHeight: number;
  maxTips: number;
};

export const sizeConfig: Record<CardSize, SizeConfigEntry> = {
  compact: {
    width: 1080,
    minHeight: 1450,
    padding: 80,
    titleFontSize: 60,
    bodyFontSize: 25,
    stepFontSize: 24,
    gap: 34,
    heroHeight: 320,
    maxTips: 4,
  },
  normal: {
    width: 1080,
    minHeight: 1620,
    padding: 70,
    titleFontSize: 56,
    bodyFontSize: 24,
    stepFontSize: 23,
    gap: 30,
    heroHeight: 280,
    maxTips: 3,
  },
  long: {
    width: 1080,
    minHeight: 2100,
    padding: 56,
    titleFontSize: 48,
    bodyFontSize: 21,
    stepFontSize: 20,
    gap: 22,
    heroHeight: 220,
    maxTips: 2,
  },
};
```

- [ ] **Step 3: Create utils.ts**

```typescript
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { sizeConfig, type CardSize } from "./size-config";

export function determineCardSize(recipeText: string): CardSize {
  const len = recipeText.length;
  if (len <= 1000) return "compact";
  if (len <= 2500) return "normal";
  return "long";
}

type MetaFields = RecipeCardOutput["meta"];

const metaLabels: Record<string, { icon: string }> = {
  time: { icon: "⏱" },
  difficulty: { icon: "⭐" },
  yield: { icon: "🍪" },
  weight: { icon: "⚖️" },
  storage: { icon: "📦" },
};

export function renderMetaHtml(meta: MetaFields): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(meta)) {
    if (value === null) continue;
    const label = metaLabels[key as keyof typeof metaLabels];
    if (label) {
      parts.push(
        `<div class="meta-item"><span>${label.icon}</span> ${value}</div>`,
      );
    }
  }
  if (parts.length === 0) return "";
  return `<div class="meta-row">${parts.join("")}</div>`;
}

export function renderIngredientRows(
  ingredients: RecipeCardOutput["ingredients"],
): string {
  return ingredients
    .map(
      (item) =>
        `<div class="ingredient-row"><span class="ingredient-name">${item.name}</span><span class="ingredient-amount">${item.amount}</span></div>`,
    )
    .join("");
}

export function renderStepItems(steps: string[]): string {
  return steps.map((step) => `<li class="step-item">${step}</li>`).join("");
}

export function renderTipItems(tips: string[], maxTips: number): string {
  const limited = tips.slice(0, maxTips);
  if (limited.length === 0) return "";
  return limited.map((tip) => `<li class="tip-item">${tip}</li>`).join("");
}

export function sizeCssVars(size: CardSize): string {
  const s = sizeConfig[size];
  return `
:root {
  --card-padding: ${s.padding}px;
  --card-min-height: ${s.minHeight}px;
  --title-size: ${s.titleFontSize}px;
  --body-size: ${s.bodyFontSize}px;
  --step-size: ${s.stepFontSize}px;
  --gap: ${s.gap}px;
  --hero-height: ${s.heroHeight}px;
}`;
}
```

- [ ] **Step 4: Run tests again**

Run: `npx vitest run src/components/recipe-card/templates/utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/recipe-card/templates/size-config.ts src/components/recipe-card/templates/utils.ts src/components/recipe-card/templates/utils.test.ts
git commit -m "feat(recipe-card): add sizeConfig, determineCardSize, render utils"
```

---

### Task 3: Create per-template render functions

**Files:**
- Create: `src/components/recipe-card/templates/minimal.ts`
- Create: `src/components/recipe-card/templates/pinterest.ts`
- Create: `src/components/recipe-card/templates/luxury.ts`
- Create: `src/components/recipe-card/templates/dark.ts`

**Interfaces:**
- Each exports a single function:
  ```
  renderMinimalHtml(data: RecipeCardOutput, imageUrl: string | undefined, size: CardSize): string
  ```

- [ ] **Step 1: Write minimal.ts**

```typescript
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardSize } from "./size-config";
import { sizeCssVars, renderMetaHtml, renderIngredientRows, renderStepItems, renderTipItems, sizeConfig } from "./utils";

export function renderMinimalHtml(
  data: RecipeCardOutput,
  imageUrl: string | undefined,
  size: CardSize,
): string {
  const cfg = sizeConfig[size];
  const meta = renderMetaHtml(data.meta);
  const heroHtml = imageUrl
    ? `<div class="hero-block"><img src="${imageUrl}" alt="${data.title}" class="hero-img" />${meta}</div>`
    : meta ? `<div class="hero-block">${meta}</div>` : "";
  const tipHtml = data.tips.length > 0
    ? `<div class="tips-section"><h2>💡 Советы</h2><ul>${renderTipItems(data.tips, cfg.maxTips)}</ul></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #FCFBF8; }
.recipe-card { width: 1080px; min-height: var(--card-min-height); display: flex; flex-direction: column; background: white; border-radius: 40px; padding: var(--card-padding); gap: var(--gap); box-shadow: 0 20px 60px rgba(0,0,0,0.04); }
h1 { font-size: var(--title-size); font-weight: 700; color: #1a1a2e; line-height: 1.15; }
.description { font-size: var(--body-size); color: #8a8a9e; line-height: 1.5; margin-top: -12px; }
.hero-block { background: #F8F6F3; border-radius: 32px; padding: 40px; display: flex; flex-direction: column; gap: 24px; }
.hero-img { width: 100%; height: var(--hero-height); object-fit: cover; border-radius: 24px; }
.meta-row { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; background: #F8F6F3; padding: 12px 20px; border-radius: 14px; font-size: 20px; color: #1a1a2e; font-weight: 500; }
.meta-item span { font-size: 22px; }
section { display: flex; flex-direction: column; gap: 18px; }
h2 { font-size: 34px; font-weight: 600; color: #1a1a2e; border-bottom: 2px solid #E8DFD0; padding-bottom: 10px; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 24px; color: #2d2d44; line-height: 1.5; }
li::marker { color: #C8A97E; }
.ingredient-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 24px; padding: 8px 0; border-bottom: 1px solid #F0EBE3; }
.ingredient-name { color: #2d2d44; }
.ingredient-amount { color: #8B7355; font-weight: 500; white-space: nowrap; margin-left: 16px; }
.step-item { font-size: var(--step-size); color: #2d2d44; padding: 6px 0; }
.tips-section { background: #F8F6F3; border-radius: 20px; padding: 28px 36px; }
.tip-item { font-size: 22px; color: #2d2d44; padding: 4px 0; }
.footer { text-align: center; font-size: 18px; color: #A09DB0; margin-top: auto; padding-top: 20px; border-top: 1px solid #F0EBE3; }
</style>
</head>
<body>
<div class="recipe-card">
<div>
<h1>${data.title}</h1>
${data.description ? `<p class="description">${data.description}</p>` : ""}
</div>
${heroHtml}
<section>
<h2>Ингредиенты</h2>
<div>${renderIngredientRows(data.ingredients)}</div>
</section>
<section>
<h2>Приготовление</h2>
<ol>${renderStepItems(data.steps)}</ol>
</section>
${tipHtml}
<div class="footer">AI Кондитер · рецепт создан с помощью нейросети</div>
</div>
</body>
</html>`;
}
```

- [ ] **Step 2: Write pinterest.ts**

```typescript
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardSize } from "./size-config";
import { sizeCssVars, renderMetaHtml, renderIngredientRows, renderStepItems, sizeConfig } from "./utils";

export function renderPinterestHtml(
  data: RecipeCardOutput,
  imageUrl: string | undefined,
  size: CardSize,
): string {
  const cfg = sizeConfig[size];
  const meta = renderMetaHtml(data.meta);
  const heroHtml = imageUrl
    ? `<div class="hero-area"><img src="${imageUrl}" alt="${data.title}" class="hero-img" /><div class="hero-overlay"></div></div>`
    : "";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #F0EBE3; }
.recipe-card { width: 1080px; min-height: var(--card-min-height); display: flex; flex-direction: column; background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.06); }
.hero-area { height: var(--hero-height); background: linear-gradient(135deg, #E8DFD0 0%, #D6C9B3 100%); position: relative; overflow: hidden; }
.hero-img { width: 100%; height: 100%; object-fit: cover; }
.hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(transparent, rgba(0,0,0,0.15)); }
.card-content { padding: var(--card-padding); display: flex; flex-direction: column; gap: var(--gap); }
h1 { font-size: var(--title-size); font-weight: 700; color: #1a1a2e; line-height: 1.15; }
.description { font-size: var(--body-size); color: #8a8a9e; line-height: 1.5; }
.meta-row { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; background: #F5F2ED; padding: 10px 18px; border-radius: 12px; font-size: 18px; color: #1a1a2e; font-weight: 500; }
.meta-item span { font-size: 20px; }
section { display: flex; flex-direction: column; gap: 16px; }
h2 { font-size: 30px; font-weight: 600; color: #1a1a2e; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 22px; color: #2d2d44; line-height: 1.5; }
.ingredient-row { display: flex; justify-content: space-between; font-size: 22px; padding: 6px 0; }
.ingredient-name { color: #2d2d44; }
.ingredient-amount { color: #8B7355; font-weight: 500; }
.step-item { font-size: var(--step-size); color: #2d2d44; padding: 4px 0; border-bottom: 1px solid #F0EBE3; }
.footer { text-align: center; font-size: 16px; color: #A09DB0; margin-top: auto; padding-top: 16px; }
</style>
</head>
<body>
<div class="recipe-card">
${heroHtml}
<div class="card-content">
<h1>${data.title}</h1>
${data.description ? `<p class="description">${data.description}</p>` : ""}
${meta}
<section>
<h2>Ингредиенты</h2>
<div>${renderIngredientRows(data.ingredients)}</div>
</section>
<section>
<h2>Приготовление</h2>
<ol>${renderStepItems(data.steps)}</ol>
</section>
<div class="footer">AI Кондитер · рецепт создан с помощью нейросети</div>
</div>
</div>
</body>
</html>`;
}
```

- [ ] **Step 3: Write luxury.ts**

```typescript
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardSize } from "./size-config";
import { sizeCssVars, renderMetaHtml, renderIngredientRows, renderStepItems, renderTipItems, sizeConfig } from "./utils";

export function renderLuxuryHtml(
  data: RecipeCardOutput,
  imageUrl: string | undefined,
  size: CardSize,
): string {
  const cfg = sizeConfig[size];
  const meta = renderMetaHtml(data.meta);
  const heroHtml = imageUrl
    ? `<div class="hero-block"><img src="${imageUrl}" alt="${data.title}" class="hero-img" />${meta}</div>`
    : meta ? `<div class="hero-block">${meta}</div>` : "";
  const tipHtml = data.tips.length > 0
    ? `<div class="tips-section"><h2>💡 Советы</h2><ul>${renderTipItems(data.tips, cfg.maxTips)}</ul></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #F8F5F0; }
.recipe-card { width: 1080px; min-height: var(--card-min-height); display: flex; flex-direction: column; background: #FDFCFA; border-radius: 32px; padding: var(--card-padding); gap: var(--gap); border: 1px solid #E8DFD0; box-shadow: 0 20px 80px rgba(0,0,0,0.03); }
h1 { font-family: 'Playfair Display', serif; font-size: var(--title-size); font-weight: 700; color: #1a1a2e; line-height: 1.15; }
.description { font-size: var(--body-size); color: #8a8a9e; font-style: italic; line-height: 1.5; }
.hero-block { background: #F8F5F0; border-radius: 28px; padding: 40px; display: flex; flex-direction: column; gap: 24px; border: 1px solid #E0D5C5; }
.hero-img { width: 100%; height: var(--hero-height); object-fit: cover; border-radius: 20px; }
.meta-row { display: flex; gap: 20px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; border: 1px solid #C8A97E; padding: 10px 18px; border-radius: 100px; font-size: 18px; color: #8B7355; font-weight: 500; }
.meta-item span { font-size: 20px; }
section { display: flex; flex-direction: column; gap: 18px; }
h2 { font-family: 'Playfair Display', serif; font-size: 34px; color: #B88A44; border-bottom: 1px solid #C8A97E; padding-bottom: 8px; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: var(--step-size); color: #2d2d44; line-height: 1.5; }
li::marker { color: #B88A44; }
.ingredient-row { display: flex; justify-content: space-between; font-size: 22px; padding: 8px 0; border-bottom: 1px solid #EDE6DB; }
.ingredient-name { color: #2d2d44; }
.ingredient-amount { color: #B88A44; font-weight: 500; }
.step-item { font-size: var(--step-size); color: #2d2d44; padding: 6px 0; }
.tips-section { background: #F8F5F0; border-radius: 16px; padding: 28px 36px; }
.tip-item { font-size: 20px; color: #2d2d44; padding: 4px 0; }
.footer { text-align: center; font-size: 16px; color: #A09DB0; margin-top: auto; padding-top: 20px; border-top: 1px solid #EDE6DB; font-style: italic; }
</style>
</head>
<body>
<div class="recipe-card">
<div>
<h1>${data.title}</h1>
${data.description ? `<p class="description">${data.description}</p>` : ""}
</div>
${heroHtml}
<section>
<h2>Ингредиенты</h2>
<div>${renderIngredientRows(data.ingredients)}</div>
</section>
<section>
<h2>Приготовление</h2>
<ol>${renderStepItems(data.steps)}</ol>
</section>
${tipHtml}
<div class="footer">AI Кондитер · рецепт создан с помощью нейросети</div>
</div>
</body>
</html>`;
}
```

- [ ] **Step 4: Write dark.ts**

```typescript
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardSize } from "./size-config";
import { sizeCssVars, renderMetaHtml, renderIngredientRows, renderStepItems, sizeConfig } from "./utils";

export function renderDarkHtml(
  data: RecipeCardOutput,
  imageUrl: string | undefined,
  size: CardSize,
): string {
  const cfg = sizeConfig[size];
  const meta = renderMetaHtml(data.meta);
  const heroHtml = imageUrl
    ? `<div class="hero-block"><img src="${imageUrl}" alt="${data.title}" class="hero-img" />${meta}</div>`
    : meta ? `<div class="hero-block">${meta}</div>` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #0D0D0D; }
.recipe-card { width: 1080px; min-height: var(--card-min-height); display: flex; flex-direction: column; background: #1A1A1A; border-radius: 32px; padding: var(--card-padding); gap: var(--gap); border: 1px solid #2A2A2A; }
h1 { font-size: var(--title-size); font-weight: 700; color: #F5F0EB; line-height: 1.15; }
.hero-block { background: #222222; border-radius: 28px; padding: 36px; display: flex; flex-direction: column; gap: 20px; }
.hero-img { width: 100%; height: var(--hero-height); object-fit: cover; border-radius: 20px; }
.meta-row { display: flex; gap: 20px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; background: #222222; padding: 10px 18px; border-radius: 12px; font-size: 18px; color: #C8A97E; font-weight: 500; }
.meta-item span { font-size: 20px; }
section { display: flex; flex-direction: column; gap: 16px; }
h2 { font-size: 32px; font-weight: 600; color: #C8A97E; border-bottom: 1px solid #2A2A2A; padding-bottom: 8px; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: var(--step-size); color: #D0D0D0; line-height: 1.5; }
li::marker { color: #C8A97E; }
.ingredient-row { display: flex; justify-content: space-between; font-size: 22px; padding: 8px 0; border-bottom: 1px solid #2A2A2A; }
.ingredient-name { color: #D0D0D0; }
.ingredient-amount { color: #C8A97E; font-weight: 500; }
.step-item { font-size: var(--step-size); color: #D0D0D0; padding: 6px 0; }
.footer { text-align: center; font-size: 16px; color: #555; margin-top: auto; padding-top: 16px; border-top: 1px solid #2A2A2A; }
</style>
</head>
<body>
<div class="recipe-card">
<div>
<h1>${data.title}</h1>
</div>
${heroHtml}
<section>
<h2>Ингредиенты</h2>
<div>${renderIngredientRows(data.ingredients)}</div>
</section>
<section>
<h2>Приготовление</h2>
<ol>${renderStepItems(data.steps)}</ol>
</section>
<div class="footer">AI Кондитер · рецепт создан с помощью нейросети</div>
</div>
</body>
</html>`;
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/recipe-card/templates/minimal.ts src/components/recipe-card/templates/pinterest.ts src/components/recipe-card/templates/luxury.ts src/components/recipe-card/templates/dark.ts
git commit -m "feat(recipe-card): add per-template render functions"
```

---

### Task 4: Update dispatcher and remove old templates

**Files:**
- Modify: `src/components/recipe-card/RecipeCard.tsx` — rewrite as dispatcher
- Modify: `src/components/recipe-card/templates.ts` — remove CSS blocks, keep type re-exports

- [ ] **Step 1: Update templates.ts**

```typescript
export type { CardTemplate } from "./size-config";
export type { CardSize } from "./size-config";
export { sizeConfig } from "./size-config";
export { determineCardSize } from "./utils";

export const templateNames: Record<CardTemplate, string> = {
  minimal: "Minimal",
  pinterest: "Pinterest",
  luxury: "Luxury",
  dark: "Dark Premium",
};
```

Also keep `CardTemplate` as a union of literals (`"minimal" | "pinterest" | "luxury" | "dark"`). Move the definition here:

```typescript
export type CardTemplate = "minimal" | "pinterest" | "luxury" | "dark";
```

- [ ] **Step 2: Rewrite RecipeCard.tsx**

```typescript
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardTemplate, CardSize } from "./templates";
import { renderMinimalHtml } from "./templates/minimal";
import { renderPinterestHtml } from "./templates/pinterest";
import { renderLuxuryHtml } from "./templates/luxury";
import { renderDarkHtml } from "./templates/dark";
import { determineCardSize } from "./utils";

const renderers: Record<CardTemplate, typeof renderMinimalHtml> = {
  minimal: renderMinimalHtml,
  pinterest: renderPinterestHtml,
  luxury: renderLuxuryHtml,
  dark: renderDarkHtml,
};

export function renderRecipeCardHtml(
  data: RecipeCardOutput,
  template: CardTemplate = "minimal",
  imageUrl?: string,
  size?: CardSize,
): string {
  const effectiveSize: CardSize = size ?? determineCardSize(
    [data.title, data.description, ...data.ingredients.map((i) => `${i.name} ${i.amount}`), ...data.steps, ...data.tips].join(" "),
  );
  return renderers[template](data, imageUrl, effectiveSize);
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/recipe-card/RecipeCard.tsx src/components/recipe-card/templates.ts
git commit -m "feat(recipe-card): rewrite dispatcher with per-template routing"
```

---

### Task 5: Update recipe-card-service to pass size

**Files:**
- Modify: `src/features/recipe-card/recipe-card-service.ts`

- [ ] **Step 1: Update createCard to auto-detect size**

Import `determineCardSize` and pass size to `renderRecipeCardHtml`:

```typescript
import { determineCardSize } from "@/components/recipe-card/templates/utils";
```

In `createCard`, before rendering:

```typescript
const size = determineCardSize(parsed.recipeText);
// ... then later:
const html = renderRecipeCardHtml(cardData, input.template ?? "minimal", imageUrl, size);
```

Full updated `createCard` function (the rendering section only changes):

```typescript
const size = determineCardSize(parsed.recipeText);
const html = renderRecipeCardHtml(cardData, input.template ?? "minimal", imageUrl, size);
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/recipe-card/recipe-card-service.ts
git commit -m "feat(recipe-card): auto-detect card size by content length"
```

---

### Task 6: Update AI prompt and migrate database

**Files:**
- Modify: `prisma/seed.mjs` — update recipe-card system prompt with RECIPE METADATA
- Create: `scripts/fix-recipe-card-prompt-v2.ts` — update DB prompt

- [ ] **Step 1: Update system prompt in seed.mjs**

Find the recipe-card prompt entry (around line 428-458). Append after the existing prompt content, before the closing backtick:

```
\n\n# RECIPE METADATA\n\nОпредели дополнительные параметры рецепта:\n\n- difficulty (сложность)\n- storage (срок хранения)\n- weight (примерный выход или вес готового изделия)\n\nПравила:\n1. Используй только данные, которые можно достоверно определить из рецепта.\n2. Для difficulty оцени: количество этапов, используемые техники, требования к точности, необходимость специального оборудования. Возможные значения: Легко, Средне, Сложно.\n3. Для storage используй общепринятые нормы хранения для данного типа изделия. Указывай только если можешь определить тип изделия с высокой уверенностью.\n4. Для weight вычисляй: суммарный вес ингредиентов, либо примерный выход изделия, если это очевидно из рецепта.\n5. Не придумывай значения.\n6. Если значение нельзя определить достаточно надежно, возвращай null.\n\nПример:\n{\n  "difficulty": "Средне",\n  "storage": "До 3 дней в холодильнике",\n  "weight": "≈ 850 г"\n}\n\nили\n\n{\n  "difficulty": "Легко",\n  "storage": null,\n  "weight": null\n}\n\nЕсли значение равно null — блок не отображается на карточке.
```

Also bump the version to 3.

- [ ] **Step 2: Write migration script**

`scripts/fix-recipe-card-prompt-v2.ts`:

```typescript
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const RECIPE_METADATA_BLOCK = [
  "",
  "# RECIPE METADATA",
  "",
  "Определи дополнительные параметры рецепта:",
  "",
  "- difficulty (сложность)",
  "- storage (срок хранения)",
  "- weight (примерный выход или вес готового изделия)",
  "",
  "Правила:",
  "1. Используй только данные, которые можно достоверно определить из рецепта.",
  "2. Для difficulty оцени: количество этапов, используемые техники, требования к точности, необходимость специального оборудования. Возможные значения: Легко, Средне, Сложно.",
  "3. Для storage используй общепринятые нормы хранения для данного типа изделия. Указывай только если можешь определить тип изделия с высокой уверенностью.",
  "4. Для weight вычисляй: суммарный вес ингредиентов, либо примерный выход изделия, если это очевидно из рецепта.",
  "5. Не придумывай значения.",
  "6. Если значение нельзя определить достаточно надежно, возвращай null.",
  "",
  'Пример:',
  '{',
  '  "difficulty": "Средне",',
  '  "storage": "До 3 дней в холодильнике",',
  '  "weight": "≈ 850 г"',
  '}',
  "",
  "или",
  "",
  '{',
  '  "difficulty": "Легко",',
  '  "storage": null,',
  '  "weight": null',
  '}',
  "",
  "Если значение равно null — блок не отображается на карточке.",
].join("\n");

async function main() {
  const prompts = await prisma.prompt.findMany({
    where: { slug: "recipe-card" },
    orderBy: { version: "desc" },
  });

  if (prompts.length === 0) {
    console.log("No recipe-card prompts found.");
    return;
  }

  // Find the active prompt and update it
  const active = prompts.find((p) => p.active);
  if (!active) {
    console.log("No active recipe-card prompt found.");
    return;
  }

  const newSystemPrompt = active.systemPrompt + RECIPE_METADATA_BLOCK;
  const newVersion = active.version + 1;

  // Deactivate current active
  await prisma.prompt.update({
    where: { id: active.id },
    data: { active: false },
  });

  // Create new version
  await prisma.prompt.create({
    data: {
      slug: active.slug,
      feature: active.feature,
      title: active.title,
      provider: active.provider,
      systemPrompt: newSystemPrompt,
      userTemplate: active.userTemplate,
      model: active.model,
      temperature: active.temperature,
      active: true,
      version: newVersion,
    },
  });

  console.log(`Created recipe-card prompt version ${newVersion} with RECIPE METADATA section.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run the migration script**

Run: `npx tsx scripts/fix-recipe-card-prompt-v2.ts`
Expected: "Created recipe-card prompt version 3 with RECIPE METADATA section."

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.mjs scripts/fix-recipe-card-prompt-v2.ts
git commit -m "feat(recipe-card): update AI prompt with RECIPE METADATA section"
```

---

### Task 7: Run full verification

**Files:** (none — verification only)

- [ ] **Step 1: Run full check**

Run: `npm run verify`
Expected: lint, typecheck, tests, build all pass

- [ ] **Step 2: Update docs/roadmap.md**

Add new done item under Done section:
```
- Recipe card templates split into per-layout render functions (minimal, pinterest, luxury, dark) with proper block ordering.
- Card auto-sizing (compact/normal/long) with density configuration and size-based tip limits.
- Extended meta block with difficulty, storage, weight (nullable, AI-generated).
- Image handling: hero block omitted entirely when no imageUrl available (no placeholder text).
- Updated recipe-card AI prompt with RECIPE METADATA section.
```

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: update roadmap with recipe card improvements"
```