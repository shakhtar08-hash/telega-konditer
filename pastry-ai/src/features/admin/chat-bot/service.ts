import { prisma } from "@/db/prisma";

export type BotMenuActionType = "PROMPT" | "URL" | "SCENARIO";

export type BotMenuButtonMutationInput = {
  actionType: BotMenuActionType;
  active: boolean;
  description: string;
  emoji: string;
  fullWidth: boolean;
  instructionText: string | null;
  label: string;
  previewImageUrl: string | null;
  processingText: string | null;
  promptFeature: string | null;
  promptSlug: string | null;
  scenarioId: string | null;
  sortOrder: number;
  url: string | null;
};

export async function loadAdminChatBotPageData() {
  const [buttons, prompts, scenarios, menuIntro] = await Promise.all([
    prisma.botMenuButton.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        actionType: true,
        active: true,
        description: true,
        emoji: true,
        fullWidth: true,
        id: true,
        instructionText: true,
        label: true,
        previewImageUrl: true,
        processingText: true,
        promptFeature: true,
        promptSlug: true,
        scenarioId: true,
        scenario: {
          select: { name: true },
        },
        sortOrder: true,
        url: true,
      },
    }),
    prisma.prompt.findMany({
      orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
      select: {
        feature: true,
        slug: true,
        title: true,
      },
      where: {
        active: true,
      },
    }),
    prisma.scenario.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
      where: { startStepId: { not: null }, status: "active" },
    }),
    prisma.botTextBlock.findUnique({
      where: { key: "prompt_menu_intro" },
      select: { text: true },
    }),
  ]);

  return {
    buttons: buttons.map((button) => ({
      ...button,
      scenarioName: button.scenario?.name ?? null,
    })),
    menuIntro,
    prompts,
    scenarios,
  };
}

export async function performCreateBotMenuButton(
  input: BotMenuButtonMutationInput,
): Promise<void> {
  if (!input.label || Number.isNaN(input.sortOrder)) {
    return;
  }

  await prisma.botMenuButton.create({
    data: {
      actionType: input.actionType,
      active: true,
      description: input.description,
      emoji: input.emoji,
      fullWidth: input.fullWidth,
      instructionText: input.instructionText,
      label: input.label,
      previewImageUrl: input.previewImageUrl,
      processingText: input.processingText,
      promptFeature: input.actionType === "PROMPT" ? input.promptFeature : null,
      promptSlug: input.actionType === "PROMPT" ? input.promptSlug : null,
      scenarioId: input.actionType === "SCENARIO" ? input.scenarioId : null,
      sortOrder: input.sortOrder,
      url: input.actionType === "URL" ? input.url : null,
    },
  });
}

export async function performUpdateBotMenuButton(
  input: BotMenuButtonMutationInput & { id: string },
): Promise<void> {
  if (!input.id || !input.label || Number.isNaN(input.sortOrder)) {
    return;
  }

  let promptFeature = input.promptFeature;
  let promptSlug = input.promptSlug;
  let scenarioId = input.scenarioId;

  if (!promptFeature && input.actionType === "PROMPT") {
    const existing = await prisma.botMenuButton.findUnique({
      where: { id: input.id },
      select: { promptFeature: true, promptSlug: true },
    });
    promptFeature = existing?.promptFeature ?? null;
    promptSlug = existing?.promptSlug ?? null;
  }

  if (!scenarioId && input.actionType === "SCENARIO") {
    const existing = await prisma.botMenuButton.findUnique({
      where: { id: input.id },
      select: { scenarioId: true },
    });
    scenarioId = existing?.scenarioId ?? null;
  }

  await prisma.botMenuButton.update({
    data: {
      actionType: input.actionType,
      active: input.active,
      description: input.description,
      emoji: input.emoji,
      fullWidth: input.fullWidth,
      instructionText: input.instructionText,
      label: input.label,
      previewImageUrl: input.previewImageUrl,
      processingText: input.processingText,
      promptFeature: input.actionType === "PROMPT" ? promptFeature : null,
      promptSlug: input.actionType === "PROMPT" ? promptSlug : null,
      scenarioId: input.actionType === "SCENARIO" ? scenarioId : null,
      sortOrder: input.sortOrder,
      url: input.actionType === "URL" ? input.url : null,
    },
    where: { id: input.id },
  });
}

export async function performDeleteBotMenuButton(id: string): Promise<void> {
  if (!id) {
    return;
  }

  await prisma.botMenuButton.delete({ where: { id } });
}

export async function performUpdateMenuIntro(text: string): Promise<void> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return;
  }

  await prisma.botTextBlock.upsert({
    where: { key: "prompt_menu_intro" },
    update: { text: trimmedText },
    create: { key: "prompt_menu_intro", text: trimmedText },
  });
}
