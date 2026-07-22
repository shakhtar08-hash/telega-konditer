import { saveAdminImage } from "@/app/admin/_lib/save-admin-image";
import { prisma } from "@/db/prisma";
import { normalizeTariffPurchaseSlug } from "@/features/payments/tariff-purchase";
import type {
  ScenarioButtonActionType,
  ScenarioRecord,
  ScenarioStepRecord,
  ScenarioTransitionMode,
} from "@/features/scenarios/scenario-types";

export type AdminScenarioListRecord = Pick<
  ScenarioRecord,
  "description" | "id" | "name" | "startStepId" | "status"
> & {
  createdAt: Date;
  updatedAt: Date;
  stepCount: number;
};

export type AdminScenarioEditorRecord = ScenarioRecord;

type ScenarioStatus = ScenarioRecord["status"];

type ParsedScenarioButtonInput = {
  id: string;
  text: string;
  sortOrder: number;
  actionType: ScenarioButtonActionType;
  actionValue: string | null;
  transitionMode: ScenarioTransitionMode | null;
};

type ParsedScenarioStepInput = {
  id: string;
  name: string;
  messageText: string;
  imageUrl: string | null;
  sortOrder: number;
  buttons: ParsedScenarioButtonInput[];
};

type ScenarioWriteClient = Pick<typeof prisma, "scenarioButton" | "scenarioStep">;

const allowedScenarioStatuses = new Set<ScenarioStatus>([
  "draft",
  "active",
  "disabled",
]);

const allowedButtonActionTypes = new Set<ScenarioButtonActionType>([
  "URL",
  "SCENARIO_STEP",
  "BOT_COMMAND",
  "TARIFF_PURCHASE",
  "MAIN_MENU",
]);

const allowedTransitionModes = new Set<ScenarioTransitionMode>([
  "SEND_NEW",
  "REPLACE_CURRENT",
]);

const allowedTelegramHtmlTags = new Set([
  "a",
  "b",
  "blockquote",
  "code",
  "i",
  "pre",
  "s",
]);

function parseStatus(value: FormDataEntryValue | null): ScenarioStatus {
  const status = String(value ?? "draft").trim();
  return allowedScenarioStatuses.has(status as ScenarioStatus)
    ? (status as ScenarioStatus)
    : "draft";
}

function toSortOrder(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateTelegramHtmlSubset(text: string): string | null {
  const tagPattern = /<\/?([a-z]+)([^>]*)>/gi;
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(text)) !== null) {
    const [fullMatch, rawTagName, rawAttributes] = match;
    const tagName = rawTagName.toLowerCase();
    const isClosing = fullMatch.startsWith("</");
    const attributes = rawAttributes.trim();

    if (!allowedTelegramHtmlTags.has(tagName)) {
      return `Тег <${tagName}> не поддерживается в Telegram HTML.`;
    }

    if (isClosing) {
      const expected = stack.pop();

      if (expected !== tagName) {
        return "HTML-разметка содержит неверно вложенные или незакрытые теги.";
      }

      continue;
    }

    if (tagName === "a") {
      if (!/^href="https?:\/\/[^"]+"$/.test(attributes)) {
        return 'Ссылка должна использовать тег <a href="https://...">.';
      }
    } else if (attributes.length > 0) {
      return `Тег <${tagName}> не должен содержать дополнительные атрибуты.`;
    }

    stack.push(tagName);
  }

  const strippedKnownTags = text.replace(tagPattern, "");
  if (/[<>]/.test(strippedKnownTags)) {
    return "HTML-разметка содержит недопустимые символы или незавершённые теги.";
  }

  if (stack.length > 0) {
    return "HTML-разметка содержит незакрытые теги.";
  }

  return null;
}

