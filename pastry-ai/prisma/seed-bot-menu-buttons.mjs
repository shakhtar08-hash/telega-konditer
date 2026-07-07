import { seedEditableCollection } from "./seed-editable-collection.mjs";

export const botMenuButtons = [
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Создать рецепт\n\nНапишите список ингредиентов, которые у вас есть, и я предложу варианты десертов, которые можно из них приготовить.",
    emoji: "🍰",
    label: "Создать рецепт",
    promptFeature: "recipes",
    promptSlug: "recipe-from-ingredients",
    sortOrder: 1,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Создать фото\n\nОтправьте фото десерта, а я подготовлю 7 вариантов в разных визуальных стилях.",
    emoji: "📸",
    label: "Создать фото",
    promptFeature: "photoshoot",
    promptSlug: "product-photo",
    sortOrder: 2,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Фото по стилю\n\nВыберите визуальный стиль для обработки фото.",
    emoji: "🎨",
    label: "Фото по стилю",
    promptFeature: "photoshoot-pick-style",
    promptSlug: "pick-style",
    sortOrder: 3,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Анализ десерта\n\nОтправьте фото десерта, и я определю, что изображено, разберу состав и технологии.",
    emoji: "🔎",
    label: "Анализ десерта",
    promptFeature: "vision",
    promptSlug: "dessert-identification",
    sortOrder: 4,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Поиск урока\n\nНапишите тему, по которой хотите найти бесплатные видеоуроки. Например: муссовые торты, работа с шоколадом, капкейки.",
    emoji: "🎥",
    label: "Поиск урока",
    promptFeature: "free-lesson",
    promptSlug: "free-lesson-search",
    sortOrder: 5,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Спросить кондитера\n\nЗадайте любой вопрос по кондитерскому делу — рецепты, технологии, ингредиенты, ошибки, оборудование.",
    emoji: "👨‍🍳",
    label: "Спросить кондитера",
    promptFeature: "ask-chef",
    promptSlug: "ask-chef",
    sortOrder: 6,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Создать карточку рецепта\n\nНапишите рецепт, и я превращу его в дизайнерскую карточку: название, ингредиенты, пошаговое приготовление.",
    emoji: "✨",
    label: "Создать карточку рецепта",
    promptFeature: "recipe-card",
    promptSlug: "recipe-card",
    sortOrder: 7,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Карусель\n\nНапишите тему, и я создадим текст для Instagram-карусели: обложка, слайды и подпись к посту.",
    emoji: "📚",
    label: "Карусель",
    promptFeature: "carousel",
    promptSlug: "instagram-carousel",
    sortOrder: 8,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Калькулятор маржи\n\nВведите данные о себестоимости и цене продажи, и я рассчитаю маржинальность.",
    emoji: "💰",
    label: "Калькулятор маржи",
    promptFeature: "recipe-margin",
    promptSlug: "margin-calculator",
    sortOrder: 9,
    url: null,
  },
  {
    actionType: "PROMPT",
    description:
      "Вы выбрали: Пересчёт рецепта\n\nПришлите рецепт и укажите новые параметры (форма, порции, коэффициент), и я пересчитаю ингредиенты.",
    emoji: "🔄",
    label: "Пересчёт рецепта",
    promptFeature: "recipe-recalculation",
    promptSlug: "recipe-recalculation",
    sortOrder: 10,
    url: null,
  },
  {
    actionType: "URL",
    description: "Перейти в личный кабинет для управления подпиской.",
    emoji: "👤",
    label: "Мой профиль",
    promptFeature: null,
    promptSlug: null,
    sortOrder: 11,
    url: "{{baseUrl}}/profile",
  },
  {
    actionType: "URL",
    description: "Скидки, акции и специальные предложения.",
    emoji: "🎁",
    label: "Бонусы и акции",
    promptFeature: null,
    promptSlug: null,
    sortOrder: 12,
    url: "{{baseUrl}}/pay",
  },
];

export async function seedBotMenuButtons(prisma, buttons = botMenuButtons) {
  await seedEditableCollection(prisma.botMenuButton, buttons);
}