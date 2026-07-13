CREATE TABLE "UserGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserGroup_name_key" ON "UserGroup"("name");

CREATE TABLE "UserGroupMember" (
  "userId" TEXT NOT NULL,
  "userGroupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserGroupMember_pkey" PRIMARY KEY ("userId", "userGroupId"),
  CONSTRAINT "UserGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserGroupMember_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserGroupMember_userGroupId_idx" ON "UserGroupMember"("userGroupId");
