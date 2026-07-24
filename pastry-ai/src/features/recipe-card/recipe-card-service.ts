import { z } from "zod";
import type { RecipeCardAgentInput } from "@/ai/agents/recipe-card-agent";
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { StructuredRecipe } from "@/ai/schemas/recipe";
import { renderRecipeCardHtml } from "@/components/recipe-card/RecipeCard";
import type { CardTemplate } from "@/components/recipe-card/templates";
import { determineCardSize } from "@/components/recipe-card/templates/utils";
import type { AIService } from "@/ai/provider/ai-service";
import { chromium } from "playwright";
import { getChromiumLaunchOptions } from "@/lib/playwright-launch";

const MAX_CARD_HEIGHT = 1800;

const difficultyLabels = {
  easy: "🟢 Легко",
  medium: "🟡 Средне",
  hard: "🔴 Сложно",
} as const satisfies Record<StructuredRecipe["difficulty"], string>;

const structuredRecipeSchema = z.object({
  name: z.string(),
  whyFits: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  activeTime: z.string(),
  chillingTime: z.string(),
  totalTime: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  pastryTip: z.string(),
  imagePrompt: z.string(),
});

const recipeCardInputSchema = z
  .object({
    recipeText: z.string().trim().min(1, "Recipe text is required").optional(),
    recipeJson: structuredRecipeSchema.optional(),
    imageUrl: z.string().trim().optional().nullable(),
  })
  .refine((value) => value.recipeText || value.recipeJson, {
    message: "Recipe text or recipe json is required",
  });

type RecipeCardAgent = {
  execute(input: RecipeCardAgentInput): Promise<RecipeCardOutput>;
};

function formatCardAsText(data: RecipeCardOutput): string {
  const lines = [
    `🍰 *${data.title}*`,
    data.description ? `\n${data.description}` : "",
    data.meta.time || data.meta.yield
      ? `\n⏱ ${data.meta.time || "—"}  🍽 ${data.meta.yield || "—"}`
      : "",
    "\n*Ингредиенты:*",
    ...data.ingredients.map((i) => `• ${i.name} — ${i.amount}`),
    "\n*Приготовление:*",
    ...data.steps.map((s, idx) => `${idx + 1}. ${s}`),
  ];
  if (data.tips.length > 0) {
    lines.push("\n*💡 Советы:*");
    lines.push(...data.tips.map((t) => `• ${t}`));
  }
  return lines.join("\n");
}

function formatStructuredRecipeAsText(recipe: StructuredRecipe) {
  return [
    "1. Название",
    recipe.name,
    "",
    "2. Почему подходит",
    recipe.whyFits,
    "",
    "3. Ингредиенты",
    ...recipe.ingredients.map((item) => `- ${item}`),
    "",
    "4. Полная технология приготовления",
    ...recipe.steps.map((step, stepIndex) => `${stepIndex + 1}. ${step}`),
    "",
    "5. Время приготовления",
    `- Активное время: ${recipe.activeTime}`,
    `- Охлаждение/заморозка: ${recipe.chillingTime}`,
    `- Общее время: ${recipe.totalTime}`,
    "",
    "6. Сложность",
    difficultyLabels[recipe.difficulty],
    "",
    "7. Совет кондитера",
    recipe.pastryTip,
  ].join("\n");
}

function recipeSourceToText(input: {
  recipeText?: string;
  recipeJson?: StructuredRecipe;
}) {
  if (input.recipeText) {
    return input.recipeText;
  }

  return formatStructuredRecipeAsText(input.recipeJson!);
}

type CardPage = {
  data: RecipeCardOutput;
  pageLabel?: string;
};

