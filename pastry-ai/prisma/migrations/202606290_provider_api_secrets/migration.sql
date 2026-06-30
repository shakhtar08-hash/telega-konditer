ALTER TABLE "Prompt" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'openai';

CREATE TABLE "ApiSecret" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "valuePreview" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiSecret_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiSecret_key_key" ON "ApiSecret"("key");
