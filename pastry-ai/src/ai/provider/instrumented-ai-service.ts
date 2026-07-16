import type { AIService, GenerateTextInput, GenerateObjectInput, GenerateImageInput } from "./ai-service";
import type { UsageLogService } from "@/db/repositories/usage-log-service";

export type InstrumentationContext = {
  userId: string;
  feature: string;
  conversationId?: string;
};

function record<T>(
  base: AIService,
  usageLog: UsageLogService,
  ctx: InstrumentationContext,
  method: (base: AIService) => Promise<T>,
  getInput: () => { provider: string; model?: string },
): Promise<T> {
  const start = Date.now();
  const input = getInput();

  return method(base).then(
    (result) => {
      const latency = Date.now() - start;
      usageLog.recordSuccess({
        userId: ctx.userId,
        feature: ctx.feature,
        conversationId: ctx.conversationId,
        provider: input.provider,
        model: input.model,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        latency,
      });
      return result;
    },
    (error: Error) => {
      const latency = Date.now() - start;
      usageLog.recordError({
        userId: ctx.userId,
        feature: ctx.feature,
        conversationId: ctx.conversationId,
        provider: input.provider,
        model: input.model,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        latency,
        errorMessage: error.message,
      });
      throw error;
    },
  );
}

export function createInstrumentedAIService(
  base: AIService,
  usageLog: UsageLogService,
  ctx: InstrumentationContext,
): AIService {
  return {
    generateText(input: GenerateTextInput): Promise<string> {
      return record(base, usageLog, ctx, (b) => b.generateText(input), () => ({
        provider: input.provider,
        model: input.model,
      }));
    },

    generateObject<TOutput>(input: GenerateObjectInput<TOutput>): Promise<TOutput> {
      return record(base, usageLog, ctx, (b) => b.generateObject(input), () => ({
        provider: input.provider,
        model: input.model,
      }));
    },

    generateImage(input: GenerateImageInput): Promise<{ url: string }> {
      return record(base, usageLog, ctx, (b) => b.generateImage(input), () => ({
        provider: input.provider,
        model: input.model,
      }));
    },
  };
}