ALTER TABLE "TriggerRule" ADD COLUMN IF NOT EXISTS "deliveryType" TEXT NOT NULL DEFAULT 'MESSAGE';
ALTER TABLE "TriggerRule" ADD COLUMN IF NOT EXISTS "scenarioId" TEXT;

CREATE TABLE "Scenario" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startStepId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScenarioStep" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "messageText" TEXT NOT NULL,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScenarioStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScenarioButton" (
  "id" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "actionType" TEXT NOT NULL,
  "actionValue" TEXT,
  "transitionMode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScenarioButton_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "scenarioId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN IF NOT EXISTS "scenarioStepId" TEXT;

CREATE INDEX "ScenarioStep_scenarioId_sortOrder_idx" ON "ScenarioStep"("scenarioId", "sortOrder");
CREATE INDEX "ScenarioButton_stepId_sortOrder_idx" ON "ScenarioButton"("stepId", "sortOrder");
CREATE INDEX "TriggerRule_scenarioId_idx" ON "TriggerRule"("scenarioId");
CREATE INDEX "ScheduledMessage_scenarioStepId_idx" ON "ScheduledMessage"("scenarioStepId");

ALTER TABLE "ScenarioStep"
  ADD CONSTRAINT "ScenarioStep_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScenarioButton"
  ADD CONSTRAINT "ScenarioButton_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "ScenarioStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TriggerRule"
  ADD CONSTRAINT "TriggerRule_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
