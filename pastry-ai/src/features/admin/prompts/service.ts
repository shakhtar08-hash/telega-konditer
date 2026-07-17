import { prisma } from "@/db/prisma";
import type { PromptProvider } from "@/db/repositories/prompt-repository";

export type PromptMutationInput = {
  active: boolean;
  model: string;
  provider: PromptProvider;
  systemPrompt: string;
  temperature: number;
  title: string;
  userTemplate: string;
};

export async function loadAdminPromptsPageData() {
  return {
    prompts: await prisma.prompt.findMany({
      orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
      select: {
        active: true,
        createdAt: true,
        feature: true,
        id: true,
        model: true,
        provider: true,
        slug: true,
        systemPrompt: true,
        temperature: true,
        title: true,
        updatedAt: true,
        userTemplate: true,
        version: true,
      },
    }),
  };
}

export async function performUpdatePrompt(
  id: string,
  input: PromptMutationInput,
): Promise<void> {
  if (
    !id ||
    !input.model ||
    !input.systemPrompt ||
    !input.userTemplate ||
    Number.isNaN(input.temperature)
  ) {
    return;
  }

  await prisma.prompt.update({
    where: { id },
    data: {
      active: input.active,
      model: input.model,
      provider: input.provider,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      title: input.title,
      userTemplate: input.userTemplate,
    },
  });
}
