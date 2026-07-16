import { describe, expect, it, vi } from "vitest";
import { createConversationLogService } from "./conversation-log-service";
import { createUsageLogService } from "./usage-log-service";

describe("logging integration", () => {
  it("creates conversation then usage with linked conversationId", async () => {
    const store: Array<Record<string, unknown>> = [];

    const mockUsage = {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
        store.push(args.data);
        return Promise.resolve({ id: "usage_1" });
      }),
    };

    const mockConv = {
      create: vi.fn().mockResolvedValue({ id: "conv_1" }),
      findFirst: vi.fn().mockResolvedValue({ id: "conv_1" }),
    };

    const mockMsg = {
      create: vi.fn().mockResolvedValue({ id: "msg_1" }),
    };

    const conversationLog = createConversationLogService({
      conversation: mockConv as never,
      message: mockMsg as never,
    });

    const usageLog = createUsageLogService({
      usage: mockUsage as never,
    });

    const convId = await conversationLog.startConversation({
      userId: "user_1",
      feature: "ask-chef",
    });

    await conversationLog.appendUserMessage({
      conversationId: convId,
      content: "Почему не взбиваются сливки?",
    });

    await usageLog.recordSuccess({
      userId: "user_1",
      feature: "ask-chef",
      provider: "openrouter",
      inputTokens: 50,
      outputTokens: 200,
      cost: 0.001,
      latency: 1200,
      conversationId: convId,
    });

    await conversationLog.appendAssistantMessage({
      conversationId: convId,
      content: "Сливки должны быть холодными...",
      model: "gpt-4o",
    });

    expect(mockConv.create).toHaveBeenCalledTimes(1);
    expect(mockMsg.create).toHaveBeenCalledTimes(2);
    expect(mockUsage.create).toHaveBeenCalledTimes(1);
    expect(store[0].provider).toBe("openrouter");
    expect(store[0].conversationId).toBe("conv_1");
    expect(store[0].status).toBe("success");
  });

  it("logs error usage with conversation id", async () => {
    const store: Array<Record<string, unknown>> = [];

    const mockUsage = {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
        store.push(args.data);
        return Promise.resolve({ id: "usage_2" });
      }),
    };

    const usageLog = createUsageLogService({
      usage: mockUsage as never,
    });

    await usageLog.recordError({
      userId: "user_1",
      feature: "vision",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 0,
      cost: 0,
      latency: 3000,
      errorMessage: "Rate limit exceeded",
      conversationId: "conv_2",
    });

    expect(store[0].status).toBe("error");
    expect(store[0].errorMessage).toBe("Rate limit exceeded");
    expect(store[0].conversationId).toBe("conv_2");
    expect(store[0].provider).toBe("openai");
    expect(store[0].model).toBe("gpt-4o");
  });
});