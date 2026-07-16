CREATE TABLE "GeneratedRecipeContext" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recipeText" TEXT NOT NULL,
  "recipeJson" JSONB,
  "imageUrl" TEXT,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneratedRecipeContext_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeneratedRecipeContext_userId_createdAt_idx"
ON "GeneratedRecipeContext"("userId", "createdAt");

ALTER TABLE "GeneratedRecipeContext"
ADD CONSTRAINT "GeneratedRecipeContext_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
