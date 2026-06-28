import { openai } from "@ai-sdk/openai";
import {
  generateImage,
  generateObject,
  generateText,
} from "ai";
import type { AIService } from "./ai-service";

export function createOpenAIAIService(): AIService {
  return {
    async generateText(input) {
      const result = await generateText({
        model: openai(input.model),
        system: input.system,
        prompt: input.prompt,
        temperature: input.temperature,
      });

      return result.text;
    },

    async generateObject(input) {
      const result = await generateObject({
        model: openai(input.model),
        system: input.system,
        prompt: input.prompt,
        temperature: input.temperature,
        schema: input.schema,
      });

      return result.object as typeof input.schema._output;
    },

    async generateImage(input) {
      const result = await generateImage({
        model: openai.image(input.model),
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
