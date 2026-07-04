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
      const shared = {
        model: provider(input.model),
        system: input.system,
        temperature: input.temperature,
      };
      const result = input.imageUrl
        ? await generateText({
            ...shared,
            timeout: 120000,
            messages: [
              {
                role: "user" as const,
                content: [
                  { type: "text" as const, text: input.prompt },
                  {
                    type: "file" as const,
                    mediaType: "image",
                    data: new URL(input.imageUrl),
                  },
                ],
              },
            ],
          })
        : await generateText({
            ...shared,
            prompt: input.prompt,
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
                  {
                    type: "file" as const,
                    mediaType: "image",
                    data: new URL(input.imageUrl),
                  },
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
      if (input.imageUrl) {
        return generateImageEdit({
          imageUrl: input.imageUrl,
          model: input.model,
          prompt: input.prompt,
          size: input.size,
        });
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

async function generateImageEdit(input: {
  imageUrl: string;
  prompt: string;
  model: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
}) {
  const apiKey = await resolveManagedApiKey("OPENAI_API_KEY");

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for image edits");
  }

  const sourceResponse = await fetch(input.imageUrl);

  if (!sourceResponse.ok) {
    throw new Error(`Could not download source image: ${sourceResponse.status}`);
  }

  const sourceBlob = await sourceResponse.blob();
  const formData = new FormData();
  formData.append("model", input.model);
  formData.append("prompt", input.prompt);
  formData.append("size", input.size ?? "1024x1024");
  formData.append("image", sourceBlob, "dessert.png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    body: formData,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    method: "POST",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Image edit failed: ${response.status} ${details}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const image = payload.data?.[0];

  if (image?.b64_json) {
    return { url: `data:image/png;base64,${image.b64_json}` };
  }

  if (image?.url) {
    return { url: image.url };
  }

  throw new Error("Image edit returned no image");
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
