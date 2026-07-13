import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";

type LegacyPrisma = {
  $transaction: typeof prisma.$transaction;
  scheduledMessage: {
    deleteMany(args: unknown): unknown;
  };
  tariffPlan: {
    findMany(args: unknown): Promise<Array<{ slug: string }>>;
  };
  triggerMessage: {
    create(args: unknown): Promise<unknown>;
    delete(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<{ id: string } | null>;
    update(args: unknown): Promise<unknown>;
  };
};

function getLegacyPrisma() {
  return prisma as unknown as LegacyPrisma;
}

async function parseTargetTariffs(formData: FormData, tariffs: Array<{ slug: string }>) {
  const targetPlans: string[] = [];

  for (const tariff of tariffs) {
    if (formData.get(`target_${tariff.slug}`) === "on") {
      targetPlans.push(tariff.slug);
    }
  }

  return targetPlans;
}

export async function createTriggerMessage(formData: FormData) {
  "use server";

  const legacyPrisma = getLegacyPrisma();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const delayMinutes = Number(formData.get("delayMinutes"));
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  if (!slug || !title || !text || Number.isNaN(delayMinutes)) {
    return;
  }

  const tariffs = await legacyPrisma.tariffPlan.findMany({ select: { slug: true } });
  const targetPlans = await parseTargetTariffs(formData, tariffs);

  if (targetPlans.length === 0) {
    return;
  }

  const duplicate = await legacyPrisma.triggerMessage.findFirst({
    where: { slug, delayMinutes },
    select: { id: true },
  });

  if (duplicate) {
    redirect(`/admin/triggers?error=duplicate-delay&slug=${encodeURIComponent(slug)}&delayMinutes=${delayMinutes}`);
  }

  await legacyPrisma.triggerMessage.create({
    data: { slug, title, text, imageUrl, delayMinutes, targetPlans, active: true },
  });

  revalidatePath("/admin/triggers");
}

export async function updateTriggerMessage(formData: FormData) {
  "use server";

  const legacyPrisma = getLegacyPrisma();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const delayMinutes = Number(formData.get("delayMinutes"));
  const active = formData.get("active") === "on";
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  if (!id || !title || !text || Number.isNaN(delayMinutes)) {
    return;
  }

  const tariffs = await legacyPrisma.tariffPlan.findMany({ select: { slug: true } });
  const targetPlans = await parseTargetTariffs(formData, tariffs);

  if (targetPlans.length === 0) {
    return;
  }

  const duplicate = await legacyPrisma.triggerMessage.findFirst({
    where: { slug, delayMinutes, NOT: { id } },
    select: { id: true },
  });

  if (duplicate) {
    redirect(`/admin/triggers?error=duplicate-delay&slug=${encodeURIComponent(slug)}&delayMinutes=${delayMinutes}`);
  }

  await legacyPrisma.$transaction(async (tx) => {
    const typedTx = tx as {
      scheduledMessage: {
        findMany(args: unknown): Promise<Array<{ id: string; triggeredAt: Date }>>;
        update(args: unknown): Promise<unknown>;
      };
      triggerMessage: {
        update(args: unknown): Promise<unknown>;
      };
    };

    await typedTx.triggerMessage.update({
      where: { id },
      data: { title, text, imageUrl, delayMinutes, active, targetPlans },
    });

    const unsentRows = await typedTx.scheduledMessage.findMany({
      where: { triggerMessageId: id, sentAt: null },
      select: { id: true, triggeredAt: true },
    });

    for (const row of unsentRows) {
      await typedTx.scheduledMessage.update({
        where: { id: row.id },
        data: {
          text,
          imageUrl,
          sendAt: new Date(row.triggeredAt.getTime() + delayMinutes * 60 * 1000),
        },
      });
    }
  });

  revalidatePath("/admin/triggers");
}

export async function deleteTriggerMessage(formData: FormData) {
  "use server";

  const legacyPrisma = getLegacyPrisma();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  await legacyPrisma.$transaction([
    legacyPrisma.scheduledMessage.deleteMany({
      where: { triggerMessageId: id, sentAt: null },
    }),
    legacyPrisma.triggerMessage.delete({ where: { id } }),
  ]);

  revalidatePath("/admin/triggers");
}
