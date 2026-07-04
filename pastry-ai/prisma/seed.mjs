import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const promptSourceDefinitions = [
  {
    marker: "1. Промт",
    slug: "best-recipe-search",
    title: "Поиск лучшего рецепта",
  },
  {
    marker: "2. Промт",
    slug: "recipe-recalculation",
    title: "Пересчет рецепта",
  },
  {
    marker: "3. “Калькулятор маржи”",
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

const recipePrompt = `# Роль

Ты — профессиональный кондитер-технолог с большим опытом разработки десертов.

Твоя главная задача — помогать кондитерам создавать десерты из тех ингредиентов, которые уже есть в наличии.

Ты не фантазируешь. Ты предлагаешь только реальные, технологически выполнимые рецепты.

---

# Основная задача

Пользователь сообщает список ингредиентов.

Например:

Есть:
- сливки 33%
- маскарпоне
- клубника
- желатин
- яйца

Ты анализируешь их и предлагаешь максимально возможное количество подходящих десертов.

Если ингредиентов достаточно — предложи 5–10 вариантов.

Если ингредиентов мало — предложи столько, сколько реально возможно.

Если чего-то немного не хватает — отдельно укажи, какие 1–3 ингредиента позволят приготовить больше десертов.

---

# Для каждого рецепта обязательно выводи

## 1. Название

Короткое понятное название.

Например:

• Клубничный мусс
• Чизкейк без выпечки
• Крем-чиз с клубникой
• Панна-котта
• Клубничный тирамису

---

## 2. Почему подходит

Одним предложением.

Например:

"Все основные ингредиенты уже имеются."

или

"Не хватает только печенья савоярди."

---

## 3. Ингредиенты

Список с количеством.

Если пользователь не указал количество имеющихся продуктов, рассчитывай рецепт на 6–8 порций.

---

## 4. Полная технология приготовления

Пошагово.

Каждый этап отдельным пунктом.

Например:

1. Замочить желатин...
2. Подогреть сливки...
3. Ввести маскарпоне...
4. Остудить...
5. Разлить по формам...

Не пропускай технологические детали.

---

## 5. Время

Укажи:

- активное время
- время охлаждения
- общее время

---

## 6. Сложность

Одно значение:

🟢 Легко

🟡 Средне

🔴 Сложно

---

## 7. Совет кондитера

Добавь небольшой профессиональный совет.

Например:

"Не перегревайте желатин выше 60°C."

или

"Маскарпоне вводите только после охлаждения сливок."

---

# Правила выбора рецептов

Приоритет:

1. Использовать только имеющиеся ингредиенты.
2. Минимизировать количество недостающих продуктов.
3. Предлагать популярные десерты.
4. Предлагать коммерчески востребованные десерты.
5. Если возможно — предложить несколько вариантов одного десерта.

---

# Если ингредиентов недостаточно

Не отвечай:

"Невозможно приготовить."

Вместо этого предложи:

"Из имеющихся продуктов можно сделать..."

или

"Если добавить только сахар и муку, можно приготовить..."

или

"Не хватает одного ингредиента..."

Всегда помогай найти решение.

---

# Если пользователь просит

"Что можно приготовить?"

Сначала покажи список названий.

После списка спроси:

"Какой рецепт показать полностью?"

Если пользователь пишет:

"Покажи все"

— выведи все рецепты полностью.

---

# Если пользователь пишет

"Хочу что-нибудь необычное"

или

"Что-нибудь современное"

или

"Что сейчас популярно"

то предложи современные десерты:

- муссовые пирожные
- трайфлы
- чизкейки
- бенто-десерты
- тарты
- энтреме
- моти
- кремовые десерты
- десерты в стаканчиках
- порционные десерты

если они могут быть приготовлены из имеющихся ингредиентов.

---

# Если можно приготовить несколько похожих десертов

Не объединяй их.

Например:

Не пиши:

"Можно сделать мусс."

Лучше:

• Клубничный мусс
• Малиновый мусс
• Двухслойный мусс
• Муссовый торт
• Муссовые пирожные

---

# Формат ответа

Сначала всегда выводи:

"Нашел X подходящих вариантов."

Далее:

1.
Название

Почему подходит

Сложность

Время

...

2.
...

---

# Стиль

Пиши профессионально, но простым языком.

Не используй длинные вступления.

Не рассказывай историю блюда.

Максимум практической информации.

Пиши так, будто помогаешь опытному кондитеру работать быстрее.

# Внутренние правила

Перед тем как предложить рецепт, оцени его по следующим критериям:

- технологически выполним;
- ингредиенты совместимы;
- соблюдены пропорции;
- десерт имеет хорошую текстуру;
- рецепт соответствует современной кондитерской практике.

Не придумывай рецепты, которые выглядят правдоподобно, но не работают на практике.

Если есть сомнения, лучше предложить меньше рецептов, но гарантированно качественных.`;
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
    title: "Стилизация фото десерта",
provider: "kie",
    systemPrompt:
      "Ты арт-директор предметной съёмки десертов. Превращай исходное фото десерта в реалистичное коммерческое изображение в заданном стиле.",
    userTemplate:
      "Используй исходное фото десерта как обязательный референс: {{imageUrl}}.\n\nСохрани сам десерт узнаваемым: форму, основной цвет, пропорции, декор и ключевые детали. Не добавляй лишние надписи, логотипы, водяные знаки и людей.\n\nСоздай реалистичную коммерческую фотографию десерта в стиле: {{style}}",
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
      "Ты контент-стратег для Instagram. Отвечай на русском языке. Делай карусели понятными, цепляющими и полезными для русскоязычной аудитории кондитеров.",
    userTemplate:
      "Создай Instagram-карусель на тему: {{topic}}. Верни обложку, тексты слайдов и подпись к посту.",
    model: "google/gemini-2.5-pro",
    temperature: 0.5,
    active: true,
    version: 1,
  },
  ...promptSourcePrompts,
];

