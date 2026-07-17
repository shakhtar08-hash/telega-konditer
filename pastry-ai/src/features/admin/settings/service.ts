import { prisma } from "@/db/prisma";
import {
  encryptApiSecretValue,
  getSecretEncryptionKey,
  managedApiKeys,
  maskSecretValue,
  type ManagedApiKey,
} from "@/lib/api-secrets";

function isManagedApiKey(key: string): key is ManagedApiKey {
  return managedApiKeys.includes(key as ManagedApiKey);
}

export async function loadAdminSettingsPageData() {
  let dbStatus: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  return {
    dbStatus,
    storedSecrets: await prisma.apiSecret.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        key: true,
        updatedAt: true,
        valuePreview: true,
      },
    }),
  };
}

export async function performSaveApiSecret(key: string, value: string) {
  const normalizedKey = key.trim();
  const normalizedValue = value.trim();

  if (!isManagedApiKey(normalizedKey) || !normalizedValue) {
    return;
  }

  const encryptedValue = encryptApiSecretValue(
    normalizedValue,
    getSecretEncryptionKey(),
  );

  await prisma.apiSecret.upsert({
    create: {
      encryptedValue,
      key: normalizedKey,
      valuePreview: maskSecretValue(normalizedValue),
    },
    update: {
      encryptedValue,
      valuePreview: maskSecretValue(normalizedValue),
    },
    where: { key: normalizedKey },
  });
}

export async function performClearApiSecret(key: string) {
  const normalizedKey = key.trim();

  if (!isManagedApiKey(normalizedKey)) {
    return;
  }

  await prisma.apiSecret.deleteMany({
    where: { key: normalizedKey },
  });
}
