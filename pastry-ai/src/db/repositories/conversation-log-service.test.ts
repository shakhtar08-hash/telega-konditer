import { describe, expect, it, vi } from "vitest";
import { createConversationLogService } from "./conversation-log-service";

describe("ConversationLogService", () => {
  it("starts a new conversation", async () => {
    const createConversation = vi.fn().mockResolvedValue({ id: "conv_1" });
    const createMessage = vi.fn().mockResolvedValue({ id: "msg_1" });
    const service = createConversationLogService({
      conversation: { create: createConversation },
      message: { create: createMessage },
    });

    const id = await service.startConversation({
      userId: "u1",
      feature: "text-prompt",
    });

    expect(id).toBe("conv_1");
    expect(createConversation).toHaveBeenCalledWith({
      data: { userId: "u1", feature: "text-prompt" },
    });
  });

  it("appends a user message", async () => {
    const createConversation = vi.fn().mockResolvedValue({ id: "conv_1" });
    const createMessage = vi.fn().mockResolvedValue({ id: "msg_1" });
    const service = createConversationLogService({
      conversation: { create: createConversation },
      message: { create: createMessage },
    });

    await service.appendUserMessage({
      conversationId: "conv_1",
      content: "Hello",
    });

    expect(createMessage).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "USER",
        content: "Hello",
        model: null,
      },
    });
  });

  it("appends user message as [photo] when content is empty", async () => {
    const createConversation = vi.fn().mockResolvedValue({ id: "conv_1" });
    const createMessage = vi.fn().mockResolvedValue({ id: "msg_1" });
    const service = createConversationLogService({
      conversation: { create: createConversation },
      message: { create: createMessage },
    });

    await service.appendUserMessage({
      conversationId: "conv_1",
      content: "",
    });

    expect(createMessage).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "USER",
        content: "[photo]",
        model: null,
      },
    });
  });

  it("appends user message with photo and caption", async () => {
    const createConversation = vi.fn().mockResolvedValue({ id: "conv_1" });
    const createMessage = vi.fn().mockResolvedValue({ id: "msg_1" });
    const service = createConversationLogService({
      conversation: { create: createConversation },
      message: { create: createMessage },
    });

    await service.appendUserMessage({
      conversationId: "conv_1",
      content: "",
      caption: "a cake",
    });

    expect(createMessage).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "USER",
        content: "[photo + caption: a cake]",
        model: null,
      },
    });
  });

  it("appends an assistant message with model", async () => {
    const createConversation = vi.fn().mockResolvedValue({ id: "conv_1" });
    const createMessage = vi.fn().mockResolvedValue({ id: "msg_1" });
    const service = createConversationLogService({
      conversation: { create: createConversation },
      message: { create: createMessage },
    });

    await service.appendAssistantMessage({
      conversationId: "conv_1",
      content: "Response",
      model: "gpt-4o",
    });

    expect(createMessage).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "ASSISTANT",
        content: "Response",
        model: "gpt-4o",
      },
    });
  });

  it("appends assistant message with null model", async () => {
    const createConversation = vi.fn().mockResolvedValue({ id: "conv_1" });
    const createMessage = vi.fn().mockResolvedValue({ id: "msg_1" });
    const service = createConversationLogService({
      conversation: { create: createConversation },
      message: { create: createMessage },
    });

    await service.appendAssistantMessage({
      conversationId: "conv_1",
      content: "Response",
    });

    expect(createMessage).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "ASSISTANT",
        content: "Response",
        model: null,
      },
    });
  });

  it("appends an error message", async () => {
    const createConversation = vi.fn().mockResolvedValue({ id: "conv_1" });
    const createMessage = vi.fn().mockResolvedValue({ id: "msg_1" });
    const service = createConversationLogService({
      conversation: { create: createConversation },
      message: { create: createMessage },
    });

    await service.appendErrorMessage({
      conversationId: "conv_1",
      content: "Something went wrong",
    });

    expect(createMessage).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "SYSTEM",
        content: "Something went wrong",
        model: null,
      },
    });
  });
});