function parseButton(input: unknown, index: number): ParsedScenarioButtonInput | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const text = String(candidate.text ?? "").trim();
  const rawActionType = String(candidate.actionType ?? "URL").trim();
  const actionType = allowedButtonActionTypes.has(rawActionType as ScenarioButtonActionType)
    ? (rawActionType as ScenarioButtonActionType)
    : "URL";

  if (!text) {
    return null;
  }

  const rawTransitionMode = String(candidate.transitionMode ?? "").trim();
  const transitionMode =
    actionType === "SCENARIO_STEP" &&
    allowedTransitionModes.has(rawTransitionMode as ScenarioTransitionMode)
      ? (rawTransitionMode as ScenarioTransitionMode)
      : actionType === "SCENARIO_STEP"
        ? "SEND_NEW"
        : null;

  const actionValue =
    actionType === "MAIN_MENU" ? null : String(candidate.actionValue ?? "").trim() || null;

  if (
    (actionType === "URL" ||
      actionType === "BOT_COMMAND" ||
      actionType === "SCENARIO_STEP" ||
      actionType === "TARIFF_PURCHASE") &&
    !actionValue
  ) {
    return null;
  }

  return {
    id: String(candidate.id ?? `button_${index}`).trim(),
    text,
    sortOrder: toSortOrder(candidate.sortOrder ?? index),
    actionType,
    actionValue,
    transitionMode,
  };
}

function parseSteps(formData: FormData): ParsedScenarioStepInput[] {
  const raw = String(formData.get("steps") ?? "[]");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((input, index): ParsedScenarioStepInput | null => {
      if (!input || typeof input !== "object") {
        return null;
      }

      const candidate = input as Record<string, unknown>;
      const name = String(candidate.name ?? "").trim();
      const messageText = String(candidate.messageText ?? "").trim();

      if (!name || !messageText) {
        return null;
      }

      const htmlError = validateTelegramHtmlSubset(messageText);
      if (htmlError) {
        throw new Error(htmlError);
      }

      const buttons = Array.isArray(candidate.buttons)
        ? candidate.buttons
            .map((button, buttonIndex) => parseButton(button, buttonIndex))
            .filter((button): button is ParsedScenarioButtonInput => button !== null)
        : [];

      return {
        id: String(candidate.id ?? `step_${index}`).trim(),
        name,
        messageText,
        imageUrl: String(candidate.imageUrl ?? "").trim() || null,
        sortOrder: toSortOrder(candidate.sortOrder ?? index),
        buttons,
      };
    })
    .filter((step): step is ParsedScenarioStepInput => step !== null);
}

function getScenarioStepImageFile(formData: FormData, stepId: string): File | null {
  const entry = formData.get(`stepImageFile:${stepId}`);
  return entry instanceof File && entry.size > 0 ? entry : null;
}

function assertActiveScenarioHasValidStartStep(
  status: ScenarioStatus,
  startStepId: string | null,
  steps: ParsedScenarioStepInput[],
) {
  if (status !== "active") {
    return;
  }

  if (!startStepId || !steps.some((step) => step.id === startStepId)) {
    throw new Error("Active scenario requires a valid start step");
  }
}

function isValidScenarioUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function assertScenarioButtonsAreValid(steps: ParsedScenarioStepInput[]): void {
  const stepIds = new Set(steps.map((step) => step.id));

  for (const step of steps) {
    for (const button of step.buttons) {
      if (button.actionType === "URL") {
        if (!button.actionValue || !isValidScenarioUrl(button.actionValue)) {
          throw new Error("Scenario URL buttons require a valid http or https URL");
        }
      }

      if (button.actionType === "SCENARIO_STEP") {
        if (!button.actionValue || !stepIds.has(button.actionValue)) {
          throw new Error(
            "Scenario step buttons must target a step in the same scenario",
          );
        }
      }

      if (
        button.actionType === "TARIFF_PURCHASE" &&
        !normalizeTariffPurchaseSlug(button.actionValue)
      ) {
        throw new Error("Scenario tariff buttons must target a known tariff slug");
      }
    }
  }
}

function normalizeScenarioButtonActionValue(
  button: { actionType: string; actionValue: string | null },
  stepIdMap?: Map<string, string>,
) {
  if (button.actionType === "SCENARIO_STEP" && button.actionValue) {
    return stepIdMap?.get(button.actionValue) ?? null;
  }

  if (button.actionType === "TARIFF_PURCHASE") {
    return normalizeTariffPurchaseSlug(button.actionValue) ?? null;
  }

  return button.actionValue;
}

