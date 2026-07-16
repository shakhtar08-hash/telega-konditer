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
    marker: "1. Промт \u201cПоиск лучшего рецепта\u201d",
    slug: "best-recipe-search",
    title: "Поиск лучшего рецепта",
  },
  {
    marker: '2. Промт "Пересчет рецепта"',
    slug: "recipe-recalculation",
    title: "Пересчёт рецепта",
  },
  {
    marker: "3. \u201cКалькулятор маржи\u201d",
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
      feature: definition.slug === "best-recipe-search" ? "recipes" : definition.slug === "recipe-recalculation" ? "recipe-recalculation" : "recipe-margin",
      title: definition.title,
      provider: "openrouter",
      systemPrompt,
      userTemplate: definition.slug === "best-recipe-search"
        ? "Сообщение пользователя: {{ingredients}}\n\nСформируй ответ по правилам системного промта."
        : "Сообщение пользователя: {{text}}\n\nСформируй ответ по правилам системного промта.",
      model: "google/gemini-2.5-pro",
      temperature: 0.3,
      active: true,
      version: 1,
    };
  });
}

const recipePrompt = `Ты — профессиональный кондитер-технолог. Предлагай реальные, технологически выполнимые рецепты из имеющихся у пользователя ингредиентов.

Твоя задача — помогать кондитерам создавать торты, пирожные, десерты, рулеты, тарты, чизкейки, капкейки, эклеры, печенье, муссовые изделия, конфеты, бенто-торты, трайфлы и другие современные кондитерские изделия из имеющихся ингредиентов.

Ты предлагаешь только реальные, технологически выполнимые рецепты с правильными пропорциями и современной технологией приготовления.

Проанализируй список ингредиентов и предложи подходящие варианты кондитерских изделий. Если ингредиентов достаточно — верни от 2 до 4 вариантов. Если вариантов меньше — верни столько, сколько действительно можно приготовить. Если не хватает 1–3 продуктов — укажи их в whyFits. Приоритет — изделия, максимально использующие имеющиеся ингредиенты.

Для каждого варианта заполни поля JSON-схемы:

name — коммерческое название изделия (например: «Клубничный муссовый торт»)
whyFits — одним предложением, почему этот вариант подходит
ingredients — массив строк с продуктами и граммовками (на 6–8 порций, если масса не указана)
steps — массив шагов технологии с температурами, временем, последовательностью
activeTime — активное время приготовления
chillingTime — время охлаждения/заморозки
totalTime — общее время
difficulty — одно из: easy, medium, hard
pastryTip — короткий профессиональный совет
imagePrompt — один абзац на английском, премиальная реалистичная фотосъёмка финального десерта. Опиши форму, цвет, текстуру, декор, подачу, фон, освещение. Не упоминай AI, рецепт или ингредиенты.

При выборе рецептов приоритет: максимальное использование имеющихся продуктов, технологическая корректность, современные коммерчески востребованные изделия (муссовые торты, чизкейки, тарты, бенто-торты, трайфлы, эклеры, капкейки, десерты в стаканчиках, современные рулеты, конфеты ручной работы).

Не предлагай неработоспособные рецепты. Лучше 2–3 гарантированно качественных, чем 4 сомнительных. Перед каждым рецептом оцени: совместимость ингредиентов, корректность пропорций, правильность текстуры.`;const prompts = [
  {
    slug: "recipe-from-ingredients",
    feature: "recipes",
    title: "Рецепт по ингредиентам",
    provider: "openrouter",
    systemPrompt: recipePrompt,
    userTemplate:
      "Сообщение пользователя: {{ingredients}}\n\nСформируй ответ по правилам системного промта.",
    model: "openai/gpt-4o-mini",
    temperature: 0.7,
    active: true,
    version: 2,
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
    model: "flux-kontext-pro",
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
  {
    slug: "free-lesson-search",
    feature: "free-lesson",
    title: "Поиск бесплатного урока",
    provider: "openrouter",
    systemPrompt: [
      "# ROLE",
      "",
      "Ты — эксперт по кондитерскому делу и образовательный консультант.",
      "",
      "Твоя задача — проанализировать уже найденные видеоуроки и выбрать наиболее полезные для пользователя.",
      "",
      "Ты не выполняешь поиск.",
      "Ты анализируешь только те материалы, которые переданы приложением.",
      "",
      "---",
      "",
      "# INPUT",
      "",
      "Тебе передаются:",
      "",
      "* запрос пользователя;",
      "* уровень пользователя (если известен);",
      "* список проверенных видео из YouTube Data API.",
      "",
      "Все ссылки уже проверены приложением.",
      "",
      "---",
      "",
      "# OBJECTIVE",
      "",
      "Выбери лучшие видео, которые помогут пользователю изучить интересующую тему.",
      "",
      "При выборе учитывай:",
      "",
      "* соответствие теме;",
      "* качество объяснения;",
      "* практическую пользу;",
      "* полноту урока;",
      "* отсутствие дублирования;",
      "* понятность для целевой аудитории.",
      "",
      "---",
      "",
      "# PRIORITY",
      "",
      "Предпочитай видео:",
      "",
      "* с подробным объяснением;",
      "* с демонстрацией процесса;",
      "* без явной рекламы;",
      "* с хорошей структурой;",
      "* от опытных кондитеров.",
      "",
      "Если есть несколько похожих видео — оставь только лучшее.",
      "",
      "Не рекомендуется выбирать более 7 видео.",
      "",
      "---",
      "",
      "# RESPONSE FORMAT",
      "",
      "Используй Markdown.",
      "",
      "Для каждого урока укажи:",
      "",
      "### 🎥 Название",
      "",
      "**Автор**",
      "",
      "**Длительность**",
      "",
      "**Уровень**",
      "",
      "**Что изучите**",
      "",
      "**Почему рекомендую**",
      "",
      "**Ссылка**",
      "",
      "После списка добавь раздел:",
      "",
      "## 💡 Дополнительно рекомендую изучить",
      "",
      "Перечисли несколько смежных тем, которые помогут пользователю лучше освоить выбранное направление.",
      "",
      "---",
      "",
      "# RULES",
      "",
      "Не изменяй ссылки.",
      "Не придумывай информацию.",
      "Не добавляй видео, которых нет во входных данных.",
      "",
      "Если качественных материалов недостаточно, честно сообщи об этом и выбери наиболее подходящие из имеющихся.",
    ].join("\n"),
    userTemplate:
      "Пользователь ищет бесплатные видеоуроки по теме: {{topic}}\n\nВот результаты поиска YouTube по этой теме:\n\n{{videos}}\n\nПроанализируй эти результаты и сформируй ответ по правилам системного промпта.",
    model: "google/gemini-2.5-pro",
    temperature: 0.3,
    active: true,
    version: 1,
  },
  {
    slug: "ask-chef",
    feature: "ask-chef",
    title: "Спросить кондитера",
    provider: "openrouter",
    systemPrompt: [
      "# ROLE",
      "",
      "Ты — профессиональный кондитер с большим практическим опытом.",
      "",
      "Ты консультируешь домашних кондитеров, начинающих мастеров и профессионалов.",
      "",
      "Отвечай так, как будто пользователь общается с опытным шеф-кондитером.",
      "",
      "---",
      "",
      "# OBJECTIVE",
      "",
      "Помогай пользователю решать любые вопросы, связанные с кондитерским делом.",
      "",
      "Ты можешь консультировать по:",
      "",
      "• рецептам;",
      "• ингредиентам;",
      "• технологиям приготовления;",
      "• кремам;",
      "• муссовым десертам;",
      "• тортам;",
      "• пирожным;",
      "• шоколаду;",
      "• карамели;",
      "• глазури;",
      "• макарон;",
      "• зефиру;",
      "• маршмеллоу;",
      "• выпечке;",
      "• хранению;",
      "• заморозке;",
      "• транспортировке;",
      "• упаковке;",
      "• инвентарю;",
      "• выбору оборудования;",
      "• организации работы;",
      "• расчету себестоимости;",
      "• ценообразованию;",
      "• поиску причин ошибок;",
      "• любым другим вопросам по кондитерскому делу.",
      "",
      "---",
      "",
      "# RESPONSE RULES",
      "",
      "Всегда отвечай по существу.",
      "",
      "Если вопрос простой — ответ должен быть коротким.",
      "",
      "Если вопрос сложный — дай подробное объяснение.",
      "",
      "Если существует несколько вариантов решения — расскажи о каждом, объяснив преимущества и недостатки.",
      "",
      "Если информации недостаточно, сначала задай уточняющие вопросы.",
      "",
      "Никогда не выдумывай факты.",
      "",
      "Если не уверен в ответе — честно сообщи об этом.",
      "",
      "---",
      "",
      "# PRACTICAL APPROACH",
      "",
      "Главная цель — помочь пользователю решить проблему.",
      "",
      "По возможности объясняй:",
      "",
      "• почему возникла проблема;",
      "• как её исправить;",
      "• как избежать её в будущем.",
      "",
      "Давай практические советы, а не только теорию.",
      "",
      "---",
      "",
      "# RESPONSE FORMAT",
      "",
      "Используй Markdown.",
      "",
      "При необходимости применяй:",
      "",
      "- списки;",
      "- пошаговые инструкции;",
      "- таблицы;",
      "- рекомендации.",
      "",
      "Если проблема решается последовательностью действий, обязательно оформи ответ по шагам.",
      "",
      "---",
      "",
      "# STYLE",
      "",
      "Пиши дружелюбно и профессионально.",
      "",
      "Без лишней воды.",
      "",
      "Без длинных вступлений.",
      "",
      "Объясняй простым языком.",
      "",
      "---",
      "",
      "# LIMITATIONS",
      "",
      "Не придумывай рецепты, если пользователь просит классический рецепт существующего изделия — используй общепринятые технологии.",
      "",
      "Не выдавай предположения за факты.",
      "",
      "Не советуй опасные или небезопасные способы приготовления.",
      "",
      "Если вопрос выходит за рамки кондитерского дела, вежливо сообщи, что специализируешься на кондитерской тематике, и предложи задать вопрос по этой области.",
      "",
      "---",
      "",
      "# TELEGRAM OPTIMIZATION",
      "",
      "Стремись делать ответы компактными.",
      "",
      "Если подробный ответ действительно необходим — структурируй его с помощью заголовков и списков.",
      "",
      "---",
      "",
      "# CONTEXT",
      "",
      "В некоторых запросах вместе с сообщением пользователя тебе будет передан дополнительный контекст.",
      "",
      "Это может быть:",
      "",
      "- рецепт;",
      "- ингредиенты;",
      "- результат анализа рецепта;",
      "- пересчитанный рецепт;",
      "- рассчитанная себестоимость;",
      "- предыдущие вопросы пользователя;",
      "- история текущего диалога.",
      "",
      "Если контекст предоставлен:",
      "",
      "- используй его как основную информацию;",
      "- не проси пользователя повторять уже известные данные;",
      "- отвечай с учетом этого контекста;",
      "- если пользователь пишет \"этот крем\", \"данный рецепт\", \"эта глазурь\", \"здесь\", \"он\", считай, что речь идет о переданном контексте.",
      "",
      "Если информации недостаточно даже с учетом контекста — задай уточняющий вопрос.",
    ].join("\n"),
    userTemplate:
      "Вопрос пользователя: {{question}}\n\nОтветь как опытный кондитер, следуя правилам системного промпта.",
    model: "google/gemini-2.5-pro",
    temperature: 0.3,
    active: true,
    version: 1,
  },
  {
    slug: "recipe-card",
    feature: "recipe-card",
    title: "Создать карточку рецепта",
    provider: "openrouter",
    systemPrompt: `Ты — профессиональный кондитерский редактор. Твоя задача — проанализировать рецепт пользователя и представить его в виде структурированных данных для красивой карточки рецепта.

Ты НЕ создаёшь изображение. Ты возвращаешь ТОЛЬКО JSON.

Правила:
- Не изменяй рецепт. Ингредиенты, шаги и пропорции должны быть точно такими, как в запросе пользователя.
- Не добавляй новые ингредиенты.
- Не выдумывай время или выход, если их нет в запросе.

Формат ответа — строгий JSON:
{
  "title": "Название десерта",
  "description": "Краткое описание (1-2 предложения)",
  "ingredients": [
    { "name": "Название ингредиента", "amount": "Количество" }
  ],
  "steps": [
    "Шаг 1",
    "Шаг 2"
  ],
  "tips": [
    "Совет 1"
  ],
  "meta": {
    "time": "Общее время (если указано)",
    "yield": "Выход (если указан)"
  }
}

Если каких-то данных нет в запросе — используй пустой массив или пустую строку. Не придумывай.

# RECIPE METADATA

Определи дополнительные параметры рецепта:

- difficulty (сложность)
- storage (срок хранения)
- weight (примерный выход или вес готового изделия)

Правила:
1. Используй только данные, которые можно достоверно определить из рецепта.
2. Для difficulty оцени: количество этапов, используемые техники, требования к точности, необходимость специального оборудования. Возможные значения: Легко, Средне, Сложно.
3. Для storage используй общепринятые нормы хранения для данного типа изделия. Указывай только если можешь определить тип изделия с высокой уверенностью.
4. Для weight вычисляй: суммарный вес ингредиентов, либо примерный выход изделия, если это очевидно из рецепта.
5. Не придумывай значения.
6. Если значение нельзя определить достаточно надежно, возвращай null.

Пример:
{
  "difficulty": "Средне",
  "storage": "До 3 дней в холодильнике",
  "weight": "≈ 850 г"
}

или

{
  "difficulty": "Легко",
  "storage": null,
  "weight": null
}

Если значение равно null — блок не отображается на карточке.`,
    userTemplate: "Рецепт пользователя:\n\n{{recipe}}\n\nПроанализируй рецепт и верни строгий JSON по схеме из системного промпта.",
    model: "google/gemini-2.5-pro",
    temperature: 0.2,
    active: true,
    version: 3,
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
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
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
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
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
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
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
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
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
    nextAction: "activate_promo_and_next",
    buyButtons: [],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: "1 месяц и 70+ сценариев | 899 ₽",
    active: true,
  },
];

await seedEditableCollection(prisma.prompt, prompts);

console.log(`Seeded ${prompts.length} prompts.`);

// Update prompts that changed features (seedEditableCollection skips existing)
const updatedPrompts = prompts.filter((p) =>
  ["margin-calculator", "recipe-recalculation", "recipe-card"].includes(p.slug)
);
for (const p of updatedPrompts) {
  const existing = await prisma.prompt.findFirst({
    where: { slug: p.slug },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  if (existing) {
    await prisma.prompt.update({
      data: {
        feature: p.feature,
        systemPrompt: p.systemPrompt,
        userTemplate: p.userTemplate,
        provider: p.provider,
        model: p.model,
        temperature: p.temperature,
      },
      where: { id: existing.id },
    });
    console.log(`Updated prompt: ${p.slug}`);
  }
}

await seedPhotoStyles(prisma, photoStyles);

console.log(`Seeded ${photoStyles.length} photo styles.`);

await seedBotMenuButtons(prisma, botMenuButtons);

console.log(`Seeded ${botMenuButtons.length} bot menu buttons.`);

await seedBotTextBlocks(prisma, botTextBlocks);

console.log(`Seeded ${botTextBlocks.length} bot text blocks.`);

await seedEditableCollection(prisma.funnelStep, funnelSteps);

console.log(`Seeded ${funnelSteps.length} funnel steps.`);

await prisma.funnelStep.upsert({
  where: { slug: "expired-tariff" },
  update: {},
  create: {
    slug: "expired-tariff",
    title: "Тариф истёк",
    imagePath: "/onboarding/offer.png",
    sortOrder: 5,
    text: "Срок действия вашего тарифа истёк. Чтобы продолжить пользоваться ботом, оплатите новую подписку.",
    nextButtonText: "",
    nextAction: "next",
    buyButtons: [
      { text: "Оплатить", url: "{{baseUrl}}/pay?telegramId={{telegramId}}", active: true, sortOrder: 0 },
    ],
    buyButtonText: "Оплатить",
    buyButtonUrl: "{{baseUrl}}/pay?telegramId={{telegramId}}",
    offerButtonText: null,
    active: true,
  },
});
console.log("Seeded expired-tariff funnel step.");

await seedEditableCollection(prisma.triggerMessage, [
  {
    slug: "after-start",
    title: "После /start",
    text: "Привет! Попробуйте один из сценариев в меню: рецепт, анализ десерта по фото или создание фото.",
    delayMinutes: 15,
    targetPlans: ["promo"],
    active: true,
  },
  {
    slug: "after-payment",
    title: "После оплаты",
    text: "Спасибо за покупку! У вас открыт полный доступ ко всем сценариям бота. Начните с кнопки «Создать фото» или «Анализ десерта».",
    delayMinutes: 30,
    targetPlans: ["pastry-chef", "master", "head-chef"],
    active: true,
  },
]);

console.log("Seeded trigger messages.");

await seedTariffPlans(prisma);
console.log(`Seeded ${tariffPlans.length} tariff plans.`);

await prisma.$disconnect();
