import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { botMenuButtons, seedBotMenuButtons } from "./seed-bot-menu-buttons.mjs";
import { botTextBlocks, seedBotTextBlocks } from "./seed-bot-text-blocks.mjs";
import { seedEditableCollection } from "./seed-editable-collection.mjs";
import { photoStyles, seedPhotoStyles } from "./seed-photo-styles.mjs";
import { seedTariffPlans, tariffPlans } from "./seed-tariffs.mjs";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const promptSourceDefinitions = [
  {
    marker: "1. Поиск лучшего рецепта",
    slug: "best-recipe-search",
    title: "Поиск лучшего рецепта",
  },
  {
    marker: "2. Пересчёт рецепта",
    slug: "recipe-recalculation",
    title: "Пересчёт рецепта",
  },
  {
    marker: "3. Калькулятор маржи",
    slug: "margin-calculator",
    title: "Калькулятор маржи",
  },
];

const promptSourcePrompts = readPromptSourcePrompts();

function readPromptSourcePrompts() {
  const source = readFileSync(
    new URL("./prompt-sources/prompts.txt", import.meta.url),
    "utf8",
  );

  return promptSourceDefinitions.map((definition, index) => {
    const start = source.indexOf(definition.marker);
    const nextDefinition = promptSourceDefinitions[index + 1];
    const end = nextDefinition
      ? source.indexOf(nextDefinition.marker, start + 1)
      : source.length;

    if (start === -1 || end === -1) {
      throw new Error(`Could not find prompt source section: ${definition.slug}`);
    }

    const section = source.slice(start, end).replace(/\r\n/g, "\n");
    const bodyStart = section.search(/\n\n/);

    if (bodyStart === -1) {
      throw new Error(`Prompt source section has no body: ${definition.slug}`);
    }

    const systemPrompt = section
      .slice(bodyStart + 2)
      .trim()
      .replace(/```$/u, "")
      .trim();

    return {
      slug: definition.slug,
      feature: "recipes",
      title: definition.title,
      provider: "openrouter",
      systemPrompt,
      userTemplate:
        "Сообщение пользователя: {{ingredients}}\n\nСформируй ответ по правилам системного промта.",
      model: "google/gemini-2.5-pro",
      temperature: 0.3,
      active: true,
      version: 1,
    };
  });
}

const recipePrompt = `Ты профессиональный кондитер-технолог.
Отвечай по-русски и предлагай только реальные рецепты из ингредиентов пользователя.

Формат ответа:
1. Название.
2. Почему подходит.
3. Ингредиенты.
4. Пошаговая технология.
5. Время.
6. Сложность.
7. Совет кондитера.

Если продуктов мало, предложи меньше вариантов, но не выдумывай лишнего.

Кроме текстового ответа, верни до 4 десертов в формате dishes с полями name (название) и description (подробное описание внешнего вида для генерации фото).`;

const prompts = [
  {
    slug: "recipe-from-ingredients",
    feature: "recipes",
    title: "Рецепт по ингредиентам",
    provider: "openrouter",
    systemPrompt: recipePrompt,
    userTemplate:
      "Сообщение пользователя: {{ingredients}}\n\nСформируй ответ по правилам системного промта.",
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    active: true,
    version: 1,
  },
  {
    slug: "dessert-identification",
    feature: "vision",
    title: "Разобрать десерт по фото",
    provider: "openrouter",
    systemPrompt:
      "Ты профессиональный кондитер-технолог. Проанализируй фото десерта, определи вероятный состав, техники, начинку, сложность и предложи идею похожего рецепта. Отвечай аккуратно и не утверждай то, что нельзя надёжно определить по изображению.",
    userTemplate:
      "Проанализируй фото десерта и верни структурированный профессиональный разбор. Фото передано отдельным image input: {{imageUrl}}.",
    model: "google/gemini-2.5-pro",
    temperature: 0.2,
    active: true,
    version: 1,
  },
  {
    slug: "product-photo",
    feature: "photoshoot",
    title: "Создать фото",
    provider: "kie",
    systemPrompt:
      "Ты арт-директор предметной съёмки десертов. Превращай исходное фото десерта в реалистичное коммерческое изображение в заданном стиле.",
    userTemplate:
      "Используй исходное фото десерта как обязательный референс: {{imageUrl}}.\n\nСохрани форму, пропорции, основной цвет и ключевые детали десерта. Не добавляй надписи, логотипы, людей и посторонние предметы.\n\nСоздай реалистичную коммерческую фотографию десерта в стиле: {{style}}",
    model: "gpt-image-2",
    temperature: 0.4,
    active: true,
    version: 1,
  },
  {
    slug: "instagram-carousel",
    feature: "carousel",
    title: "Карусель для Instagram",
    provider: "openrouter",
    systemPrompt:
      "Ты контент-стратег для Instagram кондитера. Делай карусели понятными, цепляющими и полезными для русскоязычной аудитории.",
    userTemplate:
      "Создай Instagram-карусель на тему: {{topic}}. Верни обложку, тексты слайдов и подпись к посту.",
    model: "google/gemini-2.5-pro",
    temperature: 0.5,
    active: true,
    version: 1,
  },
  ...promptSourcePrompts,
];

const funnelSteps = [
  {
    slug: "welcome",
    title: "Приветствие",
    imagePath: "/onboarding/welcome.png",
    sortOrder: 0,
    text:
      "Привет! Я помогу с рецептами, анализом десертов по фото и контентом для кондитера.\n\nПосле оплаты у вас откроется меню со всеми сценариями.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: null,
    active: true,
  },
  {
    slug: "maria",
    title: "Мария",
    imagePath: "/onboarding/maria.png",
    sortOrder: 1,
    text:
      "Мария ведёт домашнюю кондитерскую и быстро находит идеи десертов из того, что уже есть под рукой.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: null,
    active: true,
  },
  {
    slug: "polina",
    title: "Полина",
    imagePath: "/onboarding/polina.png",
    sortOrder: 2,
    text:
      "Полина делает контент для блога и использует бота для каруселей, фото и разборов десертов.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: null,
    active: true,
  },
  {
    slug: "ksusha",
    title: "Ксюша",
    imagePath: "/onboarding/ksusha.png",
    sortOrder: 3,
    text:
      "Ксюша учится современным десертам и получает понятные объяснения по слоям, начинкам, покрытиям и декору.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: null,
    active: true,
  },
  {
    slug: "offer",
    title: "Оффер",
    imagePath: "/onboarding/offer.png",
    sortOrder: 4,
    text:
      "Специальное предложение: доступ к AI-помощнику кондитера с рецептами, фото и контентом.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: "1 месяц и 70+ сценариев | 899 ₽",
    active: true,
  },
];

await seedEditableCollection(prisma.prompt, prompts);

console.log(`Seeded ${prompts.length} prompts.`);

await seedPhotoStyles(prisma, photoStyles);

console.log(`Seeded ${photoStyles.length} photo styles.`);

await seedBotMenuButtons(prisma, botMenuButtons);

console.log(`Seeded ${botMenuButtons.length} bot menu buttons.`);

await seedBotTextBlocks(prisma, botTextBlocks);

console.log(`Seeded ${botTextBlocks.length} bot text blocks.`);

await seedEditableCollection(prisma.funnelStep, funnelSteps);

console.log(`Seeded ${funnelSteps.length} funnel steps.`);

await seedEditableCollection(prisma.triggerMessage, [
  {
    slug: "after-start",
    title: "После /start",
    text: "Привет! Попробуйте один из сценариев в меню: рецепт, анализ десерта по фото или создание фото.",
    delayMinutes: 15,
    targetPlans: ["FREE"],
    active: true,
  },
  {
    slug: "after-payment",
    title: "После оплаты",
    text: "Спасибо за покупку! У вас открыт полный доступ ко всем сценариям бота. Начните с кнопки «Создать фото» или «Анализ десерта».",
    delayMinutes: 30,
    targetPlans: ["PRO", "TEAM"],
    active: true,
  },
]);

console.log("Seeded trigger messages.");

await seedTariffPlans(prisma);
console.log(`Seeded ${tariffPlans.length} tariff plans.`);

await prisma.$disconnect();
