import { z } from "zod";
import type { RecipeCardAgentInput } from "@/ai/agents/recipe-card-agent";
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { renderRecipeCardHtml } from "@/components/recipe-card/RecipeCard";
import type { CardTemplate } from "@/components/recipe-card/templates";
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

export function createRecipeCardService(dependencies: {
  recipeCardAgent: RecipeCardAgent;
  aiService: AIService;
}) {
  return {
    async createCard(input: {
      recipeText: string;
      promptSlug?: string;
      template?: CardTemplate;
    }): Promise<{ url: string } | { text: string }> {
      const parsed = recipeCardInputSchema.parse(input);
      const cardData = await dependencies.recipeCardAgent.execute({
        recipeText: parsed.recipeText,
        promptSlug: input.promptSlug,
      });

      const imagePrompt = `Профессиональная фотография десерта "${cardData.title}" — ${cardData.description}. Реалистичная съёмка, мягкий свет, аппетитная подача, ресторанная презентация.`;

      let imageUrl: string | undefined;
      try {
        const result = await dependencies.aiService.generateImage({
          aspectRatio: "3:4",
          provider: "kie",
          model: "flux-kontext-pro",
          prompt: imagePrompt,
        });
        imageUrl = result.url;
      } catch (error) {
        console.warn("Recipe card image generation failed, using placeholder", error);
      }

      const html = renderRecipeCardHtml(cardData, input.template ?? "minimal", imageUrl);

      try {
        const browser = await chromium.launch();
        const page = await browser.newPage({
          viewport: { width: 1080, height: 1620 },
        });

        await page.setContent(html);
        const screenshot = await page.screenshot({ type: "png" });
        await browser.close();

        const base64 = screenshot.toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;

        return { url: dataUrl };
      } catch (error) {
        console.warn("Recipe card screenshot failed, sending text", error);
        return { text: formatCardAsText(cardData) };
      }
    },
  };
}