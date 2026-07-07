# Task 4: Update dispatcher and remove old templates CSS

**Files to modify:**
- `src/components/recipe-card/templates.ts` — remove CSS blocks, keep type re-exports + templateNames
- `src/components/recipe-card/RecipeCard.tsx` — rewrite as dispatcher

**Dependencies:**
- Task 3 created 4 template render functions in `src/components/recipe-card/templates/minimal.ts`, `pinterest.ts`, `luxury.ts`, `dark.ts`
- Task 2 created `determineCardSize` in `./utils`

**What to do:**

### templates.ts

Replace the entire file content with:

```typescript
export type CardTemplate = "minimal" | "pinterest" | "luxury" | "dark";

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

### RecipeCard.tsx

Replace the entire file content with:

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

**Key points:**
- Import `determineCardSize` from `./utils` (not `./templates`)
- The `renderers` object maps template name to function
- If `size` is not provided, auto-detect from combined text content
- Remove all CSS constants (`sharedBase`, `minimalCss`, `pinterestCss`, `luxuryCss`, `darkCss`, `getTemplateCss`)

## Your Job

1. Read current `templates.ts` and `RecipeCard.tsx`
2. Rewrite both files as specified above
3. Run `npm run typecheck` to verify
4. Commit with: `git commit -m "feat(recipe-card): rewrite dispatcher with per-template routing"`

## Report Format

Write to `C:\Users\Roof\Documents\Телега\pastry-ai\.superpowers\sdd\task-4-report.md`:
- What you did
- typecheck result
- Any concerns

Report back with: Status, commits, test summary, concerns