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
  scenarioId?: string | null;
  scenarioStepId?: string | null;
  text: string;
  imageUrl: string | null;
  buttons?: unknown;
  triggeredAt: Date;
  sendAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

export type TriggerMessageRecord = TriggerRuleRecord;

type ScenarioTriggerRuleRecord = TriggerRuleRecord & {
  startStepId?: string | null;
};

type Dependencies = {
  findActiveRulesByEvent(eventKey: string): Promise<TriggerRuleRecord[]>;
  createScheduled(data: {
    triggerRuleId: string;
    triggerEventKey: string;
    chatId: string;
    scenarioId?: string | null;
    scenarioStepId?: string | null;
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
        if (rule.delayUnit === "now") {
          continue;
        }

        if (!(await evaluateConditions(rule.conditions, state))) {
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

        if (rule.deliveryType === "SCENARIO") {
          const scenarioRule = rule as ScenarioTriggerRuleRecord;

          if (!scenarioRule.scenarioId || !scenarioRule.startStepId) {
            throw new Error(`Scenario trigger ${rule.id} is missing a start step`);
          }

          await deps.createScheduled({
            triggerRuleId: rule.id,
            triggerEventKey: eventKey,
            chatId,
            scenarioId: scenarioRule.scenarioId,
            scenarioStepId: scenarioRule.startStepId,
            text: "",
            imageUrl: null,
            buttons: null,
            triggeredAt: eventOccurredAt,
            sendAt: computeSendAt(
              eventOccurredAt,
              rule.delayValue,
              rule.delayUnit,
            ),
          });
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
      sendMessage: (
        chatId: string,
        text: string,
        payload: { imageUrl: string | null; buttons: unknown },
      ) => Promise<void>,
      sendScenarioStep?: (chatId: string, stepId: string) => Promise<void>,
    ): Promise<number> {
      const pending = await deps.findPendingScheduled(50);
      let sentCount = 0;

      for (const message of pending) {
        try {
          if (message.scenarioStepId) {
            if (!sendScenarioStep) {
              throw new Error("Scenario step sender is not configured");
            }

            await sendScenarioStep(message.chatId, message.scenarioStepId);
          } else {
            await sendMessage(message.chatId, message.text, {
              imageUrl: message.imageUrl ?? null,
              buttons: message.buttons ?? null,
            });
          }
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
