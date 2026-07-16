"use server";

import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import {
  addUserToGroup as addUserToGroupShared,
  removeUserFromGroup as removeUserFromGroupShared,
} from "../user-groups/actions";

function getDefaultTariffExpiryDate(durationDays: number) {
  return new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
}

function revalidateUserAdminPaths(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function addUserToGroup(formData: FormData) {
  await addUserToGroupShared(formData);
}

export async function removeUserFromGroup(formData: FormData) {
  await removeUserFromGroupShared(formData);
}

export async function updateUserTariff(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tariffPlanId = String(formData.get("tariffPlanId") ?? "");
  const expiresAtValue = String(formData.get("expiresAt") ?? "").trim();
  const tokensValue = String(formData.get("tokens") ?? "").trim();

  if (!id) {
    return;
  }

  if (!tariffPlanId) {
    await prisma.userTariff.deleteMany({
      where: { userId: id },
    });
    revalidateUserAdminPaths(id);
    return;
  }

  const tariffPlan = await prisma.tariffPlan.findUnique({
    where: { id: tariffPlanId },
    select: {
      durationDays: true,
      id: true,
      tokenAmount: true,
    },
  });

  if (!tariffPlan) {
    return;
  }

  const remainingTokens =
    tokensValue === "" ? tariffPlan.tokenAmount : Number(tokensValue);
  const expiresAt =
    expiresAtValue === ""
      ? getDefaultTariffExpiryDate(tariffPlan.durationDays)
      : new Date(expiresAtValue);

  if (
    !Number.isFinite(remainingTokens) ||
    remainingTokens < 0 ||
    Number.isNaN(expiresAt.getTime())
  ) {
    return;
  }

  const existingTariff = await prisma.userTariff.findUnique({
    where: { userId: id },
    select: { id: true },
  });

  if (existingTariff) {
    await prisma.userTariff.update({
      where: { userId: id },
      data: {
        expiresAt,
        remainingTokens,
        tariffPlanId,
      },
    });
  } else {
    await prisma.userTariff.create({
      data: {
        expiresAt,
        remainingTokens,
        startedAt: new Date(),
        tariffPlanId,
        userId: id,
      },
    });
  }

  revalidateUserAdminPaths(id);
}

export async function deleteUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}
