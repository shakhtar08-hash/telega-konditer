import { seedEditableCollection } from "./seed-editable-collection.mjs";

export const botMenuButtons = [
  {
    actionType: "PROMPT",
    description: "Создать рецепт из доступных ингредиентов.",
    emoji: "🍰",
    label: "Создать рецепт",
    promptFeature: "recipes",
    promptSlug: "recipe-from-ingredients",
    sortOrder: 1,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Сгенерировать фото десерта в нескольких стилях.",
    emoji: "📸",
    label: "Создать фото",
    promptFeature: "photoshoot",
    promptSlug: "product-photo",
    sortOrder: 2,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Проанализировать десерт по фото с описанием состава и технологий.",
    emoji: "🔎",
    label: "Анализ десерта",
    promptFeature: "vision",
    promptSlug: "dessert-identification",
    sortOrder: 3,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Создать карусель текстов для Instagram.",
    emoji: "📚",
    label: "Карусель",
    promptFeature: "carousel",
    promptSlug: "instagram-carousel",
    sortOrder: 4,
    url: null,
  },
  {
    actionType: "URL",
    description: "Перейти в личный кабинет для управления подпиской.",
    emoji: "👤",
    label: "Мой профиль",
    promptFeature: null,
    promptSlug: null,
    sortOrder: 5,
    url: "{{baseUrl}}/profile",
  },
  {
    actionType: "URL",
    description: "Скидки, акции и специальные предложения.",
    emoji: "🎁",
    label: "Бонусы и акции",
    promptFeature: null,
    promptSlug: null,
    sortOrder: 6,
    url: "{{baseUrl}}/pay",
  },
];

export async function seedBotMenuButtons(prisma, buttons = botMenuButtons) {
  await seedEditableCollection(prisma.botMenuButton, buttons);
}