function buildCardPages(data: RecipeCardOutput): CardPage[] {
  const totalSteps = data.steps.length;

  if (totalSteps <= 3) {
    return [{ data }];
  }

  const stepsPerPage = Math.ceil(totalSteps / 2);
  const needsThirdPage = totalSteps > stepsPerPage * 2;
  const pageCount = needsThirdPage ? 3 : 2;

  const pages: CardPage[] = [];

  pages.push({
    data: {
      ...data,
      steps: [],
      tips: [],
    },
    pageLabel: `Карточка 1/${pageCount}`,
  });

  for (let i = 1; i < pageCount; i++) {
    const start = (i - 1) * stepsPerPage;
    const end = i < pageCount - 1 ? i * stepsPerPage : totalSteps;
    const isLast = i === pageCount - 1;

    pages.push({
      data: {
        title: data.title,
        description: "",
        ingredients: [],
        steps: data.steps.slice(start, end),
        tips: isLast ? data.tips : [],
        meta: { time: "", yield: "", difficulty: null, storage: null, weight: null },
      },
      pageLabel: `Карточка ${i + 1}/${pageCount}`,
    });
  }

  return pages;
}

async function renderCardToImage(html: string): Promise<string> {
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const page = await browser.newPage({
    viewport: { width: 1080, height: 100 },
  });

  await page.setContent(html);
  const screenshot = await page.screenshot({ type: "png", fullPage: true });
  await browser.close();

  const base64 = screenshot.toString("base64");
  return `data:image/png;base64,${base64}`;
}

export function createRecipeCardService(dependencies: {
  recipeCardAgent: RecipeCardAgent;
  aiService: AIService;
}) {
  return {
    async createCard(input: {
      recipeText?: string;
      recipeJson?: StructuredRecipe;
      imageUrl?: string | null;
      promptSlug?: string;
      template?: CardTemplate;
    }): Promise<{ urls: string[] } | { text: string }> {
      const parsed = recipeCardInputSchema.parse(input);
      const recipeText = recipeSourceToText(parsed);
      const cardData = await dependencies.recipeCardAgent.execute({
        recipeText,
        promptSlug: input.promptSlug,
      });

      const imagePrompt = `Профессиональная фотография десерта "${cardData.title}" — ${cardData.description}. Реалистичная съёмка, мягкий свет, аппетитная подача, ресторанная презентация. Generate a horizontal hero image for a recipe card. Aspect ratio: wide horizontal composition. The dessert must be fully visible. Do not crop the top, sides, or bottom of the dessert. Leave generous margins around the subject. Avoid extreme close-ups. The dessert should occupy approximately 60-70% of the frame. Centered composition. No extreme close-up, no macro shot, no cropped dessert, no partial dessert.`;

      let imageUrl = parsed.imageUrl ?? undefined;
      if (!imageUrl) {
        try {
          const result = await dependencies.aiService.generateImage({
            aspectRatio: "16:9",
            provider: "kie",
            model: "flux-kontext-pro",
            prompt: imagePrompt,
          });
          imageUrl = result.url;
        } catch (error) {
          console.warn("KIE image gen failed, trying OpenRouter FLUX", error);
          try {
            const result = await dependencies.aiService.generateImage({
              aspectRatio: "16:9",
              provider: "openrouter",
              model: "flux",
              prompt: imagePrompt,
            });
            imageUrl = result.url;
          } catch (fallbackError) {
            console.warn("OpenRouter FLUX also failed, continuing without image", fallbackError);
          }
        }
      }

      const size = determineCardSize(recipeText);
      const templateName = input.template ?? "dark";

      try {
        const firstHtml = renderRecipeCardHtml(cardData, templateName, imageUrl, size);

        const probeBrowser = await chromium.launch(getChromiumLaunchOptions());
        const probePage = await probeBrowser.newPage({ viewport: { width: 1080, height: 100 } });
        await probePage.setContent(firstHtml);
        const cardHeight = await probePage.evaluate(() => {
          const el = document.querySelector(".recipe-card");
          return el ? el.scrollHeight : 0;
        });
        await probeBrowser.close();

        if (cardHeight > MAX_CARD_HEIGHT) {
          const pages = buildCardPages(cardData);
          const urls = await Promise.all(
            pages.map((p) => {
              const html = renderRecipeCardHtml(p.data, templateName, imageUrl, size, p.pageLabel);
              return renderCardToImage(html);
            }),
          );
          return { urls };
        }

        const url = await renderCardToImage(firstHtml);
        return { urls: [url] };
      } catch (error) {
        console.warn("Recipe card screenshot failed, sending text", error);
        return { text: formatCardAsText(cardData) };
      }
    },
  };
}
