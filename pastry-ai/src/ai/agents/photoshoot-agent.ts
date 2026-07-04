import type { PromptRecord } from "@/db/repositories/prompt-repository";
import { UserFacingError } from "@/lib/user-facing-error";
import type { AIService } from "../provider/ai-service";
import type { PhotoshootOutput } from "../schemas/photoshoot";

type PromptLoader = {
  load(feature: "photoshoot", slug: string): Promise<PromptRecord>;
};

export type PhotoshootAgentInput = {
  imageUrl: string;
  styles: Array<{
    id: string;
    name: string;
    prompt: string;
    provider?: string | null;
    model?: string | null;
  }>;
};

export function createPhotoshootAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: PhotoshootAgentInput): Promise<PhotoshootOutput> {
      const prompt = await dependencies.promptLoader.load(
        "photoshoot",
        "product-photo",
      );

      const images = await Promise.all(
        input.styles.map(async (style) => {
          const styleProvider = style.provider ?? prompt.provider;
          const styleModel = style.model ?? prompt.model;

          if (styleProvider !== "openai" && styleProvider !== "openrouter") {
            throw new UserFacingError(
              `Неподдерживаемый провайдер "${styleProvider}" для стиля "${style.name}".`,
            );
          }

          const renderedPrompt = prompt.userTemplate
            .replace("{{imageUrl}}", input.imageUrl)
            .replace("{{style}}", `${style.name}: ${style.prompt}`);
          const image = await dependencies.aiService.generateImage({
            imageUrl: input.imageUrl,
            prompt: renderedPrompt,
            provider: styleProvider as "openai" | "openrouter",
            model: styleModel,
          });

          return {
            imageUrl: image.url,
            prompt: renderedPrompt,
            styleId: style.id,
            styleName: style.name,
          };
        }),
      );

      return { images };
    },
  };
}
