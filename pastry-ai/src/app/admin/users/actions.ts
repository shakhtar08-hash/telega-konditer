"use server";

import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

export async function deleteUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}