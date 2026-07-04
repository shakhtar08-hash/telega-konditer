import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const managedApiKeys = [
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "KIE_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
] as const;

export type ManagedApiKey = (typeof managedApiKeys)[number];

export function maskSecretValue(value: string) {
  if (value.length <= 8) {
    return "Set";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function encryptApiSecretValue(value: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptApiSecretValue(encryptedValue: string, secret: string) {
  const [version, iv, tag, encrypted] = encryptedValue.split(".");

  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted secret format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    createKey(secret),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function getSecretEncryptionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is required to manage API keys");
  }

  return secret;
}

export async function resolveManagedApiKey(key: ManagedApiKey) {
  const envValue = process.env[key];

  if (envValue) {
    return envValue;
  }

  const { prisma } = await import("@/db/prisma");
  const secret = await prisma.apiSecret.findUnique({
    where: { key },
    select: { encryptedValue: true },
  });

  if (!secret) {
    return undefined;
  }

  return decryptApiSecretValue(secret.encryptedValue, getSecretEncryptionKey());
}

function createKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}
