import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeStem(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

export async function saveAdminImage(input: {
  entity: "chat-bot" | "funnel" | "photo-styles" | "triggers";
  file: File | null;
  existingValue?: string | null;
  manualValue?: string | null;
}): Promise<string | null> {
  const manualValue = input.manualValue?.trim() || null;
  const file = input.file;

  if (!file || file.size === 0) {
    return manualValue;
  }

  if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE) {
    return manualValue ?? input.existingValue ?? null;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".bin";
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  const filename = `${stamp}-${randomBytes(3).toString("hex")}-${sanitizeStem(file.name)}${ext}`;
  const relativeDir = path.join("uploads", "admin", input.entity);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, filename), bytes);

  return `/${relativeDir.replace(/\\/g, "/")}/${filename}`;
}