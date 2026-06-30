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
      if (input.provider === "fal") {
        throw new Error("fal text generation is not configured");
      }

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
      if (input.provider === "fal") {
        throw new Error("fal structured generation is not configured");
      }

      const provider = await createTextProvider(input.provider);
      const result = await generateObject({
        model: provider(input.model),
        system: input.system,
        prompt: input.prompt,
        temperature: input.temperature,
        schema: input.schema,
      });

      return result.object as typeof input.schema._output;
    },

    async generateImage(input) {
      if (input.provider === "fal") {
        const apiKey = await resolveManagedApiKey("FAL_KEY");

        if (!apiKey) {
          throw new Error("FAL_KEY is required for fal image generation");
        }

        const response = await fetch(`https://fal.run/${input.model}`, {
          method: "POST",
          headers: {
            Authorization: `Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: input.prompt }),
        });

        if (!response.ok) {
          throw new Error(`fal image generation failed: ${response.status}`);
        }

        const payload = (await response.json()) as {
          image?: { url?: string };
          images?: Array<{ url?: string }>;
        };
        const url = payload.image?.url ?? payload.images?.[0]?.url;

        if (!url) {
          throw new Error("fal image generation returned no image URL");
        }

        return { url };
      }

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
