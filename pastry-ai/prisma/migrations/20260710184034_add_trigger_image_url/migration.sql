-- AddTriggerImageUrl
ALTER TABLE "TriggerMessage" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;