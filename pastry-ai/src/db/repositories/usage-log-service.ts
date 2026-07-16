export type RecordUsageInput = {
  userId: string;
  feature: string;
  provider: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  conversationId?: string;
};

export type UsageLogService = {
  recordSuccess(input: RecordUsageInput): Promise<void>;
  recordError(
    input: RecordUsageInput & { errorMessage: string },
  ): Promise<void>;
};

export function createUsageLogService(dependencies: {
  usage: {
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
}): UsageLogService {
  return {
    async recordSuccess(input) {
      await dependencies.usage.create({
        data: {
          userId: input.userId,
          feature: input.feature,
          provider: input.provider,
          model: input.model ?? null,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          cost: input.cost,
          latency: input.latency,
          status: "success",
          errorMessage: null,
          conversationId: input.conversationId,
        },
      });
    },

    async recordError(input) {
      await dependencies.usage.create({
        data: {
          userId: input.userId,
          feature: input.feature,
          provider: input.provider,
          model: input.model ?? null,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          cost: input.cost,
          latency: input.latency,
          status: "error",
          errorMessage: input.errorMessage,
          conversationId: input.conversationId,
        },
      });
    },
  };
}