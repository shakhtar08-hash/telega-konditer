# Task 3: Create per-template render functions

**Files to create:**
- `src/components/recipe-card/templates/minimal.ts` — export `renderMinimalHtml(data, imageUrl, size): string`
- `src/components/recipe-card/templates/pinterest.ts` — export `renderPinterestHtml(data, imageUrl, size): string`
- `src/components/recipe-card/templates/luxury.ts` — export `renderLuxuryHtml(data, imageUrl, size): string`
- `src/components/recipe-card/templates/dark.ts` — export `renderDarkHtml(data, imageUrl, size): string`

**Dependencies:**
- From `./size-config`: `CardSize`, `sizeConfig`
- From `./utils`: `sizeCssVars`, `renderMetaHtml`, `renderIngredientRows`, `renderStepItems`, `renderTipItems`
- From `@/ai/schemas/recipe-card`: `RecipeCardOutput`

**Key requirements:**

1. Each function returns a complete HTML document string (DOCTYPE + html + head + style + body)
2. All CSS is inline in `<style>` tags — no external CSS files
3. Use `sizeCssVars(size)` at the top of each `<style>` block to inject size-based variables
4. Image rule: if `imageUrl` is undefined or empty, the hero block is completely omitted (NO placeholder, NO emoji, NO prompt text)
5. Each template has specific block ordering (see below)
6. Tips section uses `renderTipItems(data.tips, cfg.maxTips)` and only renders if tips exist
7. Style sheets include `min-height: var(--card-min-height)` on `.recipe-card`
8. Font imports: Google Fonts (Inter for all, Playfair Display for luxury)
9. All text in Russian

## Block ordering per template

### Minimal: Название → Описание → Фото+Мета → Ингредиенты → Приготовление → Советы → Footer
- Hero: imageUrl and/or meta inside a `.hero-block`
- If no imageUrl AND meta is empty → no hero-block

### Pinterest: Фото (40-50%) → Название → Описание → Мета → Ингредиенты → Приготовление → Footer
- Hero: big image at top inside `.hero-area` (full width, height: var(--hero-height)), then content in `.card-content`
- If no imageUrl → no hero-area at all
- Pinterest has NO tips section

### Luxury: Название → Описание → Мета → Фото+Мета → Ингредиенты → Приготовление → Советы → Footer
- Same hero logic as minimal (image and/or meta)
- Playfair Display font for h1 and h2
- Gold accents (#B88A44, #C8A97E)

### Dark: Название → Фото+Мета → Ингредиенты → Приготовление → Footer
- No description block, no tips section
- Dark background (#0D0D0D body, #1A1A1A card)
- Gold accents (#C8A97E)

## Template complete code

Read the plan file at `C:\Users\Roof\Documents\Телега\pastry-ai\docs\superpowers\plans\2026-07-07-recipe-card-templates-plan.md`, section **Task 3** for the complete HTML code of each template. Use the code verbatim.

## Your Job

1. Create all 4 files with exact code from the plan
2. Run `npm run typecheck` to verify
3. Commit with: `git commit -m "feat(recipe-card): add per-template render functions"`

## Report Format

Write your full report to `C:\Users\Roof\Documents\Телега\pastry-ai\.superpowers\sdd\task-3-report.md`:
- What you implemented
- What you tested and test results (typecheck)
- Files changed
- Self-review findings
- Any concerns

Then report back with:
- **Status:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Commits created
- One-line test summary
- Concerns