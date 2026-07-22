import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    botMenuButton: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    botTextBlock: {
      findUnique: vi.fn(),
    },
    prompt: {
      findMany: vi.fn(),
    },
    scenario: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

const {
  loadAdminChatBotPageData,
  performCreateBotMenuButton,
  performUpdateBotMenuButton,
} = await import("./service");

describe("admin chat-bot service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.botTextBlock.findUnique.mockResolvedValue(null);
    prismaMock.prompt.findMany.mockResolvedValue([]);
    prismaMock.scenario.findMany.mockResolvedValue([]);
  });

  it("loads scenario options alongside prompts and buttons", async () => {
    prismaMock.botMenuButton.findMany.mockResolvedValue([]);
    prismaMock.scenario.findMany.mockResolvedValue([
      { id: "scenario_1", name: "Welcome flow" },
    ]);

    const result = await loadAdminChatBotPageData();

    expect(prismaMock.scenario.findMany).toHaveBeenCalledWith({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
      where: { startStepId: { not: null }, status: "active" },
    });
    expect(result.scenarios).toEqual([
      { id: "scenario_1", name: "Welcome flow" },
    ]);
  });

  it("stores scenarioId for SCENARIO menu buttons", async () => {
    await performCreateBotMenuButton({
      actionType: "SCENARIO",
      active: true,
      description: "Starts onboarding",
      emoji: "🎬",
      fullWidth: false,
      instructionText: null,
      label: "Старт сценария",
      previewImageUrl: null,
      processingText: null,
      promptFeature: "recipes",
      promptSlug: "recipe-from-ingredients",
      scenarioId: "scenario_1",
      sortOrder: 1,
      url: "https://example.com",
    });

    expect(prismaMock.botMenuButton.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: "SCENARIO",
        promptFeature: null,
        promptSlug: null,
        scenarioId: "scenario_1",
        url: null,
      }),
    });
  });

  it("keeps existing scenarioId when SCENARIO update omits selection", async () => {
    prismaMock.botMenuButton.findUnique.mockResolvedValue({
      promptFeature: null,
      promptSlug: null,
      scenarioId: "scenario_1",
    });

    await performUpdateBotMenuButton({
      id: "button_1",
      actionType: "SCENARIO",
      active: true,
      description: "Starts onboarding",
      emoji: "🎬",
      fullWidth: false,
      instructionText: null,
      label: "Старт сценария",
      previewImageUrl: null,
      processingText: null,
      promptFeature: null,
      promptSlug: null,
      scenarioId: null,
      sortOrder: 1,
      url: null,
    });

    expect(prismaMock.botMenuButton.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: "SCENARIO",
        promptFeature: null,
        promptSlug: null,
        scenarioId: "scenario_1",
        url: null,
      }),
      where: { id: "button_1" },
    });
  });
});
