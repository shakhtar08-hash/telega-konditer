export type TriggerMessageRecord = {
  id: string;
  slug: string;
  title: string;
  text: string;
  delayMinutes: number;
  targetPlans: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduledMessageRecord = {
  id: string;
  triggerSlug: string;
  chatId: string;
  text: string;
  sendAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

type Dependencies = {
  findActiveBySlug(slug: string): Promise<TriggerMessageRecord | null>;
  createScheduled(data: {
    triggerSlug: string;
    chatId: string;
    text: string;
    sendAt: Date;
  }): Promise<ScheduledMessageRecord>;
  findExistingScheduled(
    triggerSlug: string,
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
      const trigger = await deps.findActiveBySlug(slug);

      if (!trigger) {
        return;
      }

      const plans = trigger.targetPlans as string[];

      if (!plans.includes(plan)) {
        return;
      }

      const existing = await deps.findExistingScheduled(slug, chatId);

      if (existing) {
        return;
      }

      const sendAt = new Date(Date.now() + trigger.delayMinutes * 60 * 1000);

      await deps.createScheduled({
        chatId,
        sendAt,
        text: trigger.text,
        triggerSlug: slug,
      });
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