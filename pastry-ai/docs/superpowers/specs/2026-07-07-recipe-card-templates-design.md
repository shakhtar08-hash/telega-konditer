# Recipe Card System: Per-Template Layouts

Date: 2026-07-07

## Motivation

All four card templates (Minimal, Pinterest, Luxury, Dark) currently share one HTML layout and differ only by CSS. This limits visual variety, makes Pinterest/Luxury indistinguishable from Minimal, and prevents proper handling of missing images and sparse metadata.

## Design

### 1. Schema — new nullable meta fields

Zod schema in `src/ai/schemas/recipe-card.ts`:

```typescript
meta: z.object({
  time: z.string(),
  yield: z.string(),
  difficulty: z.string().nullable(),    // "Легко" | "Средне" | "Сложно" | null
  storage: z.string().nullable(),       // "До 3 дней в холодильнике" | null
  weight: z.string().nullable(),        // "≈ 850 г" | null
}),
```

### 2. AI prompt — RECIPE METADATA section

Add a `# RECIPE METADATA` section to the `recipe-card` system prompt (seed + DB record):

```
# RECIPE METADATA

Определи дополнительные параметры рецепта:

- difficulty (сложность)
- storage (срок хранения)
- weight (примерный выход или вес готового изделия)

Правила:
1. Используй только данные, которые можно достоверно определить из рецепта.
2. Для difficulty оцени: количество этапов, используемые техники, требования к точности, необходимость специального оборудования. Возможные значения: Легко, Средне, Сложно.
3. Для storage используй общепринятые нормы хранения для данного типа изделия. Указывай только если можешь определить тип изделия с высокой уверенностью.
4. Для weight вычисляй: суммарный вес ингредиентов, либо примерный выход изделия, если это очевидно из рецепта.
5. Не придумывай значения.
6. Если значение нельзя определить достаточно надежно, возвращай null.
```

### 3. Per-template HTML render functions

`renderRecipeCardHtml()` becomes a dispatcher:

```
renderRecipeCardHtml(data, template, imageUrl, size)
  → renderMinimalHtml(data, imageUrl, size)
  | renderPinterestHtml(data, imageUrl, size)
  | renderLuxuryHtml(data, imageUrl, size)
  | renderDarkHtml(data, imageUrl, size)
```

Each function in its own file under `src/components/recipe-card/templates/`.

**Block order per template (from spec):**

| Template | Order |
|---|---|
| Minimal | Название → Описание → Фото → Мета → Ингредиенты → Приготовление → Советы |
| Pinterest | Фото (40-50%) → Название → Описание → Мета → Ингредиенты → Приготовление |
| Luxury | Название → Описание → Мета → Фото → Ингредиенты → Приготовление → Советы |
| Dark | Название → Фото → Мета → Ингредиенты → Приготовление |

**Image rule:** If `imageUrl` is undefined or empty, the hero block is completely omitted (no placeholder, no prompt text).

### 4. Unified meta block

Displayed inline. Shows only non-null fields:

```
⏱ 35 мин  ⭐ Легко  🍪 12 шт  📦 До 3 дней
```

Implemented as a shared utility `renderMetaHtml(meta)`.

### 5. Card sizing system

`CardSize = "compact" | "normal" | "long"`

Determined automatically by text content length:
- ≤1000 chars → `compact`
- 1001–2500 chars → `normal`
- >2500 chars → `long`

`createCard()` accepts optional `size` param; defaults to auto-detect.

#### sizeConfig

```typescript
const sizeConfig = {
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

`sizeConfig` values are injected as CSS custom properties (`--card-padding`, `--card-min-height`, `--title-size`, etc.) and used in JavaScript for `maxTips`.

### 6. Future-proofing

- Adding a new template = new file in `templates/` + registration in dispatcher
- Adding a new size = new entry in `sizeConfig`
- Templates do not import React — pure string functions, zero runtime deps for Playwright

## Files to change / create

| Action | Path |
|---|---|
| modify | `src/ai/schemas/recipe-card.ts` — add nullable fields to meta |
| modify | `prisma/seed.mjs` — update recipe-card prompt with RECIPE METADATA |
| create | `scripts/fix-recipe-card-prompt-v2.ts` — update DB prompt with new meta fields |
| create | `src/components/recipe-card/templates/size-config.ts` |
| create | `src/components/recipe-card/templates/utils.ts` — shared html helpers (metaHtml, ingredientRows, stepItems, tipItems) |
| create | `src/components/recipe-card/templates/minimal.ts` |
| create | `src/components/recipe-card/templates/pinterest.ts` |
| create | `src/components/recipe-card/templates/luxury.ts` |
| create | `src/components/recipe-card/templates/dark.ts` |
| modify | `src/components/recipe-card/RecipeCard.tsx` — dispatcher logic |
| modify | `src/components/recipe-card/templates.ts` — remove CSS blocks, keep type re-exports |
| modify | `src/features/recipe-card/recipe-card-service.ts` — add determineCardSize, pass size to render |
| run | `npx tsx scripts/fix-recipe-card-prompt-v2.ts` |

## Test strategy

- Unit tests for `determineCardSize` (boundaries: 1000, 2500)
- Unit tests for `renderMetaHtml` (null fields omitted, all fields shown)
- Unit tests for tip filtering by `maxTips`
- Integration test: `createCard` with mock agent and AI service returns expected shape

## Prompt migration

After changing the seed, run a migration script to update the existing DB prompt record (same pattern as `scripts/fix-recipe-card-prompt.ts`)