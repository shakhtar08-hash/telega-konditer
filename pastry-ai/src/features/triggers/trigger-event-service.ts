import type { TriggerUserState } from "./trigger-rule-types";

type TriggerEventPayload = {
  userId: string;
  chatId: string;
  occurredAt?: Date;
};

type Dependencies = {
  loadTriggerUserState(userId: string): Promise<TriggerUserState>;
  scheduleTrigger(
    eventKey: string,
    chatId: string,
    state: TriggerUserState,
    occurredAt?: Date,
  ): Promise<void>;
};

export function createTriggerEventService(deps: Dependencies) {
  return {
    async handleTriggerEvent(
      eventKey: string,
      payload: TriggerEventPayload,
    ): Promise<void> {
      const state = await deps.loadTriggerUserState(payload.userId);
      await deps.scheduleTrigger(
        eventKey,
        payload.chatId,
        state,
        payload.occurredAt,
      );
    },
  };
}
