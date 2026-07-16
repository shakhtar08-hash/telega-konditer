import { describe, expect, it, vi } from "vitest";
import type { AIService } from "./ai-service";
import type { UsageLogService } from "@/db/repositories/usage-log-service";
import { createInstrumentedAIService } from "./instrumented-ai-service";

function createMockBase(): AIService {
  return {
    generateText: vi.fn().mockResolvedValue("hello"),
    generateObject: vi.fn().mockResolvedValue({ title: "cake" }),
    generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/img.png" }),
  };
}

function createMockUsageLog(): UsageLogService {
  return {
    recordSuccess: vi.fn().mockResolvedValue(undefined),
    recordError: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createInstrumentedAIService", () => {
  it("records success for generateText", async () => {
    const base = createMockBase();
    const usageLog = createMockUsageLog();
    const svc = createInstrumentedAIService(base, usageLog, {
      userId: "user-1",
      feature: "test-feature",
    });

    const result = await svc.generateText({
      provider: "openai",
      system: "Be nice",
      prompt: "Hello",
      model: "gpt-4",
      temperature: 0.5,
    });

    expect(result).toBe("hello");
    expect(usageLog.recordSuccess).toHaveBeenCalledTimes(1);
    const call = vi.mocked(usageLog.recordSuccess).mock.calls[0][0];
    expect(call.userId).toBe("user-1");
    expect(call.feature).toBe("test-feature");
    expect(call.provider).toBe("openai");
    expect(call.model).toBe("gpt-4");
    expect(call.inputTokens).toBe(0);
    expect(call.outputTokens).toBe(0);
    expect(call.cost).toBe(0);
    expect(call.latency).toBeGreaterThanOrEqual(0);
  });

  it("records error for generateText when it throws", async () => {
    const base = createMockBase();
    vi.mocked(base.generateText).mockRejectedValue(new Error("boom"));
    const usageLog = createMockUsageLog();
    const svc = createInstrumentedAIService(base, usageLog, {
      userId: "user-1",
      feature: "test-feature",
    });

    await expect(
      svc.generateText({
        provider: "openai",
        system: "Be nice",
        prompt: "Hello",
        model: "gpt-4",
        temperature: 0.5,
      }),
    ).rejects.toThrow("boom");

    expect(usageLog.recordError).toHaveBeenCalledTimes(1);
    const call = vi.mocked(usageLog.recordError).mock.calls[0][0];
    expect(call.userId).toBe("user-1");
    expect(call.feature).toBe("test-feature");
    expect(call.provider).toBe("openai");
    expect(call.model).toBe("gpt-4");
    expect(call.errorMessage).toBe("boom");
    expect(call.inputTokens).toBe(0);
    expect(call.outputTokens).toBe(0);
    expect(call.cost).toBe(0);
    expect(call.latency).toBeGreaterThanOrEqual(0);
  });

  it("records success for generateObject", async () => {
    const base = createMockBase();
    const usageLog = createMockUsageLog();
    const svc = createInstrumentedAIService(base, usageLog, {
      userId: "user-2",
      feature: "obj-feature",
    });

    const result = await svc.generateObject({
      provider: "openrouter",
      system: "You are a chef",
      prompt: "Describe dessert",
      model: "claude-3",
      temperature: 0.3,
      schema: {} as never,
    });

    expect(result).toEqual({ title: "cake" });
    expect(usageLog.recordSuccess).toHaveBeenCalledTimes(1);
    const call = vi.mocked(usageLog.recordSuccess).mock.calls[0][0];
    expect(call.userId).toBe("user-2");
    expect(call.feature).toBe("obj-feature");
    expect(call.provider).toBe("openrouter");
    expect(call.model).toBe("claude-3");
  });

  it("records success for generateImage", async () => {
    const base = createMockBase();
    const usageLog = createMockUsageLog();
    const svc = createInstrumentedAIService(base, usageLog, {
      userId: "user-3",
      feature: "img-feature",
    });

    const result = await svc.generateImage({
      provider: "openai",
      prompt: "A cake",
      model: "dall-e-3",
    });

    expect(result).toEqual({ url: "https://example.com/img.png" });
    expect(usageLog.recordSuccess).toHaveBeenCalledTimes(1);
    const call = vi.mocked(usageLog.recordSuccess).mock.calls[0][0];
    expect(call.userId).toBe("user-3");
    expect(call.feature).toBe("img-feature");
    expect(call.provider).toBe("openai");
    expect(call.model).toBe("dall-e-3");
  });

  it("passes conversationId when provided", async () => {
    const base = createMockBase();
    const usageLog = createMockUsageLog();
    const svc = createInstrumentedAIService(base, usageLog, {
      userId: "user-4",
      feature: "conv-feature",
      conversationId: "conv-123",
    });

    await svc.generateText({
      provider: "openai",
      system: "Be nice",
      prompt: "Hello",
      model: "gpt-4",
      temperature: 0.5,
    });

    expect(usageLog.recordSuccess).toHaveBeenCalledTimes(1);
    const call = vi.mocked(usageLog.recordSuccess).mock.calls[0][0];
    expect(call.conversationId).toBe("conv-123");
  });
});