function mapScenarioStep(step: ScenarioStepRecord): ScenarioStepRecord {
  return {
    ...step,
    buttons: [...step.buttons].sort((first, second) => first.sortOrder - second.sortOrder),
  };
}

async function createScenarioChildren(
  tx: ScenarioWriteClient,
  scenarioId: string,
  steps: ParsedScenarioStepInput[],
  formData: FormData,
) {
  const stepIdMap = new Map<string, string>();

  for (const step of steps) {
    const imageUrl = await saveAdminImage({
      entity: "scenarios",
      existingValue: step.imageUrl,
      file: getScenarioStepImageFile(formData, step.id),
      manualValue: step.imageUrl ?? "",
    });
    const created = await tx.scenarioStep.create({
      data: {
        scenarioId,
        name: step.name,
        messageText: step.messageText,
        imageUrl,
        sortOrder: step.sortOrder,
      },
    });
    stepIdMap.set(step.id, created.id);
  }

  for (const step of steps) {
    const copiedStepId = stepIdMap.get(step.id);
    if (!copiedStepId) {
      continue;
    }

    for (const button of step.buttons) {
      await tx.scenarioButton.create({
        data: {
          stepId: copiedStepId,
          text: button.text,
          sortOrder: button.sortOrder,
          actionType: button.actionType,
          actionValue: normalizeScenarioButtonActionValue(button, stepIdMap),
          transitionMode: button.transitionMode,
        },
      });
    }
  }

  return stepIdMap;
}

async function assertStepsCanBeRemoved(stepIds: string[]): Promise<void> {
  if (stepIds.length === 0) {
    return;
  }

  const referenceCount = await prisma.scenarioButton.count({
    where: { actionType: "SCENARIO_STEP", actionValue: { in: stepIds } },
  });

  if (referenceCount > 0) {
    throw new Error("Cannot delete step because other buttons reference it");
  }
}

export async function loadAdminScenariosPageData(): Promise<{
  scenarios: AdminScenarioListRecord[];
}> {
  const scenarios = await prisma.scenario.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startStepId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { steps: true } },
    },
  });

  return {
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      status: parseStatus(scenario.status),
      startStepId: scenario.startStepId,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
      stepCount: scenario._count.steps,
    })),
  };
}

