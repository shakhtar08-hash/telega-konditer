export type TriggerMessageRecord = {
  id: string;
  slug: string;
  title: string;
  text: string;
  imageUrl: string | null;
  delayMinutes: number;
  targetPlans: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduledMessageRecord = {
  id: string;
  triggerMessageId: string;
  triggerSlug: string;
  chatId: string;
  text: string;
  imageUrl: string | null;
  buttons?: unknown;
  triggeredAt: Date;
  sendAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

type Dependencies = {
  findActiveBySlug(slug: string): Promise<TriggerMessageRecord[]>;
  createScheduled(data: {
    triggerMessageId: string;
    triggerSlug: string;
    chatId: string;
    text: string;
    imageUrl?: string | null;
    triggeredAt: Date;
    sendAt: Date;
  }): Promise<ScheduledMessageRecord>;
  findExistingScheduled(
    triggerMessageId: string,
    chatId: string,
  ): Promise<{ id: string } | null>;
  findPendingScheduled(
    limit: number,
  ): Promise<ScheduledMessageRecord[]>;
  markSent(id: string): Promise<void>;
};

export function createTriggerService(deps: Dependencies) {
  return {
    async scheduleTrigger(
      slug: string,
      chatId: string,
      plan: string,
    ): Promise<void> {
      const triggers = await deps.findActiveBySlug(slug);

      for (const trigger of triggers) {
        const plans = Array.isArray(trigger.targetPlans) ? trigger.targetPlans : [];

        if (!plans.includes(plan)) {
          continue;
        }

        const existing = await deps.findExistingScheduled(trigger.id, chatId);

        if (existing) {
          continue;
        }

        const triggeredAt = new Date();
        const sendAt = new Date(triggeredAt.getTime() + trigger.delayMinutes * 60 * 1000);

        await deps.createScheduled({
          triggerMessageId: trigger.id,
          triggerSlug: slug,
          chatId,
          text: trigger.text,
          imageUrl: trigger.imageUrl ?? null,
          triggeredAt,
          sendAt,
        });
      }
    },

    async processPendingTriggers(
      sendMessage: (chatId: string, text: string) => Promise<void>,
    ): Promise<number> {
      const pending = await deps.findPendingScheduled(50);
      let sentCount = 0;

      for (const message of pending) {
        try {
          await sendMessage(message.chatId, message.text);
          await deps.markSent(message.id);
          sentCount++;
        } catch (error) {
          console.error("Failed to send trigger message", {
            chatId: message.chatId,
            error,
          });
          await deps.markSent(message.id);
        }
      }

      return sentCount;
    },
  };
}