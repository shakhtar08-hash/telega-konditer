-- CreateTable
CREATE TABLE "DynamicUserGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "logicOperator" TEXT NOT NULL,
  "conditionsJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DynamicUserGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicUserGroup_name_key" ON "DynamicUserGroup"("name");

-- CreateIndex
CREATE INDEX "DynamicUserGroup_status_updatedAt_idx" ON "DynamicUserGroup"("status", "updatedAt");
