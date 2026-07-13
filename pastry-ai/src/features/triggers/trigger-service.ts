import { computeSendAt, evaluateConditions } from "./trigger-condition";
import type {
  TriggerRuleRecord,
  TriggerUserState,
} from "./trigger-rule-types";

export type ScheduledMessageRecord = {
  id: string;
  triggerRuleId: string;
  triggerEventKey: string;
  chatId: string;
  text: string;
  imageUrl: string | null;
  buttons?: unknown;
  triggeredAt: Date;
  sendAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

export type TriggerMessageRecord = TriggerRuleRecord;

type Dependencies = {
  findActiveRulesByEvent(eventKey: string): Promise<TriggerRuleRecord[]>;
  createScheduled(data: {
    triggerRuleId: string;
    triggerEventKey: string;
    chatId: string;
    text: string;
    imageUrl?: string | null;
    buttons?: unknown;
    triggeredAt: Date;
    sendAt: Date;
  }): Promise<ScheduledMessageRecord>;
  findExistingScheduled(
    triggerRuleId: string,
    chatId: string,
    eventOccurredAt: Date,
  ): Promise<{ id: string } | null>;
  findPendingScheduled(
    limit: number,
  ): Promise<ScheduledMessageRecord[]>;
  markSent(id: string): Promise<void>;
};

export function createTriggerService(deps: Dependencies) {
  return {
    async scheduleTrigger(
      eventKey: string,
      chatId: string,
      state: TriggerUserState,
      eventOccurredAt = new Date(),
    ): Promise<void> {
      const rules = await deps.findActiveRulesByEvent(eventKey);

      for (const rule of rules) {
        if (!evaluateConditions(rule.conditions, state)) {
          continue;
        }

        const existing = await deps.findExistingScheduled(
          rule.id,
          chatId,
          eventOccurredAt,
        );

        if (existing) {
          continue;
        }

        await deps.createScheduled({
          triggerRuleId: rule.id,
          triggerEventKey: eventKey,
          chatId,
          text: rule.messageText,
          imageUrl: rule.imageUrl ?? null,
          buttons: rule.buttons,
          triggeredAt: eventOccurredAt,
          sendAt: computeSendAt(
            eventOccurredAt,
            rule.delayValue,
            rule.delayUnit,
          ),
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
