### Task 2: Migration script for existing users

**Files:**
- Create: `prisma/migrate-legacy-users.mjs`

**Interfaces:**
- Consumes: `User.credits`, `User.plan`, `Subscription`
- Produces: `UserTariff` rows for existing users

- [ ] **Step 1: Create migration script**

Create `prisma/migrate-legacy-users.mjs`:
```javascript
// Run once to migrate existing users from credits/plan to UserTariff.
// Usage: node prisma/migrate-legacy-users.mjs
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function migrate() {
  const promoPlan = await prisma.tariffPlan.findUnique({ where: { slug: "promo" } });
  if (!promoPlan) {
    console.error("Tariff 'promo' not found. Run seed first.");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    select: { id: true, credits: true },
  });

  let migrated = 0;
  for (const user of users) {
    const existing = await prisma.userTariff.findUnique({ where: { userId: user.id } });
    if (existing) continue;

    const tokens = user.credits > 0 ? user.credits : 15;
    await prisma.userTariff.create({
      data: {
        userId: user.id,
        tariffPlanId: promoPlan.id,
        remainingTokens: tokens,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });
    migrated++;
  }

  console.log(`Migrated ${migrated} users to UserTariff.`);
  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add prisma/migrate-legacy-users.mjs
git commit -m "feat: add legacy user migration script for tariffs"
```

