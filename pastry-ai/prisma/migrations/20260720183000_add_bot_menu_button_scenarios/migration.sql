DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'SCENARIO'
      AND enumtypid = '"BotMenuActionType"'::regtype
  ) THEN
    ALTER TYPE "BotMenuActionType" ADD VALUE 'SCENARIO';
  END IF;
END $$;

ALTER TABLE "BotMenuButton" ADD COLUMN IF NOT EXISTS "scenarioId" TEXT;

CREATE INDEX IF NOT EXISTS "BotMenuButton_scenarioId_idx" ON "BotMenuButton"("scenarioId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BotMenuButton_scenarioId_fkey'
  ) THEN
    ALTER TABLE "BotMenuButton"
      ADD CONSTRAINT "BotMenuButton_scenarioId_fkey"
      FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
