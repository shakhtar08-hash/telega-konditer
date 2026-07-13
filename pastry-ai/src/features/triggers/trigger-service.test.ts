import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTriggerService } from "./trigger-service";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const migrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260713163000_trigger_rule_redesign",
  "migration.sql",
);

describe("createTriggerService", () => {
  const mockTriggerMessage = {
    id: "1",
    slug: "after-start",
    title: "test",
    text: "Hello!",
    imageUrl: null,
    delayMinutes: 15,
    targetPlans: ["promo"],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const findActiveBySlugMock = vi.fn();
  const createScheduledMock = vi.fn();
  const findPendingScheduledMock = vi.fn();
  const markSentMock = vi.fn();
  const findExistingScheduledMock = vi.fn();

  const service = createTriggerService({
    findActiveBySlug: findActiveBySlugMock,
    createScheduled: createScheduledMock,
    findPendingScheduled: findPendingScheduledMock,
    markSent: markSentMock,
    findExistingScheduled: findExistingScheduledMock,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defines explicit trigger rule fields in Prisma instead of the legacy slug-based trigger model", () => {
    const schema = readFileSync(schemaPath, "utf8");

    expect(schema).toMatch(/model TriggerRule \{/);
    expect(schema).toMatch(/eventKey\s+String/);
    expect(schema).toMatch(/status\s+String/);
    expect(schema).toMatch(/delayValue\s+Int/);
    expect(schema).toMatch(/delayUnit\s+String/);
    expect(schema).toMatch(/messageText\s+String/);
    expect(schema).toMatch(/conditions\s+Json/);
    expect(schema).toMatch(/triggerRuleId\s+String/);
    expect(schema).toMatch(/triggerEventKey\s+String/);
    expect(schema).not.toMatch(/model TriggerMessage \{/);
    expect(schema).not.toMatch(/triggerMessageId\s+String/);
    expect(schema).not.toMatch(/triggerSlug\s+String/);
  });

  it("backfills scheduled rows to triggerRuleId and triggerEventKey before dropping legacy trigger structures", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/INSERT INTO "TriggerRule"/);
    expect(migration).toMatch(/FROM "TriggerMessage";/);
    expect(migration).toMatch(/"triggerRuleId"\s*=\s*"triggerMessageId"/);
    expect(migration).toMatch(/"triggerEventKey"\s*=\s*"triggerSlug"/);
    expect(migration).toMatch(/ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggerRuleId" SET NOT NULL;/);
    expect(migration).toMatch(/ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggerEventKey" SET NOT NULL;/);

    const copyIndex = migration.indexOf('INSERT INTO "TriggerRule"');
    const addRuleIdIndex = migration.indexOf(
      'ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerRuleId" TEXT;',
    );
    const backfillIndex = migration.indexOf('UPDATE "ScheduledMessage"');
    const dropLegacyScheduledIndex = migration.indexOf(
      'ALTER TABLE "ScheduledMessage" DROP COLUMN "triggerMessageId";',
    );
    const dropLegacyTriggerIndex = migration.indexOf('DROP TABLE "TriggerMessage";');

    expect(copyIndex).toBeGreaterThan(-1);
    expect(addRuleIdIndex).toBeGreaterThan(copyIndex);
    expect(backfillIndex).toBeGreaterThan(addRuleIdIndex);
    expect(dropLegacyScheduledIndex).toBeGreaterThan(backfillIndex);
    expect(dropLegacyTriggerIndex).toBeGreaterThan(dropLegacyScheduledIndex);
  });

  it("uses the migration SQL backfill assignments to preserve scheduled payload data while rewriting legacy linkage", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const updateBlockMatch = migration.match(
      /UPDATE "ScheduledMessage"\s+SET\s+([\s\S]*?)\s+ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggerRuleId" SET NOT NULL;/,
    );

    expect(updateBlockMatch).not.toBeNull();

    const assignments = Array.from(
      updateBlockMatch![1].matchAll(/"([^"]+)"\s*=\s*"([^"]+)"/g),
    ).map(([, target, source]) => [target, source] as const);

    const legacyScheduled = {
      id: "scheduled_1",
      triggerMessageId: "trigger_1",
      triggerSlug: "user.started",
      chatId: "chat_1",
      text: "Hello!",
      imageUrl: "/promo.png",
      buttons: [{ text: "Open" }],
      triggeredAt: new Date("2026-07-13T10:00:00.000Z"),
      sendAt: new Date("2026-07-13T10:15:00.000Z"),
      sentAt: null,
      createdAt: new Date("2026-07-13T10:00:00.000Z"),
    } satisfies Record<string, unknown>;

    const migratedFields = Object.fromEntries(
      assignments.map(([target, source]) => [target, legacyScheduled[source]]),
    );

    expect(migratedFields).toEqual({
      triggerRuleId: legacyScheduled.triggerMessageId,
      triggerEventKey: legacyScheduled.triggerSlug,
    });
    expect(legacyScheduled.chatId).toBe("chat_1");
    expect(legacyScheduled.sendAt).toEqual(new Date("2026-07-13T10:15:00.000Z"));
    expect(legacyScheduled.text).toBe("Hello!");
  });

  it("schedules a trigger when plan matches targetPlans", async () => {
    findActiveBySlugMock.mockResolvedValue([mockTriggerMessage]);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("after-start", "12345", "promo");

    expect(createScheduledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerSlug: "after-start",
        chatId: "12345",
        text: "Hello!",
      }),
    );
  });

  it("skips scheduling when plan does not match targetPlans", async () => {
    findActiveBySlugMock.mockResolvedValue([mockTriggerMessage]);

    await service.scheduleTrigger("after-start", "12345", "pastry-chef");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("skips scheduling when trigger is not found", async () => {
    findActiveBySlugMock.mockResolvedValue([]);

    await service.scheduleTrigger("nonexistent", "12345", "promo");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("schedules multiple messages for the same slug", async () => {
    findActiveBySlugMock.mockResolvedValue([
      {
        id: "t1",
        slug: "after-start",
        title: "15 мин",
        text: "Первое сообщение",
        imageUrl: null,
        delayMinutes: 15,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "t2",
        slug: "after-start",
        title: "60 мин",
        text: "Второе сообщение",
        imageUrl: null,
        delayMinutes: 60,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("after-start", "12345", "promo");

    expect(createScheduledMock).toHaveBeenCalledTimes(2);
  });

  it("stores triggeredAt and sendAt per trigger message", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T17:00:00.000Z"));

    findActiveBySlugMock.mockResolvedValue([
      {
        id: "t1",
        slug: "after-start",
        title: "15 мин",
        text: "Первое",
        imageUrl: "/uploads/admin/triggers/first.webp",
        delayMinutes: 15,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("after-start", "12345", "promo");

    expect(createScheduledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerMessageId: "t1",
        triggerSlug: "after-start",
        triggeredAt: new Date("2026-07-10T17:00:00.000Z"),
        sendAt: new Date("2026-07-10T17:15:00.000Z"),
        imageUrl: "/uploads/admin/triggers/first.webp",
      }),
    );

    vi.useRealTimers();
  });

  it("marks sent on sendMessage failure", async () => {
    findPendingScheduledMock.mockResolvedValue([
      { id: "p1", triggerMessageId: "t1", triggerSlug: "after-start", chatId: "12345", text: "Hello!", imageUrl: null, triggeredAt: new Date(), sendAt: new Date(), sentAt: null, createdAt: new Date() },
    ]);
    const sendError = new Error("send failed");

    await service.processPendingTriggers(async () => {
      throw sendError;
    });

    expect(markSentMock).toHaveBeenCalledWith("p1");
  });

  it("does not create duplicate pending scheduled message per triggerMessageId + chatId", async () => {
    findActiveBySlugMock.mockResolvedValue([mockTriggerMessage]);
    findExistingScheduledMock.mockResolvedValue({ id: "existing" });

    await service.scheduleTrigger("after-start", "12345", "promo");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });
});
