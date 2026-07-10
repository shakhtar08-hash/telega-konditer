-- Drop unique constraint on slug (old one-trigger-per-slug model)
ALTER TABLE "TriggerMessage" DROP CONSTRAINT "TriggerMessage_slug_key";

-- Add unique composite index on slug + delayMinutes
CREATE UNIQUE INDEX "TriggerMessage_slug_delayMinutes_key"
ON "TriggerMessage"("slug", "delayMinutes");

-- Add index on (slug, active) for efficient lookups
CREATE INDEX "TriggerMessage_slug_active_idx"
ON "TriggerMessage"("slug", "active");

-- Add new columns to ScheduledMessage
ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerMessageId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN "triggeredAt" TIMESTAMP(3);
ALTER TABLE "ScheduledMessage" ADD COLUMN "imageUrl" TEXT;

-- Backfill triggerMessageId and triggeredAt for existing rows
-- Since old schema allowed only one trigger per slug, joining on triggerSlug is deterministic
UPDATE "ScheduledMessage" sm
SET "triggerMessageId" = tm."id",
    "triggeredAt" = sm."sendAt" - make_interval(mins => tm."delayMinutes"),
    "imageUrl" = tm."imageUrl"
FROM "TriggerMessage" tm
WHERE sm."triggerSlug" = tm."slug";

-- Make new columns NOT NULL after backfill
ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggerMessageId" SET NOT NULL;
ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggeredAt" SET NOT NULL;

-- Add indexes on ScheduledMessage
CREATE INDEX "ScheduledMessage_triggerSlug_idx" ON "ScheduledMessage"("triggerSlug");
CREATE INDEX "ScheduledMessage_triggerMessageId_chatId_sentAt_idx"
ON "ScheduledMessage"("triggerMessageId", "chatId", "sentAt");
CREATE INDEX "ScheduledMessage_sentAt_sendAt_idx"
ON "ScheduledMessage"("sentAt", "sendAt");

-- Mark migration as applied
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (gen_random_uuid()::text, '', NOW(), '20260710184500_trigger_rules_multi_message', NULL, NULL, NOW(), 1)
ON CONFLICT (migration_name) DO NOTHING;