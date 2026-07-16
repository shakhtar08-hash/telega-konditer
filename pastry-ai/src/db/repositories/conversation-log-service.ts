export type ConversationLogService = {
  startConversation(input: { userId: string; feature: string }): Promise<string>;
  appendUserMessage(input: {
    conversationId: string;
    content: string;
    caption?: string;
  }): Promise<void>;
  appendAssistantMessage(input: {
    conversationId: string;
    content: string;
    model?: string | null;
  }): Promise<void>;
  appendErrorMessage(input: {
    conversationId: string;
    content: string;
  }): Promise<void>;
};

export function createConversationLogService(dependencies: {
  conversation: {
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  message: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}): ConversationLogService {
  return {
    async startConversation(input) {
      const conversation = await dependencies.conversation.create({
        data: {
          userId: input.userId,
          feature: input.feature,
        },
      });
      return conversation.id;
    },

    async appendUserMessage(input) {
      let content = input.content;
      if (!content && input.caption) {
        content = `[photo + caption: ${input.caption}]`;
      } else if (!content) {
        content = "[photo]";
      }

      await dependencies.message.create({
        data: {
          conversationId: input.conversationId,
          role: "USER",
          content,
          model: null,
        },
      });
    },

    async appendAssistantMessage(input) {
      await dependencies.message.create({
        data: {
          conversationId: input.conversationId,
          role: "ASSISTANT",
          content: input.content,
          model: input.model ?? null,
        },
      });
    },

    async appendErrorMessage(input) {
      await dependencies.message.create({
        data: {
          conversationId: input.conversationId,
          role: "SYSTEM",
          content: input.content,
          model: null,
        },
      });
    },
  };
}