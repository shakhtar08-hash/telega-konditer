-- AlterTable
ALTER TABLE "TriggerMessage" ADD COLUMN "buttons" JSONB;

-- AlterTable
ALTER TABLE "ScheduledMessage" ADD COLUMN "buttons" JSONB;