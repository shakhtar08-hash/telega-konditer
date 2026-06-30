CREATE TABLE "FunnelStep" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nextButtonText" TEXT NOT NULL DEFAULT 'Далее',
    "buyButtonText" TEXT NOT NULL DEFAULT 'Купить',
    "offerButtonText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FunnelStep_slug_key" ON "FunnelStep"("slug");

CREATE INDEX "FunnelStep_active_sortOrder_idx" ON "FunnelStep"("active", "sortOrder");
