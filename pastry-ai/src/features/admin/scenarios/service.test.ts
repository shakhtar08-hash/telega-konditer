import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, saveAdminImageMock } = vi.hoisted(() => ({
  prismaMock: {
    scenario: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    scenarioButton: {
      count: vi.fn(),
      create: vi.fn(),
    },
    scenarioStep: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    triggerRule: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  saveAdminImageMock: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/app/admin/_lib/save-admin-image", () => ({
  saveAdminImage: saveAdminImageMock,
}));

const {
  performCreateScenario,
  performDeleteScenario,
  performDeleteScenarioStep,
  performDuplicateScenario,
  performDuplicateScenarioStep,
  performUpdateScenario,
} = await import("./service");

describe("scenario admin service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.scenarioStep.findMany.mockResolvedValue([]);
    saveAdminImageMock.mockResolvedValue(null);
  });

  it("duplicates a scenario and remaps internal step buttons", async () => {
    prismaMock.scenario.findUniqueOrThrow.mockResolvedValue({
      id: "scenario_1",
      name: "Promo flow",
      description: "Original",
      status: "active",
      startStepId: "step_1",
      steps: [
        {
          id: "step_1",
          scenarioId: "scenario_1",
          name: "Start",
          messageText: "Hello",
          imageUrl: null,
          sortOrder: 0,
          buttons: [
            {
              id: "button_1",
              stepId: "step_1",
              text: "Next",
              sortOrder: 0,
              actionType: "SCENARIO_STEP",
              actionValue: "step_2",
              transitionMode: "REPLACE_CURRENT",
            },
          ],
        },
        {
          id: "step_2",
          scenarioId: "scenario_1",
          name: "Second",
          messageText: "Details",
          imageUrl: "/image.png",
          sortOrder: 1,
          buttons: [
            {
              id: "button_2",
              stepId: "step_2",
              text: "Open",
              sortOrder: 0,
              actionType: "URL",
              actionValue: "https://example.com",
              transitionMode: null,
            },
          ],
        },
      ],
    });
    prismaMock.scenario.create.mockResolvedValue({ id: "scenario_copy" });
    prismaMock.scenarioStep.create
      .mockResolvedValueOnce({ id: "step_1_copy" })
      .mockResolvedValueOnce({ id: "step_2_copy" });
    prismaMock.scenarioButton.create.mockResolvedValue({});
    prismaMock.scenario.update.mockResolvedValue({});

    const result = await performDuplicateScenario("scenario_1");

    expect(result).toBe("scenario_copy");
    expect(prismaMock.scenario.create).toHaveBeenCalledWith({
      data: {
        name: "Promo flow (copy)",
        description: "Original",
        status: "draft",
      },
    });
    expect(prismaMock.scenarioButton.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stepId: "step_1_copy",
        actionType: "SCENARIO_STEP",
        actionValue: "step_2_copy",
        transitionMode: "REPLACE_CURRENT",
      }),
    });
    expect(prismaMock.scenario.update).toHaveBeenCalledWith({
      where: { id: "scenario_copy" },
      data: { startStepId: "step_1_copy" },
    });
  });

  it("blocks deleting a step referenced by another step button", async () => {
    prismaMock.scenarioButton.count.mockResolvedValue(1);

    await expect(performDeleteScenarioStep("step_2")).rejects.toThrow(
      "Cannot delete step because other buttons reference it",
    );
    expect(prismaMock.scenarioStep.delete).not.toHaveBeenCalled();
  });

  it("blocks deleting a scenario used by active triggers", async () => {
    prismaMock.triggerRule.count.mockResolvedValue(1);

    await expect(performDeleteScenario("scenario_1")).rejects.toThrow(
      "Cannot delete scenario because active triggers still use it",
    );
    expect(prismaMock.scenario.delete).not.toHaveBeenCalled();
  });

  it("duplicates a single step after the source step", async () => {
    prismaMock.scenarioStep.findUniqueOrThrow.mockResolvedValue({
      id: "step_1",
      scenarioId: "scenario_1",
      name: "Start",
      messageText: "Hello",
      imageUrl: null,
      sortOrder: 2,
      buttons: [
        {
          id: "button_1",
          text: "Open",
          sortOrder: 0,
          actionType: "URL",
          actionValue: "https://example.com",
          transitionMode: null,
        },
      ],
    });
    prismaMock.scenarioStep.create.mockResolvedValue({ id: "step_copy" });
    prismaMock.scenarioButton.create.mockResolvedValue({});

    const result = await performDuplicateScenarioStep("step_1");

    expect(result).toBe("step_copy");
    expect(prismaMock.scenarioStep.create).toHaveBeenCalledWith({
      data: {
        scenarioId: "scenario_1",
        name: "Start (copy)",
        messageText: "Hello",
        imageUrl: null,
        sortOrder: 3,
      },
    });
    expect(prismaMock.scenarioButton.create).toHaveBeenCalledWith({
      data: {
        stepId: "step_copy",
        text: "Open",
        sortOrder: 0,
        actionType: "URL",
        actionValue: "https://example.com",
        transitionMode: null,
      },
    });
  });

  it("creates and updates scenarios from serialized editor payloads", async () => {
    const formData = new FormData();
    formData.set("name", "Promo flow");
    formData.set("description", "Description");
    formData.set("status", "active");
    formData.set("startStepId", "client_step_1");
    formData.set(
      "steps",
      JSON.stringify([
        {
          id: "client_step_1",
          name: "Start",
          messageText: "Hello",
          imageUrl: "",
          sortOrder: 0,
          buttons: [
            {
              id: "button_1",
              text: "Next",
              sortOrder: 0,
              actionType: "SCENARIO_STEP",
              actionValue: "client_step_2",
              transitionMode: "SEND_NEW",
            },
          ],
        },
        {
          id: "client_step_2",
          name: "Second",
          messageText: "Next message",
          imageUrl: "",
          sortOrder: 1,
          buttons: [],
        },
      ]),
    );
    prismaMock.scenario.create.mockResolvedValue({ id: "scenario_new" });
    prismaMock.scenarioStep.create
      .mockResolvedValueOnce({ id: "step_1" })
      .mockResolvedValueOnce({ id: "step_2" });
    prismaMock.scenarioButton.create.mockResolvedValue({});
    prismaMock.scenario.update.mockResolvedValue({});

    await performCreateScenario(formData);

    expect(prismaMock.scenarioButton.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionValue: "step_2",
        transitionMode: "SEND_NEW",
      }),
    });
    expect(prismaMock.scenario.update).toHaveBeenCalledWith({
      where: { id: "scenario_new" },
      data: { startStepId: "step_1" },
    });

    const updateData = new FormData();
    for (const [key, value] of formData.entries()) {
      updateData.append(key, value);
    }
    updateData.set("id", "scenario_new");
    await performUpdateScenario(updateData);

    expect(prismaMock.scenario.update).toHaveBeenCalledWith({
      where: { id: "scenario_new" },
      data: expect.objectContaining({
        name: "Promo flow",
        status: "active",
      }),
    });
    expect(prismaMock.scenarioStep.deleteMany).toHaveBeenCalledWith({
      where: { scenarioId: "scenario_new" },
    });
  });

  it("prefers an uploaded step image file over a manual url when creating a scenario", async () => {
    const formData = new FormData();
    formData.set("name", "Promo flow");
    formData.set("startStepId", "client_step_1");
    formData.set(
      "steps",
      JSON.stringify([
        {
          id: "client_step_1",
          name: "Start",
          messageText: "Hello",
          imageUrl: "/uploads/admin/scenarios/manual.png",
          sortOrder: 0,
          buttons: [],
        },
      ]),
    );
    formData.set(
      "stepImageFile:client_step_1",
      new File(["image"], "start.png", { type: "image/png" }),
    );
    prismaMock.scenario.create.mockResolvedValue({ id: "scenario_new" });
    prismaMock.scenarioStep.create.mockResolvedValue({ id: "step_1" });
    prismaMock.scenario.update.mockResolvedValue({});
    saveAdminImageMock.mockResolvedValue("/uploads/admin/scenarios/from-file.png");

    await performCreateScenario(formData);

    expect(saveAdminImageMock).toHaveBeenCalledWith({
      entity: "scenarios",
      existingValue: "/uploads/admin/scenarios/manual.png",
      file: expect.any(File),
      manualValue: "/uploads/admin/scenarios/manual.png",
    });
    expect(prismaMock.scenarioStep.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrl: "/uploads/admin/scenarios/from-file.png",
      }),
    });
  });

  it("blocks creating an active scenario without a valid start step", async () => {
    const formData = new FormData();
    formData.set("name", "Promo flow");
    formData.set("status", "active");
    formData.set("startStepId", "missing_step");
    formData.set(
      "steps",
      JSON.stringify([
        {
          id: "client_step_1",
          name: "Start",
          messageText: "Hello",
          imageUrl: "",
          sortOrder: 0,
          buttons: [],
        },
      ]),
    );

    await expect(performCreateScenario(formData)).rejects.toThrow(
      "Active scenario requires a valid start step",
    );
    expect(prismaMock.scenario.create).not.toHaveBeenCalled();
  });

  it("blocks updating an active scenario without a valid start step", async () => {
    const formData = new FormData();
    formData.set("id", "scenario_1");
    formData.set("name", "Promo flow");
    formData.set("status", "active");
    formData.set("startStepId", "missing_step");
    formData.set(
      "steps",
      JSON.stringify([
        {
          id: "client_step_1",
          name: "Start",
          messageText: "Hello",
          imageUrl: "",
          sortOrder: 0,
          buttons: [],
        },
      ]),
    );

    await expect(performUpdateScenario(formData)).rejects.toThrow(
      "Active scenario requires a valid start step",
    );
    expect(prismaMock.scenario.update).not.toHaveBeenCalled();
  });

  it("blocks saving scenarios with invalid URL button values", async () => {
    const formData = new FormData();
    formData.set("name", "Promo flow");
    formData.set(
      "steps",
      JSON.stringify([
        {
          id: "client_step_1",
          name: "Start",
          messageText: "Hello",
          imageUrl: "",
          sortOrder: 0,
          buttons: [
            {
              id: "button_bad_url",
              text: "Open",
              sortOrder: 0,
              actionType: "URL",
              actionValue: "not-a-url",
              transitionMode: null,
            },
          ],
        },
      ]),
    );

    await expect(performCreateScenario(formData)).rejects.toThrow(
      "Scenario URL buttons require a valid http or https URL",
    );
    expect(prismaMock.scenario.create).not.toHaveBeenCalled();
  });

  it("blocks saving scenarios with scenario-step buttons targeting missing submitted steps", async () => {
    const formData = new FormData();
    formData.set("name", "Promo flow");
    formData.set(
      "steps",
      JSON.stringify([
        {
          id: "client_step_1",
          name: "Start",
          messageText: "Hello",
          imageUrl: "",
          sortOrder: 0,
          buttons: [
            {
              id: "button_missing_step",
              text: "Next",
              sortOrder: 0,
              actionType: "SCENARIO_STEP",
              actionValue: "missing_step",
              transitionMode: "SEND_NEW",
            },
          ],
        },
      ]),
    );

    await expect(performCreateScenario(formData)).rejects.toThrow(
      "Scenario step buttons must target a step in the same scenario",
    );
    expect(prismaMock.scenario.create).not.toHaveBeenCalled();
  });

  it("normalizes legacy tariff purchase scenario button slugs on save", async () => {
    const formData = new FormData();
    formData.set("name", "Promo flow");
    formData.set(
      "steps",
      JSON.stringify([
        {
          id: "client_step_1",
          name: "Offer",
          messageText: "Choose a plan",
          imageUrl: "",
          sortOrder: 0,
          buttons: [
            {
              id: "button_tariff",
              text: "Кондитер",
              sortOrder: 0,
              actionType: "TARIFF_PURCHASE",
              actionValue: "pastry-chef",
              transitionMode: null,
            },
          ],
        },
      ]),
    );
    prismaMock.scenario.create.mockResolvedValue({ id: "scenario_new" });
    prismaMock.scenarioStep.create.mockResolvedValue({ id: "step_1" });
    prismaMock.scenarioButton.create.mockResolvedValue({});
    prismaMock.scenario.update.mockResolvedValue({});

    await performCreateScenario(formData);

    expect(prismaMock.scenarioButton.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: "TARIFF_PURCHASE",
        actionValue: "basic",
      }),
    });
  });

  it("blocks updating a scenario when the update removes a referenced step", async () => {
    const formData = new FormData();
    formData.set("id", "scenario_1");
    formData.set("name", "Promo flow");
    formData.set(
      "steps",
      JSON.stringify([
        {
          id: "step_kept",
          name: "Start",
          messageText: "Hello",
          imageUrl: "",
          sortOrder: 0,
          buttons: [],
        },
      ]),
    );
    prismaMock.scenarioStep.findMany.mockResolvedValue([
      { id: "step_kept" },
      { id: "step_removed" },
    ]);
    prismaMock.scenarioButton.count.mockResolvedValue(1);

    await expect(performUpdateScenario(formData)).rejects.toThrow(
      "Cannot delete step because other buttons reference it",
    );
    expect(prismaMock.scenarioStep.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.scenario.update).not.toHaveBeenCalled();
  });
});
