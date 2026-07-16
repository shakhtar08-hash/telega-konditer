-- Add new columns for buy buttons array and next action
ALTER TABLE "FunnelStep" ADD COLUMN "buyButtons" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "FunnelStep" ADD COLUMN "nextAction" TEXT NOT NULL DEFAULT 'next';

-- Change default of buyButtonText to empty string
ALTER TABLE "FunnelStep" ALTER COLUMN "buyButtonText" SET DEFAULT '';

-- Migrate existing data: populate buyButtons from legacy buyButtonText/buyButtonUrl
UPDATE "FunnelStep"
SET "buyButtons" = jsonb_build_array(
  jsonb_build_object(
    'text', "buyButtonText",
    'url', COALESCE("buyButtonUrl", ''),
    'active', true,
    'sortOrder', 0
  )
)
WHERE "buyButtonText" IS NOT NULL AND "buyButtonText" != '';

-- Add promoClaimed to User
ALTER TABLE "User" ADD COLUMN "promoClaimed" BOOLEAN NOT NULL DEFAULT false;