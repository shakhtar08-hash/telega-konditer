### Task 1: Replace slug-based trigger data with explicit trigger rules

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_trigger_rule_redesign/migration.sql`
- Test: `src/features/triggers/trigger-service.test.ts`

**Interfaces:**
- Consumes: existing `TriggerMessage` and `ScheduledMessage` schema, existing Prisma client usage
- Produces:
  - `TriggerRule` Prisma model with fields `id`, `name`, `eventKey`, `status`, `delayValue`, `delayUnit`, `messageText`, `imageUrl`, `buttons`, `conditions`, `createdAt`, `updatedAt`
  - `ScheduledMessage` fields `triggerRuleId`, `triggerEventKey`, `triggeredAt`, `sendAt`, `sentAt`

- [ ] **Step 1: Write the failing schema-facing test notes in the existing trigger service test**

```ts
it("expects explicit rule fields instead of slug + delayMinutes", () => {
  const rule = {
    id: "rule_1",
    name: "After Start: no promo",
    eventKey: "user.started",
    status: "active",
    delayValue: 15,
    delayUnit: "minutes",
    messageText: "Hello!",
    imageUrl: null,
    buttons: null,
    conditions: [{ field: "promoClaimed", operator: "is", value: false }],
  };

  expect(rule.eventKey).toBe("user.started");
  expect(rule.delayUnit).toBe("minutes");
});
```

- [ ] **Step 2: Run test to verify current code does not model the new rule shape**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: FAIL or missing assertions around `eventKey`, `delayUnit`, and `conditions`

- [ ] **Step 3: Update Prisma schema to add the new trigger rule model and scheduled-send linkage**

```prisma
model TriggerRule {
  id          String   @id @default(cuid())
  name        String
  eventKey    String
  status      String
  delayValue  Int
  delayUnit   String
  messageText String
  imageUrl    String?
  buttons     Json?
  conditions  Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([eventKey, status])
}

model ScheduledMessage {
  id              String    @id @default(cuid())
  triggerRuleId   String
  triggerEventKey String
  chatId          String
  text            String
  imageUrl        String?
  buttons         Json?
  triggeredAt     DateTime
  sendAt          DateTime
  sentAt          DateTime?
  createdAt       DateTime  @default(now())

  @@index([triggerRuleId, chatId, sentAt])
  @@index([triggerEventKey])
  @@index([sentAt, sendAt])
}
```

- [ ] **Step 4: Write the migration with a safe data copy path from `TriggerMessage` to `TriggerRule`**

```sql
CREATE TABLE "TriggerRule" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "delayValue" INTEGER NOT NULL,
  "delayUnit" TEXT NOT NULL,
  "messageText" TEXT NOT NULL,
  "imageUrl" TEXT,
  "buttons" JSONB,
  "conditions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerRuleId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerEventKey" TEXT;

INSERT INTO "TriggerRule" (
  "id", "name", "eventKey", "status", "delayValue", "delayUnit", "messageText", "imageUrl", "buttons", "conditions", "createdAt", "updatedAt"
)
SELECT
  "id",
  "title",
  "slug",
  CASE WHEN "active" THEN 'active' ELSE 'disabled' END,
  "delayMinutes",
  'minutes',
  "text",
  "imageUrl",
  "buttons",
  jsonb_build_array(jsonb_build_object('field', 'plan', 'operator', 'in', 'value', "targetPlans")),
  "createdAt",
  "updatedAt"
FROM "TriggerMessage";
```

- [ ] **Step 5: Run schema and migration verification**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`

Run: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script`
Expected: SQL script output without schema parse errors

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/<timestamp>_trigger_rule_redesign/migration.sql src/features/triggers/trigger-service.test.ts
git commit -m "feat: introduce trigger rule schema"
```

