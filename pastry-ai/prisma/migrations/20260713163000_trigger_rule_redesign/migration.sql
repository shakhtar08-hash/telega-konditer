CREATE TABLE "TriggerRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "delayValue" INTEGER NOT NULL,
    "delayUnit" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "imageUrl" TEXT,
    "buttons" JSONB,
    "conditions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriggerRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TriggerRule_eventKey_status_idx" ON "TriggerRule"("eventKey", "status");

INSERT INTO "TriggerRule" (
    "id",
    "name",
    "eventKey",
    "status",
    "delayValue",
    "delayUnit",
    "messageText",
    "imageUrl",
    "buttons",
    "conditions",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "title",
    "slug",
    CASE
        WHEN "active" THEN 'active'
        ELSE 'disabled'
    END,
    "delayMinutes",
    'minutes',
    "text",
    "imageUrl",
    "buttons",
    CASE
        WHEN jsonb_typeof("targetPlans") = 'array' AND jsonb_array_length("targetPlans") > 0 THEN
            jsonb_build_array(
                jsonb_build_object(
                    'field', 'plan',
                    'operator', 'in',
                    'value', "targetPlans"
                )
            )
        ELSE '[]'::jsonb
    END,
    "createdAt",
    "updatedAt"
FROM "TriggerMessage";

ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerRuleId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerEventKey" TEXT;

UPDATE "ScheduledMessage"
SET
    "triggerRuleId" = "triggerMessageId",
    "triggerEventKey" = "triggerSlug";

ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggerRuleId" SET NOT NULL;
ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggerEventKey" SET NOT NULL;

DROP INDEX IF EXISTS "ScheduledMessage_triggerMessageId_chatId_sentAt_idx";
DROP INDEX IF EXISTS "ScheduledMessage_triggerSlug_idx";

ALTER TABLE "ScheduledMessage" DROP COLUMN "triggerMessageId";
ALTER TABLE "ScheduledMessage" DROP COLUMN "triggerSlug";

CREATE INDEX "ScheduledMessage_triggerRuleId_chatId_sentAt_idx"
ON "ScheduledMessage"("triggerRuleId", "chatId", "sentAt");

CREATE INDEX "ScheduledMessage_triggerEventKey_idx"
ON "ScheduledMessage"("triggerEventKey");

DROP TABLE "TriggerMessage";
