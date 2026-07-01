import { createOpenAI, openai } from "@ai-sdk/openai";
import {
  generateImage,
  generateObject,
  generateText,
} from "ai";
import { resolveManagedApiKey } from "@/lib/api-secrets";
import type { AIService } from "./ai-service";

export function createOpenAIAIService(): AIService {
  return {
    async generateText(input) {
      const provider = await createTextProvider(input.provider);
      const result = await generateText({
        model: provider(input.model),
        system: input.system,
        prompt: input.prompt,
        temperature: input.temperature,
      });

      return result.text;
    },

    async generateObject(input) {
      const provider = await createTextProvider(input.provider);
      const shared = {
        model: provider(input.model),
        system: input.system,
        temperature: input.temperature,
        schema: input.schema,
      };
      const result = input.imageUrl
        ? await generateObject({
            ...shared,
            messages: [
              {
                role: "user" as const,
                content: [
                  { type: "text" as const, text: input.prompt },
                  { type: "image" as const, image: new URL(input.imageUrl) },
                ],
              },
            ],
          })
        : await generateObject({
            ...shared,
            prompt: input.prompt,
          });

      return result.object as typeof input.schema._output;
    },

    async generateImage(input) {
      const provider = await createOpenAIProvider();
      const result = await generateImage({
        model: provider.image(input.model),
        prompt: input.prompt,
        size: input.size ?? "1024x1024",
      });

      const [image] = result.images;

      if (!image) {
        throw new Error("Image generation returned no image");
      }

      return { url: `data:${image.mediaType};base64,${image.base64}` };
    },
  };
}

async function createTextProvider(provider: "openai" | "openrouter") {
  if (provider === "openrouter") {
    return createOpenAI({
      apiKey: await resolveManagedApiKey("OPENROUTER_API_KEY"),
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  return createOpenAIProvider();
}

async function createOpenAIProvider() {
  const apiKey = await resolveManagedApiKey("OPENAI_API_KEY");

  return apiKey ? createOpenAI({ apiKey }) : openai;
}
