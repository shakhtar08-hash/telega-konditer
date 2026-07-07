import type { InlineKeyboardMarkup } from "grammy/types";
import {
  buildBotMenuKeyboard,
  mapBotMenuButtonsToItems,
} from "./menu-buttons";

export type PromptMenuItem = {
  actionType?: "PROMPT" | "URL";
  description?: string | null;
  feature: string;
  id?: string;
  slug: string;
  title: string;
  url?: string | null;
};

const promptTitles: Record<string, string> = {
  "ask-chef": "Спросить кондитера",
  carousel: "Карусель для Instagram",
  "dessert-identification": "Разобрать десерт по фото",
  "free-lesson": "Поиск бесплатного урока",
  "free-lesson-search": "Поиск бесплатного урока",
  "margin-calculator": "Калькулятор маржи",
  photoshoot: "Стилизация фото десерта",
  "photoshoot-pick-style": "Фото по стилю",
  "product-photo": "Стилизация фото десерта",
  "recipe-card": "Создать карточку рецепта",
  "recipe-margin": "Калькулятор маржи",
  "recipe-recalculation": "Пересчёт рецепта",
  recipes: "Рецепт по ингредиентам",
  "recipe-from-ingredients": "Рецепт по ингредиентам",
  vision: "Разобрать десерт по фото",
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
  const menuItems = items
    .filter((item) => item.id)
    .map((item) =>
      item.actionType === "URL" && item.url
        ? { text: item.title, url: item.url }
        : { callbackData: `menu:${item.id}`, text: item.title },
    );

  if (menuItems.length > 0) {
    return buildBotMenuKeyboard(menuItems);
  }

  return {
    inline_keyboard: items.map((item) => [
      {
        callback_data: `prompt:${item.feature}:${item.slug}`,
        text: item.title,
      },
    ]),
  };
}

const menuIntroFallback = `👋 Добро пожаловать в ИИ Кондитер!

Это ваш помощник для создания рецептов, анализа десертов и генерации красивых фотографий.

🍰 Рецепт из ваших ингредиентов
📷 Рецепт по фото десерта
✨ Фото и фотосеты для соцсетей
📚 Полезные материалы для кондитеров

И это лишь часть возможностей. Внутри вас ждет еще множество полезных функций для работы, творчества и развития вашего кондитерского дела.

👇 Выберите нужный раздел в меню ниже и протестируйте все возможности вашего помощника.`;

export async function buildPromptMenuMessage() {
  try {
    const { prisma } = await import("@/db/prisma");
    const block = await prisma.botTextBlock.findUnique({
      where: { key: "prompt_menu_intro" },
      select: { text: true },
    });
    if (block?.text) return block.text;
  } catch {}
  return menuIntroFallback;
}

export function getPromptSelectionText(item: PromptMenuItem) {
  const description = item.description?.trim();

  if (description) {
    return description;
  }

  if (item.feature === "vision") {
    return `Вы выбрали: ${item.title}\n\nОтправьте фото десерта, а я определю, что изображено, разберу состав, технологии и предложу похожий рецепт.`;
  }

  if (item.feature === "free-lesson") {
    return `Вы выбрали: ${item.title}\n\nНапишите тему для поиска бесплатных видеоуроков. Например: «муссовые торты», «работа с шоколадом», «капкейки».`;
  }

  if (item.feature === "ask-chef") {
    return `Вы выбрали: ${item.title}\n\nЗадайте любой вопрос по кондитерскому делу. Я помогу с рецептами, технологиями, ингредиентами, поиском ошибок и организацией работы.`;
  }

  if (item.feature === "recipe-card") {
    return `Вы выбрали: ${item.title}\n\nНапишите рецепт с названием, ингредиентами и пошаговым приготовлением, и я создам дизайнерскую карточку рецепта.`;
  }

  if (item.feature === "photoshoot") {
    return `Вы выбрали: ${item.title}\n\nОтправьте фото десерта, а я подготовлю 7 вариантов в разных визуальных стилях из раздела «Стили фото».`;
  }

  return `Вы выбрали: ${item.title}\n\nТеперь отправьте данные для этого сценария.`;
}

export function resolveBotMenuUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  return url.replaceAll("{{baseUrl}}", baseUrl);
}

export async function loadPromptMenuItems(): Promise<PromptMenuItem[]> {
  const { prisma } = await import("@/db/prisma");
  const buttons = await prisma.botMenuButton.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      actionType: true,
      active: true,
      description: true,
      emoji: true,
      id: true,
      label: true,
      promptFeature: true,
      promptSlug: true,
      sortOrder: true,
      url: true,
    },
    where: {
      active: true,
    },
  });
  const buttonItems = mapBotMenuButtonsToItems(buttons);

  if (buttonItems.length > 0) {
    return buttons
      .filter((button) => button.active)
      .map((button) => ({
        actionType: button.actionType,
        description: button.description,
        feature: button.promptFeature ?? "url",
        id: button.id,
        slug: button.promptSlug ?? button.id,
        title: [button.emoji, button.label].filter(Boolean).join(" "),
        url: resolveBotMenuUrl(button.url),
      }));
  }

  const prompts = await prisma.prompt.findMany({
    distinct: ["feature", "slug"],
    orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
    select: {
      feature: true,
      slug: true,
      title: true,
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

export async function findBotMenuItem(
  buttonId: string,
): Promise<PromptMenuItem | null> {
  const { prisma } = await import("@/db/prisma");

  const button = await prisma.botMenuButton.findFirst({
    select: {
      actionType: true,
      active: true,
      description: true,
      emoji: true,
      id: true,
      label: true,
      promptFeature: true,
      promptSlug: true,
      url: true,
    },
    where: {
      active: true,
      id: buttonId,
    },
  });

  if (!button || button.actionType !== "PROMPT") {
    return null;
  }

  return {
    actionType: button.actionType,
    description: button.description,
    feature: button.promptFeature ?? "",
    id: button.id,
    slug: button.promptSlug ?? "",
    title: [button.emoji, button.label].filter(Boolean).join(" "),
    url: resolveBotMenuUrl(button.url),
  };
}
