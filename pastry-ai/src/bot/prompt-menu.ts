import type { InlineKeyboardMarkup } from "grammy/types";

export type PromptMenuItem = {
  feature: string;
  slug: string;
  title: string;
};

const promptTitles: Record<string, string> = {
  carousel: "Карусель для Instagram",
  "dessert-identification": "Определить десерт по фото",
  photoshoot: "ИИ-фотосессия",
  "product-photo": "ИИ-фотосессия",
  recipes: "Рецепт по ингредиентам",
  "recipe-from-ingredients": "Рецепт по ингредиентам",
  vision: "Определить десерт по фото",
};

export function mapPromptsToMenuItems(
  prompts: Array<{ feature: string; slug: string; title?: string | null }>,
): PromptMenuItem[] {
  return prompts.map((prompt) => ({
    feature: prompt.feature,
    slug: prompt.slug,
    title:
      prompt.title?.trim() ||
      promptTitles[prompt.slug] ||
      promptTitles[prompt.feature] ||
      prompt.slug,
  }));
}

export function buildPromptMenuKeyboard(
  items: PromptMenuItem[],
): InlineKeyboardMarkup {
  return {
    inline_keyboard: items.map((item) => [
      {
        callback_data: `prompt:${item.feature}:${item.slug}`,
        text: item.title,
      },
    ]),
  };
}

export function buildPromptMenuMessage(name?: string | null) {
  const greeting = name ? `${name}, ` : "";

  return `${greeting}выберите, что хотите сделать:`;
}

export function getPromptSelectionText(item: PromptMenuItem) {
  return `Вы выбрали: ${item.title}\n\nТеперь отправьте данные для этого сценария.`;
}

export async function loadPromptMenuItems(): Promise<PromptMenuItem[]> {
  const { prisma } = await import("@/db/prisma");
  const prompts = await prisma.prompt.findMany({
    distinct: ["feature", "slug"],
    orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
    select: {
      feature: true,
      slug: true,
    },
    where: {
      active: true,
    },
  });

  return mapPromptsToMenuItems(prompts);
}

export async function findPromptMenuItem(
  feature: string,
  slug: string,
): Promise<PromptMenuItem | null> {
  const items = await loadPromptMenuItems();

  return items.find((item) => item.feature === feature && item.slug === slug) ?? null;
}
