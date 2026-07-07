import { z } from "zod";
import type { RecipeCardAgentInput } from "@/ai/agents/recipe-card-agent";
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { renderRecipeCardHtml } from "@/components/recipe-card/RecipeCard";
import type { CardTemplate } from "@/components/recipe-card/templates";
import { determineCardSize } from "@/components/recipe-card/templates/utils";
import type { AIService } from "@/ai/provider/ai-service";
import { chromium } from "playwright";

const MAX_CARD_HEIGHT = 1800;

const recipeCardInputSchema = z.object({
  recipeText: z.string().trim().min(1, "Recipe text is required"),
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
  const browser = await chromium.launch();
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
      recipeText: string;
      promptSlug?: string;
      template?: CardTemplate;
    }): Promise<{ urls: string[] } | { text: string }> {
      const parsed = recipeCardInputSchema.parse(input);
      const cardData = await dependencies.recipeCardAgent.execute({
        recipeText: parsed.recipeText,
        promptSlug: input.promptSlug,
      });

      const imagePrompt = `Профессиональная фотография десерта "${cardData.title}" — ${cardData.description}. Реалистичная съёмка, мягкий свет, аппетитная подача, ресторанная презентация. Generate a horizontal hero image for a recipe card. Aspect ratio: wide horizontal composition. The dessert must be fully visible. Do not crop the top, sides, or bottom of the dessert. Leave generous margins around the subject. Avoid extreme close-ups. The dessert should occupy approximately 60-70% of the frame. Centered composition. No extreme close-up, no macro shot, no cropped dessert, no partial dessert.`;

      let imageUrl: string | undefined;
      try {
        const result = await dependencies.aiService.generateImage({
          aspectRatio: "16:9",
          provider: "kie",
          model: "flux-kontext-pro",
          prompt: imagePrompt,
        });
        imageUrl = result.url;
      } catch (error) {
        console.warn("Recipe card image generation failed, using placeholder", error);
      }

      const size = determineCardSize(parsed.recipeText);
      const templateName = input.template ?? "minimal";

      try {
        const firstHtml = renderRecipeCardHtml(cardData, templateName, imageUrl, size);

        // Меряем высоту первой карты
        const probeBrowser = await chromium.launch();
        const probePage = await probeBrowser.newPage({ viewport: { width: 1080, height: 100 } });
        await probePage.setContent(firstHtml);
        const cardHeight = await probePage.evaluate(() => {
          const el = document.querySelector(".recipe-card");
          return el ? el.scrollHeight : 0;
        });
        await probeBrowser.close();

        // Если не влезает — разбиваем на страницы
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

        // Влезает — используем готовый HTML
        const url = await renderCardToImage(firstHtml);
        return { urls: [url] };
      } catch (error) {
        console.warn("Recipe card screenshot failed, sending text", error);
        return { text: formatCardAsText(cardData) };
      }
    },
  };
}