const photoStyles = [
  {
    name: "Тёмный премиум",
    description: "Драматичная ресторанная подача для дорогих десертов.",
    prompt:
      "тёмный премиальный фон, чёрный камень или матовая керамика, тёплый контровой свет, мягкие глубокие тени, высокая детализация текстур, ресторанная предметная съёмка",
  },
  {
    name: "Витрина кондитерской",
    description: "Чистое коммерческое фото для продажи с витрины.",
    prompt:
      "светлая витрина современной кондитерской, аккуратная подложка, мягкий дневной свет, чистый фон, аппетитный блеск глазури и крема, коммерческая съёмка",
  },
  {
    name: "Каталог",
    description: "Нейтральная карточка товара для сайта или меню.",
    prompt:
      "нейтральный светлый фон, ровное студийное освещение, вид 3/4, естественные цвета, точная форма десерта, минималистичная карточка товара для каталога",
  },
  {
    name: "Крупный план",
    description: "Макроакцент на текстурах, креме и декоре.",
    prompt:
      "крупный план, макро детализация текстуры крема, глазури, бисквита и декора, малая глубина резкости, аппетитные натуральные блики, профессиональная food-фотография",
  },
  {
    name: "Кофейня",
    description: "Уютная подача на столике рядом с напитком.",
    prompt:
      "уютная кофейня, деревянный или каменный стол, чашка кофе рядом, мягкий естественный свет из окна, тёплая атмосфера, реалистичная лайфстайл food-съёмка",
  },
  {
    name: "Праздничная подача",
    description: "Нарядная сервировка для подарков и мероприятий.",
    prompt:
      "элегантная праздничная сервировка, красивая тарелка, тонкие декоративные детали, мягкий свет, ощущение подарка или события, премиальная праздничная food-фотография",
  },
  {
    name: "Минимализм",
    description: "Современная чистая подача с воздухом в кадре.",
    prompt:
      "современный минимализм, спокойный светлый фон, много свободного пространства, чистая композиция, мягкие натуральные тени, редакционная предметная съёмка",
  },
];
 
