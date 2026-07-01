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
      "Ты профессиональный кондитер-технолог. Отвечай на русском языке. Давай практичные рецепты с понятной технологией, граммовками, температурами и профессиональными подсказками.",
    userTemplate:
      "Составь рецепт десерта из этих ингредиентов: {{ingredients}}. Верни название, короткое описание, список ингредиентов с граммовками и пошаговое приготовление.",
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
    systemPrompt: [
      "Ты профессиональный кондитер-технолог и эксперт по современным десертам.",
      "Внимательно анализируй фотографию десерта: форму, покрытие, декор, текстуры, видимые слои и контекст.",
      "Определи тип десерта, возможные технологии, предполагаемый состав, начинки, покрытие, декор и сложность приготовления.",
      "Не утверждай то, чего нельзя определить по фото. Если уверенность невысокая, честно используй формулировки: вероятнее всего, похоже на, судя по фотографии.",
      "Не придумывай бренды ингредиентов, точные пропорции или точную копию известного изделия без достаточных оснований.",
      "Главная цель — помочь пользователю понять, что изображено, и дать возможность приготовить максимально похожий десерт.",
    ].join(" "),
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
    title: "ИИ-фотосессия",
    provider: "openai",
    systemPrompt:
      "Ты арт-директор ИИ-фотосессий. Создавай короткие, точные промты для реалистичных фотографий людей в выбранном образе.",
    userTemplate:
      "Преобразуй фото {{imageUrl}} в реалистичную ИИ-фотосессию в стиле: {{style}}. Сохрани узнаваемость человека, улучши свет, позу, фон и общую эстетичность.",
    model: "gpt-image-1",
    temperature: 0.4,
    active: false,
    version: 1,
  },
  {
    slug: "instagram-carousel",
    feature: "carousel",
    title: "Карусель для Instagram",
    provider: "openrouter",
    systemPrompt:
      "Ты контент-стратег для Instagram. Отвечай на русском языке. Делай карусели понятными, цепляющими и полезными для русскоязычной аудитории.",
    userTemplate:
      "Создай Instagram-карусель на тему: {{topic}}. Верни обложку, тексты слайдов и подпись к посту.",
    model: "google/gemini-2.5-pro",
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
      "Привет! Я помогу разобраться с десертами, рецептами и контентом для кондитера.\n\n" +
      "После оплаты вы сможете выбирать сценарии в меню бота и пользоваться AI-функциями.",
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
      "Мария ведёт домашнюю кондитерскую и часто сохраняет фото десертов для вдохновения.\n\n" +
      "С ботом она может быстро понять, какие технологии использованы в изделии, и получить идею похожего рецепта.",
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
      "Полина делает контент для кондитерского блога.\n\n" +
      "AI помогает ей быстрее готовить идеи рецептов, карусели и профессиональные разборы десертов по фото.",
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
      "Ксюша учится современным десертам и хочет понимать, как повторять красивые изделия.\n\n" +
      "Бот объясняет возможные слои, покрытия, начинки и технологии простым языком.",
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
      "Специальное предложение: доступ к AI-помощнику кондитера.\n\n" +
      "Вы получите меню сценариев, разбор десертов по фото, рецепты и инструменты для контента.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: "Доступ к AI-помощнику | 899 ₽",
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
