import { z } from "zod";
import type { RecipeCardAgentInput } from "@/ai/agents/recipe-card-agent";
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { renderRecipeCardHtml } from "@/components/recipe-card/RecipeCard";
import type { CardTemplate } from "@/components/recipe-card/templates";
import { determineCardSize } from "@/components/recipe-card/templates/utils";
import type { AIService } from "@/ai/provider/ai-service";
import { chromium } from "playwright";

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

function estimateContentLength(data: RecipeCardOutput): number {
  const textParts = [
    data.title,
    data.description,
    ...data.ingredients.map((i) => `${i.name} ${i.amount}`),
    ...data.steps,
    ...data.tips,
  ];
  return textParts.reduce((acc, p) => acc + p.length, 0);
}

function splitCardData(data: RecipeCardOutput, pageCount: number): RecipeCardOutput[] {
  if (pageCount <= 1) return [data];

  const perPage = Math.ceil(data.steps.length / pageCount);
  const result: RecipeCardOutput[] = [];

  for (let i = 0; i < pageCount; i++) {
    const start = i * perPage;
    const end = Math.min(start + perPage, data.steps.length);
    const isFirst = i === 0;

    result.push({
      title: isFirst ? data.title : `${data.title} (продолжение ${i + 1}/${pageCount})`,
      description: isFirst ? data.description : "",
      ingredients: isFirst ? data.ingredients : [],
      steps: data.steps.slice(start, end),
      tips: isFirst ? data.tips : [],
      meta: isFirst ? data.meta : { ...data.meta, time: "", yield: "" },
    });
  }

  return result;
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
      const contentLength = estimateContentLength(cardData);
      const pageCount = contentLength > 6000 ? 3 : contentLength > 3000 ? 2 : 1;
      const pages = splitCardData(cardData, pageCount);

      try {
        const urls = await Promise.all(
          pages.map((page) => {
            const html = renderRecipeCardHtml(page, input.template ?? "minimal", imageUrl, size);
            return renderCardToImage(html);
          }),
        );
        return { urls };
      } catch (error) {
        console.warn("Recipe card screenshot failed, sending text", error);
        return { text: formatCardAsText(cardData) };
      }
    },
  };
}