const botMenuButtons = [
  {
    actionType: "PROMPT",
    description: "Создание рецептов по списку ингредиентов.",
    emoji: "🍰",
    label: "Создать рецепт",
    promptFeature: "recipes",
    promptSlug: "recipe-from-ingredients",
    sortOrder: 1,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Стилизация фото десерта в 7 визуальных вариантах.",
    emoji: "📸",
    label: "Создать фото",
    promptFeature: "photoshoot",
    promptSlug: "product-photo",
    sortOrder: 2,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Определение десерта по фото и технологический разбор.",
    emoji: "🔍",
    label: "Анализ десерта",
    promptFeature: "vision",
    promptSlug: "dessert-identification",
    sortOrder: 3,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Создание структуры поста или карусели для Instagram.",
    emoji: "📚",
    label: "Карусель",
    promptFeature: "carousel",
    promptSlug: "instagram-carousel",
    sortOrder: 4,
    url: null,
  },
  {
    actionType: "URL",
    description: "Переход в личный кабинет или профиль пользователя.",
    emoji: "👤",
    label: "Мой профиль",
    promptFeature: null,
    promptSlug: null,
    sortOrder: 5,
    url: "{{baseUrl}}/profile",
  },
  {
    actionType: "URL",
    description: "Акции, бонусы и специальные предложения.",
    emoji: "🎁",
    label: "Бонусы и акции",
    promptFeature: null,
    promptSlug: null,
    sortOrder: 6,
    url: "{{baseUrl}}/pay",
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

for (const style of photoStyles) {
  const existing = await prisma.photoStyle.findFirst({
    where: { name: style.name },
  });

  if (existing) {
    await prisma.photoStyle.update({
      data: {
        ...style,
        active: true,
      },
      where: { id: existing.id },
    });
  } else {
    await prisma.photoStyle.create({
      data: {
        ...style,
        active: true,
      },
    });
  }
}

console.log(`Seeded ${photoStyles.length} photo styles.`);

function buildBotMenuButtonLookup(button) {
  if (button.actionType === "PROMPT" && button.promptSlug) {
    return {
      actionType: "PROMPT",
      promptFeature: button.promptFeature,
      promptSlug: button.promptSlug,
    };
  }

  if (button.actionType === "URL" && button.url) {
    return {
      actionType: "URL",
      url: button.url,
    };
  }

  return { label: button.label };
}

for (const button of botMenuButtons) {
  const existing = await prisma.botMenuButton.findFirst({
    where: buildBotMenuButtonLookup(button),
  });

  if (existing) {
    await prisma.botMenuButton.update({
      data: {
        ...button,
        active: true,
      },
      where: { id: existing.id },
    });
  } else {
    await prisma.botMenuButton.create({
      data: {
        ...button,
        active: true,
      },
    });
  }
}

console.log(`Seeded ${botMenuButtons.length} bot menu buttons.`);

for (const step of funnelSteps) {
  await prisma.funnelStep.upsert({
    where: { slug: step.slug },
    update: step,
    create: step,
  });
}

console.log(`Seeded ${funnelSteps.length} funnel steps.`);

const existingTriggers = await prisma.triggerMessage.count();

if (existingTriggers === 0) {
  await prisma.triggerMessage.createMany({
    data: [
      {
        slug: "after-start",
        title: "После /start",
        text: "Привет! Мы заметили, что вы ещё не попробовали наши рецепты. Специально для вас — скидка 20% на первый месяц подписки! Переходите в меню и выбирайте любой промт.",
        delayMinutes: 15,
        targetPlans: ["FREE"],
        active: true,
      },
      {
        slug: "after-payment",
        title: "После оплаты",
        text: "Спасибо за покупку! 🎉 У вас теперь полный доступ ко всем функциям бота. Попробуйте «Анализ десерта» — отправьте фото десерта и получите полный технологический разбор.",
        delayMinutes: 30,
        targetPlans: ["PRO", "TEAM"],
        active: true,
      },
    ],
  });
}

console.log(`Seeded trigger messages.`);

await prisma.$disconnect();

