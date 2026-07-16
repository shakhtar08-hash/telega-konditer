import { describe, expect, it, vi } from "vitest";
import { createUsageLogService } from "./usage-log-service";

describe("UsageLogService", () => {
  const defaultInput = {
    userId: "u1",
    feature: "text-prompt",
    provider: "openai",
    model: "gpt-4o",
    inputTokens: 100,
    outputTokens: 50,
    cost: 0.002,
    latency: 1200,
  };

  it("records a successful usage entry", async () => {
    const create = vi.fn().mockResolvedValue({ id: "usage_1" });
    const service = createUsageLogService({ usage: { create } });

    await service.recordSuccess(defaultInput);

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        feature: "text-prompt",
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.002,
        latency: 1200,
        status: "success",
        errorMessage: null,
        conversationId: undefined,
      },
    });
  });

  it("records an error usage entry", async () => {
    const create = vi.fn().mockResolvedValue({ id: "usage_2" });
    const service = createUsageLogService({ usage: { create } });

    await service.recordError({
      ...defaultInput,
      errorMessage: "Provider timeout",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        feature: "text-prompt",
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.002,
        latency: 1200,
        status: "error",
        errorMessage: "Provider timeout",
        conversationId: undefined,
      },
    });
  });

  it("accepts optional conversationId", async () => {
    const create = vi.fn().mockResolvedValue({ id: "usage_3" });
    const service = createUsageLogService({ usage: { create } });

    await service.recordSuccess({
      ...defaultInput,
      conversationId: "conv_1",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: "conv_1",
      }),
    });
  });

  it("allows missing optional model", async () => {
    const create = vi.fn().mockResolvedValue({ id: "usage_4" });
    const service = createUsageLogService({ usage: { create } });

    const { model: _, ...inputWithoutModel } = defaultInput;

    await service.recordSuccess(inputWithoutModel);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        model: null,
      }),
    });
  });
});
