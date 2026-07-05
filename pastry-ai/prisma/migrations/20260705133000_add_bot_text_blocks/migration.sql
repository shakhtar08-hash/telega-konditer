CREATE TABLE "BotTextBlock" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotTextBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotTextBlock_key_key" ON "BotTextBlock"("key");
