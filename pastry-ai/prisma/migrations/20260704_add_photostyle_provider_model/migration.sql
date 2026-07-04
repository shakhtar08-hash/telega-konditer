-- AlterTable
ALTER TABLE "PhotoStyle" ADD COLUMN "provider" TEXT DEFAULT 'openai';
ALTER TABLE "PhotoStyle" ADD COLUMN "model" TEXT DEFAULT 'gpt-image-1';