import { describe, expect, it, vi } from "vitest";
import { createTariffPlanRepository } from "./tariff-plan-repository";

describe("TariffPlanRepository", () => {
  it("lists all tariff plans ordered by sortOrder", async () => {
    const mockDelegate = {
      findMany: vi.fn().mockResolvedValue([
        { id: "1", slug: "promo", name: "Промо", tokenAmount: 15, durationDays: 3, active: true, sortOrder: 1 },
        { id: "2", slug: "pastry-chef", name: "Кондитер", tokenAmount: 100, durationDays: 30, active: true, sortOrder: 2 },
      ]),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    };
    const repo = createTariffPlanRepository(mockDelegate as never);
    const result = await repo.listAll();
    expect(result).toHaveLength(2);
    expect(mockDelegate.findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: "asc" } });
  });

  it("finds by slug", async () => {
    const mockDelegate = {
      findMany: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ id: "1", slug: "promo", name: "Промо", tokenAmount: 15, durationDays: 3, active: true, sortOrder: 1 }),
      update: vi.fn(),
      create: vi.fn(),
    };
    const repo = createTariffPlanRepository(mockDelegate as never);
    const result = await repo.findBySlug("promo");
    expect(result?.name).toBe("Промо");
    expect(mockDelegate.findUnique).toHaveBeenCalledWith({ where: { slug: "promo" } });
  });

  it("updates a tariff plan", async () => {
    const mockDelegate = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "1", slug: "promo", name: "Промо обновлённый", tokenAmount: 20, durationDays: 5, active: true, sortOrder: 1 }),
      create: vi.fn(),
    };
    const repo = createTariffPlanRepository(mockDelegate as never);
    const result = await repo.update("1", { name: "Промо обновлённый", tokenAmount: 20, durationDays: 5 });
    expect(result.name).toBe("Промо обновлённый");
    expect(mockDelegate.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { name: "Промо обновлённый", tokenAmount: 20, durationDays: 5 },
    });
  });
});