export async function loadAdminScenarioEditorData(
  id?: string,
): Promise<AdminScenarioEditorRecord | null> {
  if (!id) {
    return null;
  }

  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: {
      steps: {
        include: { buttons: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!scenario) {
    return null;
  }

  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    status: parseStatus(scenario.status),
    startStepId: scenario.startStepId,
    steps: (scenario.steps as ScenarioStepRecord[]).map(mapScenarioStep),
  };
}

export async function performCreateScenario(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const status = parseStatus(formData.get("status"));
  const startStepId = String(formData.get("startStepId") ?? "").trim() || null;
  const steps = parseSteps(formData);

  if (!name) {
    return;
  }

  assertActiveScenarioHasValidStartStep(status, startStepId, steps);
  assertScenarioButtonsAreValid(steps);

  await prisma.$transaction(async (tx) => {
    const created = await tx.scenario.create({
      data: {
        name,
        description,
        status,
      },
    });
    const stepIdMap = await createScenarioChildren(tx, created.id, steps, formData);

    await tx.scenario.update({
      where: { id: created.id },
      data: {
        startStepId: startStepId ? stepIdMap.get(startStepId) ?? null : null,
      },
    });
  });
}

export async function performUpdateScenario(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const status = parseStatus(formData.get("status"));
  const startStepId = String(formData.get("startStepId") ?? "").trim() || null;
  const steps = parseSteps(formData);

  if (!id || !name) {
    return;
  }

  assertActiveScenarioHasValidStartStep(status, startStepId, steps);
  assertScenarioButtonsAreValid(steps);

  const existingSteps = await prisma.scenarioStep.findMany({
    where: { scenarioId: id },
    select: { id: true },
  });
  const nextStepIds = new Set(steps.map((step) => step.id));
  const removedStepIds = existingSteps
    .map((step) => step.id)
    .filter((stepId) => !nextStepIds.has(stepId));

  await assertStepsCanBeRemoved(removedStepIds);

  await prisma.$transaction(async (tx) => {
    await tx.scenario.update({
      where: { id },
      data: {
        name,
        description,
        status,
        startStepId: null,
      },
    });
    await tx.scenarioStep.deleteMany({
      where: { scenarioId: id },
    });
    const stepIdMap = await createScenarioChildren(tx, id, steps, formData);

    await tx.scenario.update({
      where: { id },
      data: {
        startStepId: startStepId ? stepIdMap.get(startStepId) ?? null : null,
      },
    });
  });
}

export async function performDeleteScenario(id: string): Promise<void> {
  if (!id) {
    return;
  }

  const activeTriggerCount = await prisma.triggerRule.count({
    where: { deliveryType: "SCENARIO", scenarioId: id, status: "active" },
  });

  if (activeTriggerCount > 0) {
    throw new Error("Cannot delete scenario because active triggers still use it");
  }

  await prisma.scenario.delete({
    where: { id },
  });
}

export async function performDeleteScenarioStep(id: string): Promise<void> {
  if (!id) {
    return;
  }

  await assertStepsCanBeRemoved([id]);

  await prisma.scenarioStep.delete({
    where: { id },
  });
}

export async function performDuplicateScenario(id: string): Promise<string> {
  const scenario = await prisma.scenario.findUniqueOrThrow({
    where: { id },
    include: { steps: { include: { buttons: true }, orderBy: { sortOrder: "asc" } } },
  });

  return prisma.$transaction(async (tx) => {
    const created = await tx.scenario.create({
      data: {
        name: `${scenario.name} (copy)`,
        description: scenario.description,
        status: "draft",
      },
    });

    const stepIdMap = new Map<string, string>();

    for (const step of scenario.steps) {
      const copy = await tx.scenarioStep.create({
        data: {
          scenarioId: created.id,
          name: step.name,
          messageText: step.messageText,
          imageUrl: step.imageUrl,
          sortOrder: step.sortOrder,
        },
      });
      stepIdMap.set(step.id, copy.id);
    }

    for (const step of scenario.steps) {
      const copiedStepId = stepIdMap.get(step.id)!;
      for (const button of step.buttons) {
        await tx.scenarioButton.create({
        data: {
          stepId: copiedStepId,
          text: button.text,
          sortOrder: button.sortOrder,
          actionType: button.actionType,
          actionValue: normalizeScenarioButtonActionValue(button, stepIdMap),
          transitionMode: button.transitionMode,
        },
      });
      }
    }

    await tx.scenario.update({
      where: { id: created.id },
      data: {
        startStepId: scenario.startStepId
          ? stepIdMap.get(scenario.startStepId) ?? null
          : null,
      },
    });

    return created.id;
  });
}

export async function performDuplicateScenarioStep(id: string): Promise<string> {
  const step = await prisma.scenarioStep.findUniqueOrThrow({
    where: { id },
    include: { buttons: { orderBy: { sortOrder: "asc" } } },
  });

  return prisma.$transaction(async (tx) => {
    const copy = await tx.scenarioStep.create({
      data: {
        scenarioId: step.scenarioId,
        name: `${step.name} (copy)`,
        messageText: step.messageText,
        imageUrl: step.imageUrl,
        sortOrder: step.sortOrder + 1,
      },
    });

    for (const button of step.buttons) {
      await tx.scenarioButton.create({
        data: {
          stepId: copy.id,
          text: button.text,
          sortOrder: button.sortOrder,
          actionType: button.actionType,
          actionValue: normalizeScenarioButtonActionValue(button),
          transitionMode: button.transitionMode,
        },
      });
    }

    return copy.id;
  });
}
