import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const prompts = [
  {
    slug: "recipe-from-ingredients",
    feature: "recipes",
    title: "Рецепт по ингредиентам",
    provider: "openrouter",
    systemPrompt:
      "Ты профессиональный кондитер-технолог. Отвечай на русском языке. Давай практичные рецепты с точными пропорциями, понятными шагами, температурой, временем и профессиональными подсказками.",
    userTemplate:
      "Составь рецепт десерта из этих ингредиентов: {{ingredients}}. Верни название, короткое описание, список ингредиентов с граммовками и пошаговое приготовление.",
    model: "gpt-4o-mini",
    temperature: 0.3,
    active: true,
    version: 1,
  },
  {
    slug: "dessert-identification",
    feature: "vision",
    title: "Определить десерт по фото",
    provider: "fal",
    systemPrompt:
      "Ты ассистент по визуальному распознаванию десертов. Отвечай на русском языке. Определи десерт по изображению, объясни уверенность и не делай категоричных выводов, если данных мало.",
    userTemplate:
      "Определи десерт на этом изображении: {{imageUrl}}. Верни название, описание, уверенность от 0 до 1 и идею похожего рецепта.",
    model: "nano-banana-2",
    temperature: 0.2,
    active: true,
    version: 1,
  },
  {
    slug: "product-photo",
    feature: "photoshoot",
    title: "ИИ-фотосессия",
    provider: "fal",
    systemPrompt:
      "Ты арт-директор ИИ-фотосессий. Отвечай на русском языке. Создавай короткие, точные промпты для реалистичных фотографий людей в выбранном образе.",
    userTemplate:
      "Преобразуй фото {{imageUrl}} в реалистичную ИИ-фотосессию в стиле: {{style}}. Сохрани узнаваемость человека, улучши свет, позу, фон и общую эстетичность.",
    model: "nano-banana-2",
    temperature: 0.4,
    active: true,
    version: 1,
  },
  {
    slug: "instagram-carousel",
    feature: "carousel",
    title: "Карусель для Instagram",
    provider: "fal",
    systemPrompt:
      "Ты контент-стратег для Instagram. Отвечай на русском языке. Делай карусели понятными, цепляющими и полезными для русскоязычной аудитории.",
    userTemplate:
      "Создай Instagram-карусель на тему: {{topic}}. Верни обложку, тексты слайдов и подпись к посту.",
    model: "nano-banana-2",
    temperature: 0.5,
    active: true,
    version: 1,
  },
];

const funnelSteps = [
  {
    slug: "welcome",
    title: "Приветствие",
    imagePath: "/onboarding/welcome.png",
    sortOrder: 0,
    text:
      "👋 Приветствую! Я создам для вас ИИ-фотосессию в любом образе!\n\n" +
      "🤩 Сгенерированные фотографии не отличить от реальных\n\n" +
      "⭐ Как с профессиональной фотосессии\n\n" +
      "🦄 Креативные образы для Instagram\n\n" +
      "👉 Нажимайте кнопку «Далее», чтобы узнать больше",
    nextButtonText: "😉 Далее",
    buyButtonText: "💳 Купить",
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
      "1) Мария, 33 года, есть семья и дети.\n\n" +
      "Было немного красивых фото, потому что всё время занимают семья и работа. Мария хотела увидеть себя красивой в новых стилях и оригинальных местах.\n\n" +
      "Сгенерировала себе реалистичные фотосессии. Получила 200 новых студийных образов и осталась очень довольна.",
    nextButtonText: "😉 Далее",
    buyButtonText: "💳 Купить",
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
      "2) Полина, 22 года, небольшой блогер, любит фотосессии.\n\n" +
      "Ей хотелось обновить фото в соцсетях, но студийные съёмки дорогие. Хотелось больше естественных, стильных образов и оригинальных фото с моря.\n\n" +
      "Полина обновила ленту, получила много лайков и 150 новых образов.",
    nextButtonText: "😉 Далее",
    buyButtonText: "💳 Купить",
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
      "3) Ксюша, 27 лет, юрист.\n\n" +
      "Хотела порадовать себя и посмотреть, как она выглядит в других образах, с другим характером и стилем одежды.\n\n" +
      "Теперь у неё есть мотивирующие фото и новые идеи для образов.",
    nextButtonText: "😉 Далее",
    buyButtonText: "💳 Купить",
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
      "🔥 Супер-предложение: скидка 50%! Всего 899₽ вместо 1800₽ в месяц!\n\n" +
      "При покупке вы получаете:\n" +
      "✔️ 60 ваших фотографий в любом образе\n" +
      "✔️ 1 модель, созданную на основе ваших снимков\n" +
      "✔️ Готовые образы\n" +
      "✔️ Любой образ по вашему описанию\n" +
      "✔️ Быструю службу поддержки\n\n" +
      "🎁 Оплатите в течение 30 минут и получите 10 бонусных генераций!",
    nextButtonText: "😉 Далее",
    buyButtonText: "💳 Купить",
    buyButtonUrl: null,
    offerButtonText: "1 модель и 70 фото | 899₽",
    active: true,
  },
];

for (const prompt of prompts) {
  await prisma.prompt.upsert({
    where: {
      slug_version: {
        slug: prompt.slug,
        version: prompt.version,
      },
    },
    update: prompt,
    create: prompt,
  });
}

console.log(`Seeded ${prompts.length} prompts.`);

for (const step of funnelSteps) {
  await prisma.funnelStep.upsert({
    where: { slug: step.slug },
    update: step,
    create: step,
  });
}

console.log(`Seeded ${funnelSteps.length} funnel steps.`);

await prisma.$disconnect();
