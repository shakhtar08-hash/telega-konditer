### Task 2: Teach Recipe Card Service to Reuse Saved Context

**Files:**
- Modify: `C:\Users\Roof\Documents\РўРµР»РµРіР°\pastry-ai\src\features\recipe-card\recipe-card-service.ts`
- Create: `C:\Users\Roof\Documents\РўРµР»РµРіР°\pastry-ai\src\bot\handlers\recipe-card.test.ts`

**Interfaces:**
- Consumes: `StructuredRecipe`, `RecipeCardOutput`, `AIService`
- Produces: `recipeCardService.createCard(input: { recipeText?: string; recipeJson?: StructuredRecipe; imageUrl?: string | null; promptSlug?: string; template?: CardTemplate; }): Promise<{ urls: string[] } | { text: string }>`

- [ ] **Step 1: Write the failing service test for saved image reuse**

```ts
import { describe, expect, it, vi } from "vitest";
import { createRecipeCardService } from "@/features/recipe-card/recipe-card-service";

describe("recipe card service", () => {
  it("reuses saved imageUrl instead of generating a new image", async () => {
    const recipeCardAgent = {
      execute: vi.fn().mockResolvedValue({
        title: "РўР°СЂС‚",
        description: "РЇРіРѕРґРЅС‹Р№ РґРµСЃРµСЂС‚",
        ingredients: [],
        steps: ["РЎРјРµС€Р°С‚СЊ"],
        tips: [],
        meta: { time: "30 РјРёРЅСѓС‚", yield: "1 С‚РѕСЂС‚", difficulty: null, storage: null, weight: null },
      }),
    };
    const aiService = {
      generateImage: vi.fn(),
    } as any;

    const service = createRecipeCardService({ recipeCardAgent, aiService });

    await service.createCard({
      recipeJson: {
        name: "РўР°СЂС‚",
        whyFits: "РџРѕРґС…РѕРґРёС‚",
        ingredients: ["РЇРіРѕРґС‹"],
        steps: ["РЎРјРµС€Р°С‚СЊ"],
        activeTime: "10 РјРёРЅСѓС‚",
        chillingTime: "20 РјРёРЅСѓС‚",
        totalTime: "30 РјРёРЅСѓС‚",
        difficulty: "easy",
        pastryTip: "РћС…Р»Р°РґРёС‚СЊ",
        imagePrompt: "Berry tart",
      },
      imageUrl: "https://img.test/tart.png",
      template: "minimal",
    });

    expect(aiService.generateImage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/bot/handlers/recipe-card.test.ts`
Expected: FAIL because `createCard` does not accept `recipeJson`/`imageUrl`

- [ ] **Step 3: Write the minimal implementation**

```ts
const recipeCardInputSchema = z.object({
  recipeText: z.string().trim().min(1).optional(),
  recipeJson: z.custom<StructuredRecipe>().optional(),
  imageUrl: z.string().trim().optional().nullable(),
}).refine((value) => value.recipeText || value.recipeJson, {
  message: "Recipe text or recipe json is required",
});

function recipeSourceToText(input: { recipeText?: string; recipeJson?: StructuredRecipe }) {
  if (input.recipeText) {
    return input.recipeText;
  }

  return [
    input.recipeJson?.name,
    "",
    "РРЅРіСЂРµРґРёРµРЅС‚С‹:",
    ...(input.recipeJson?.ingredients ?? []),
    "",
    "РџСЂРёРіРѕС‚РѕРІР»РµРЅРёРµ:",
    ...(input.recipeJson?.steps ?? []),
  ].join("\n");
}

const parsed = recipeCardInputSchema.parse(input);
const recipeText = recipeSourceToText(parsed);
const imageUrl = parsed.imageUrl ?? (await maybeGenerateImage());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/bot/handlers/recipe-card.test.ts`
Expected: PASS

