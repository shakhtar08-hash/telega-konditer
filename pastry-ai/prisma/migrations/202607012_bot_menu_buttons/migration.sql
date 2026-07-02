CREATE TYPE "BotMenuActionType" AS ENUM ('PROMPT', 'URL');

CREATE TABLE "BotMenuButton" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "actionType" "BotMenuActionType" NOT NULL DEFAULT 'PROMPT',
    "promptFeature" TEXT,
    "promptSlug" TEXT,
    "url" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotMenuButton_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotMenuButton_active_sortOrder_idx" ON "BotMenuButton"("active", "sortOrder");
