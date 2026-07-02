import type { z } from "zod";
import type { PromptProvider } from "@/db/repositories/prompt-repository";

export type GenerateTextInput = {
  provider: PromptProvider;
  system: string;
  prompt: string;
  model: string;
  temperature: number;
  imageUrl?: string;
};

export type GenerateObjectInput<TOutput> = GenerateTextInput & {
  imageUrl?: string;
  schema: z.ZodType<TOutput>;
};

export type GenerateImageInput = {
  provider: PromptProvider;
  prompt: string;
  model: string;
  imageUrl?: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
};

export type AIService = {
  generateText(input: GenerateTextInput): Promise<string>;
  generateObject<TOutput>(
    input: GenerateObjectInput<TOutput>,
  ): Promise<TOutput>;
  generateImage(input: GenerateImageInput): Promise<{ url: string }>;
};
