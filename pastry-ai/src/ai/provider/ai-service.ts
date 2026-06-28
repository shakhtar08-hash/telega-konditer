import type { z } from "zod";

export type GenerateTextInput = {
  system: string;
  prompt: string;
  model: string;
  temperature: number;
};

export type GenerateObjectInput<TOutput> = GenerateTextInput & {
  schema: z.ZodType<TOutput>;
};

export type GenerateImageInput = {
  prompt: string;
  model: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
};

export type AIService = {
  generateText(input: GenerateTextInput): Promise<string>;
  generateObject<TOutput>(
    input: GenerateObjectInput<TOutput>,
  ): Promise<TOutput>;
  generateImage(input: GenerateImageInput): Promise<{ url: string }>;
};
