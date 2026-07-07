# Task 2: Create sizeConfig and shared render utils

**Files to create:**
- `src/components/recipe-card/templates/size-config.ts`
- `src/components/recipe-card/templates/utils.ts`
- `src/components/recipe-card/templates/utils.test.ts`

**Interfaces produced:**
- `CardSize = "compact" | "normal" | "long"`
- `sizeConfig: Record<CardSize, SizeConfigEntry>` with width/minHeight/padding/titleFontSize/bodyFontSize/stepFontSize/gap/heroHeight/maxTips
- `determineCardSize(recipeText: string): CardSize`
- `renderMetaHtml(meta: RecipeCardOutput["meta"]): string`
- `renderIngredientRows(ingredients): string`
- `renderStepItems(steps): string`
- `renderTipItems(tips, maxTips): string`
- `sizeCssVars(size: CardSize): string`

**Steps (TDD):**
1. Write failing tests in `utils.test.ts`
2. Create `size-config.ts`
3. Create `utils.ts`
4. Run tests to pass
5. Commit

**Key requirements:**
- `determineCardSize`: ≤1000 → compact, 1001-2500 → normal, >2500 → long
- `renderMetaHtml`: only show non-null fields, use emoji icons (⏱ ⭐ 🍪 ⚖️ 📦)
- `renderTipItems`: limit to `maxTips`, return "" for empty input
- `sizeCssVars`: returns CSS custom properties string for `:root`
- Output format: string functions only (no JSX, no runtime deps)
- All text in Russian

**sizeConfig values (exact):**
- compact: width=1080, minHeight=1450, padding=80, titleFontSize=60, bodyFontSize=25, stepFontSize=24, gap=34, heroHeight=320, maxTips=4
- normal: width=1080, minHeight=1620, padding=70, titleFontSize=56, bodyFontSize=24, stepFontSize=23, gap=30, heroHeight=280, maxTips=3
- long: width=1080, minHeight=2100, padding=56, titleFontSize=48, bodyFontSize=21, stepFontSize=20, gap=22, heroHeight=220, maxTips=2