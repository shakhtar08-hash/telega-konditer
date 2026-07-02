import { describe, expect, it } from "vitest";
import { createPrismaSessionStorage } from "./session";

describe("createPrismaSessionStorage", () => {
  it("persists bot session data by key", async () => {
    const records = new Map<string, unknown>();
    const storage = createPrismaSessionStorage({
      deleteMany: async ({ where }) => {
        records.delete(where.key);
      },
      findUnique: async ({ where }) => {
        const data = records.get(where.key);

        return data ? { data } : null;
      },
      upsert: async ({ where, update, create }) => {
        records.set(where.key, records.has(where.key) ? update.data : create.data);
      },
    });

    await storage.write("chat:42", {
      lastFeature: "recipes",
      lastPromptSlug: "recipe-from-ingredients",
    });

    await expect(storage.read("chat:42")).resolves.toEqual({
      lastFeature: "recipes",
      lastPromptSlug: "recipe-from-ingredients",
    });

    await storage.delete("chat:42");

    await expect(storage.read("chat:42")).resolves.toBeUndefined();
  });
});
