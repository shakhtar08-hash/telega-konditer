import { prisma } from "@/db/prisma";

export async function loadAdminTariffsPageData() {
  return {
    tariffs: await prisma.tariffPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  };
}

export async function performCreateTariff(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const tokenAmount = Number(formData.get("tokenAmount") ?? 0);
  const durationDays = Number(formData.get("durationDays") ?? 0);
  const active = formData.get("active") === "on";

  if (!slug || !name || tokenAmount < 0 || !durationDays) {
    return;
  }

  await prisma.tariffPlan.create({
    data: { slug, name, tokenAmount, durationDays, active },
  });
}

export async function performUpdateTariff(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const tokenAmount = Number(formData.get("tokenAmount") ?? 0);
  const durationDays = Number(formData.get("durationDays") ?? 0);
  const active = formData.get("active") === "on";

  if (!id || !name || tokenAmount < 0 || !durationDays) {
    return;
  }

  await prisma.tariffPlan.update({
    data: { name, tokenAmount, durationDays, active },
    where: { id },
  });
}

export async function performToggleTariff(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const active = formData.get("active") === "true";

  if (!id) {
    return;
  }

  await prisma.tariffPlan.update({
    data: { active },
    where: { id },
  });
}
