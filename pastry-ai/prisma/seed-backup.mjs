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
        "��������� ������������: {{ingredients}}\n\n��������� ����� �� �������� ���������� ������.",
      model: "google/gemini-2.5-pro",
      temperature: 0.3,
      active: true,
      version: 1,
    };
  });
}

const recipePrompt = `# ����

�� � ���������������� ��������-�������� � ������� ������ ���������� ��������.

���� ������� ������ � �������� ���������� ��������� ������� �� ��� ������������, ������� ��� ���� � �������.

�� �� ������������. �� ����������� ������ ��������, �������������� ���������� �������.

---

# �������� ������

������������ �������� ������ ������������.

��������:

����:
- ������ 33%
- ����������
- ��������
- �������
- ����

�� ������������ �� � ����������� ����������� ��������� ���������� ���������� ��������.

���� ������������ ���������� � �������� 5�10 ���������.

���� ������������ ���� � �������� �������, ������� ������� ��������.

���� ����-�� ������� �� ������� � �������� �����, ����� 1�3 ����������� �������� ����������� ������ ��������.

---

# ��� ������� ������� ����������� ������

## 1. ��������

�������� �������� ��������.

��������:

� ���������� ����
� ������� ��� �������
� ����-��� � ���������
� �����-�����
� ���������� ��������

---

## 2. ������ ��������

����� ������������.

��������:

"��� �������� ����������� ��� �������."

���

"�� ������� ������ ������� ��������."

---

## 3. �����������

������ � �����������.

���� ������������ �� ������ ���������� ��������� ���������, ����������� ������ �� 6�8 ������.

---

## 4. ������ ���������� �������������

��������.

������ ���� ��������� �������.

��������:

1. �������� �������...
2. ��������� ������...
3. ������ ����������...
4. ��������...
5. ������� �� ������...

�� ��������� ��������������� ������.

---

## 5. �����

�����:

- �������� �����
- ����� ����������
- ����� �����

---

## 6. ���������

���� ��������:

?? �����

?? ������

?? ������

---

## 7. ����� ���������

������ ��������� ���������������� �����.

��������:

"�� ������������ ������� ���� 60�C."

���

"���������� ������� ������ ����� ���������� ������."

---

# ������� ������ ��������

���������:

1. ������������ ������ ��������� �����������.
2. �������������� ���������� ����������� ���������.
3. ���������� ���������� �������.
4. ���������� ����������� �������������� �������.
5. ���� �������� � ���������� ��������� ��������� ������ �������.

---

# ���� ������������ ������������

�� �������:

"���������� �����������."

������ ����� ��������:

"�� ��������� ��������� ����� �������..."

���

"���� �������� ������ ����� � ����, ����� �����������..."

���

"�� ������� ������ �����������..."

������ ������� ����� �������.

---

# ���� ������������ ������

"��� ����� �����������?"

������� ������ ������ ��������.

����� ������ ������:

"����� ������ �������� ���������?"

���� ������������ �����:

"������ ���"

� ������ ��� ������� ���������.

---

# ���� ������������ �����

"���� ���-������ ���������"

���

"���-������ �����������"

���

"��� ������ ���������"

�� �������� ����������� �������:

- �������� ��������
- �������
- ��������
- �����-�������
- �����
- �������
- ����
- �������� �������
- ������� � �����������
- ���������� �������

���� ��� ����� ���� ������������ �� ��������� ������������.

---

# ���� ����� ����������� ��������� ������� ��������

�� ��������� ��.

��������:

�� ����:

"����� ������� ����."

�����:

� ���������� ����
� ��������� ����
� ����������� ����
� �������� ����
� �������� ��������

---

# ������ ������

������� ������ ������:

"����� X ���������� ���������."

�����:

1.
��������

������ ��������

���������

�����

...

2.
...

---

# �����

���� ���������������, �� ������� ������.

�� ��������� ������� ����������.

�� ����������� ������� �����.

�������� ������������ ����������.

���� ���, ����� ��������� �������� ��������� �������� �������.

# ���������� �������

����� ��� ��� ���������� ������, ����� ��� �� ��������� ���������:

- �������������� ��������;
- ����������� ����������;
- ��������� ���������;
- ������ ����� ������� ��������;
- ������ ������������� ����������� ������������ ��������.

�� ���������� �������, ������� �������� �������������, �� �� �������� �� ��������.

���� ���� ��������, ����� ���������� ������ ��������, �� �������������� ������������.`;
const prompts = [
  {
    slug: "recipe-from-ingredients",
    feature: "recipes",
    title: "������ �� ������������",
    provider: "openrouter",
    systemPrompt: recipePrompt,
    userTemplate:
      "��������� ������������: {{ingredients}}\n\n��������� ����� �� �������� ���������� ������.",
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    active: true,
    version: 1,
  },
  {
    slug: "dessert-identification",
    feature: "vision",
    title: "��������� ������ �� ����",
    provider: "openrouter",
    systemPrompt: [
      "�� ���������������� ��������-�������� � ������� �� ����������� ��������.",
      "����������� ���������� ���������� �������: �����, ��������, �����, ��������, ������� ���� � ��������.",
      "�������� ��� �������, ��������� ����������, �������������� ������, �������, ��������, ����� � ��������� �������������.",
      "�� ��������� ��, ���� ������ ���������� �� ����. ���� ����������� ���������, ������ ��������� ������������: ��������� �����, ������ ��, ���� �� ����������.",
      "�� ���������� ������ ������������, ������ ��������� ��� ������ ����� ���������� ������� ��� ����������� ���������.",
      "������� ���� � ������ ������������ ������, ��� ����������, � ���� ����������� ����������� ����������� ������� ������.",
    ].join(" "),
    userTemplate:
      "������������� ���� ������� � ����� ����������������� ���������������� ������. ���� �������� ��������� image input: {{imageUrl}}.",
    model: "google/gemini-2.5-pro",
    temperature: 0.2,
    active: true,
    version: 1,
  },
  {
    slug: "product-photo",
    feature: "photoshoot",
    title: "���������� ���� �������",
provider: "kie",
    systemPrompt:
      "�� ���-�������� ���������� ������ ��������. ��������� �������� ���� ������� � ������������ ������������ ����������� � �������� �����.",
    userTemplate:
      "��������� �������� ���� ������� ��� ������������ ��������: {{imageUrl}}.\n\n������� ��� ������ ����������: �����, �������� ����, ���������, ����� � �������� ������. �� �������� ������ �������, ��������, ������� ����� � �����.\n\n������ ������������ ������������ ���������� ������� � �����: {{style}}",
    model: "flux-kontext-pro",
    temperature: 0.4,
    active: true,
    version: 1,
  },
  {
    slug: "instagram-carousel",
    feature: "carousel",
    title: "�������� ��� Instagram",
    provider: "openrouter",
    systemPrompt:
      "�� �������-������� ��� Instagram. ������� �� ������� �����. ����� �������� ���������, ���������� � ��������� ��� ������������� ��������� ����������.",
    userTemplate:
      "������ Instagram-�������� �� ����: {{topic}}. ����� �������, ������ ������� � ������� � �����.",
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
    description: "Премиальная тёмная съёмка для дорогих десертов.",
    prompt:
      "Тёмный премиальный фон, мягкий боковой свет для десерта, глубокие тени, богатый контраст, золотые акценты, элегантная атмосфера",
  },
  {
    name: "Витрина кондитерской",
    description: "Светлая витрина как в лучших кондитерских.",
    prompt:
      "Яркое освещение кондитерской витрины, отражения на стекле, нейтральный тон, уютная атмосфера, аппетитная подача десертов в витрине",
  },
  {
    name: "Каталог",
    description: "Предметная съёмка для меню или сайта.",
    prompt:
      "Чистый белый фон, объектив на уровне десерта, ракурс 3/4, нейтральное освещение, минималистичная сервировка, профессиональная предметная съёмка",
  },
  {
    name: "Крупный план",
    description: "Макросъёмка на десерте, текстура и детали.",
    prompt:
      "Крупный план, текстура десерта видна отчётливо, детали и слои, мягкий естественный свет, кремовая текстура, профессиональная food-фотография",
  },
  {
    name: "Кофейня",
    description: "Уютный снимок на деревянном столе с кофе.",
    prompt:
      "Уютное кафе, деревянный стол на фоне, тёплый свет, чашка кофе рядом, уютная атмосфера, расслабленная food-съёмка",
  },
  {
    name: "Праздничная подача",
    description: "Яркая сервировка для торжеств и праздников.",
    prompt:
      "Праздничная сервировка, яркий декор, свечи на фоне, богатая подача, золотые элементы, торжественная food-фотография",
  },
  {
    name: "Минимализм",
    description: "Чистый лаконичный кадр с акцентом на форме.",
    prompt:
      "Минималистичный интерьер, приглушённый свет, чистые линии, акцент на форме, нейтральные тона, изысканная простота",
  },
];
 
const botMenuButtons = [
  {
    actionType: "PROMPT",
    description: "Создать рецепт из доступных ингредиентов.",
    emoji: "🍰",
    label: "Поиск рецепта",
    promptFeature: "recipes",
    promptSlug: "recipe-from-ingredients",
    sortOrder: 1,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Сгенерировать фото десерта в 7 вариантах стилей.",
    emoji: "📸",
    label: "Создать фото",
    promptFeature: "photoshoot",
    promptSlug: "product-photo",
    sortOrder: 2,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Выбрать один стиль и создать фото десерта в нём.",
    emoji: "🎨",
    label: "Фото по стилю",
    promptFeature: "photoshoot-pick-style",
    promptSlug: "pick-style",
    sortOrder: 3,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Проанализировать десерт по фото с описанием.",
    emoji: "🔎",
    label: "Анализ десерта",
    promptFeature: "vision",
    promptSlug: "dessert-identification",
    sortOrder: 4,
    url: null,
  },
  {
    actionType: "PROMPT",
    description: "Создать карусель текстов для Instagram.",
    emoji: "📚",
    label: "Карусель",
    promptFeature: "carousel",
    promptSlug: "instagram-carousel",
    sortOrder: 5,
    url: null,
  },
  {
    actionType: "URL",
    description: "Перейти в личный кабинет для управления подпиской.",
    emoji: "👤",
    label: "Мой профиль",
    promptFeature: null,
    promptSlug: null,
    sortOrder: 6,
    url: "{{baseUrl}}/profile",
  },
  {
    actionType: "URL",
    description: "Скидки, акции и специальные предложения.",
    emoji: "🎁",
    label: "Бонусы и акции",
    promptFeature: null,
    promptSlug: null,
    sortOrder: 7,
    url: "{{baseUrl}}/pay",
  },
];

const funnelSteps = [
  {
    slug: "welcome",
    title: "�����������",
    imagePath: "/onboarding/welcome.png",
    sortOrder: 0,
    text:
      "������! � ������ ����������� � ���������, ��������� � ��������� ��� ���������.\n\n" +
      "����� ������ �� ������� �������� �������� � ���� ���� � ������������ AI-���������.",
    nextButtonText: "�����",
    buyButtonText: "������",
    buyButtonUrl: null,
    offerButtonText: null,
    active: true,
  },
  {
    slug: "maria",
    title: "�����",
    imagePath: "/onboarding/maria.png",
    sortOrder: 1,
    text:
      "����� ���� �������� ������������ � ����� ��������� ���� �������� ��� �����������.\n\n" +
      "� ����� ��� ����� ������ ������, ����� ���������� ������������ � �������, � �������� ���� �������� �������.",
    nextButtonText: "�����",
    buyButtonText: "������",
    buyButtonUrl: null,
    offerButtonText: null,
    active: true,
  },
  {
    slug: "polina",
    title: "������",
    imagePath: "/onboarding/polina.png",
    sortOrder: 2,
    text:
      "������ ������ ������� ��� ������������� �����.\n\n" +
      "AI �������� �� ������� �������� ���� ��������, �������� � ���������������� ������� �������� �� ����.",
    nextButtonText: "�����",
    buyButtonText: "������",
    buyButtonUrl: null,
    offerButtonText: null,
    active: true,
  },
  {
    slug: "ksusha",
    title: "�����",
    imagePath: "/onboarding/ksusha.png",
    sortOrder: 3,
    text:
      "����� ������ ����������� �������� � ����� ��������, ��� ��������� �������� �������.\n\n" +
      "��� ��������� ��������� ����, ��������, ������� � ���������� ������� ������.",
    nextButtonText: "�����",
    buyButtonText: "������",
    buyButtonUrl: null,
    offerButtonText: null,
    active: true,
  },
  {
    slug: "offer",
    title: "�����",
    imagePath: "/onboarding/offer.png",
    sortOrder: 4,
    text:
      "����������� �����������: ������ � AI-��������� ���������.\n\n" +
      "�� �������� ���� ���������, ������ �������� �� ����, ������� � ����������� ��� ��������.",
    nextButtonText: "�����",
    buyButtonText: "������",
    buyButtonUrl: null,
    offerButtonText: "������ � AI-��������� | 899 ?",
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
        title: "����� /start",
        text: "������! �� ��������, ��� �� ��� �� ����������� ���� �������. ���������� ��� ��� � ������ 20% �� ������ ����� ��������! ���������� � ���� � ��������� ����� �����.",
        delayMinutes: 15,
        targetPlans: ["FREE"],
        active: true,
      },
      {
        slug: "after-payment",
        title: "����� ������",
        text: "������� �� �������! ?? � ��� ������ ������ ������ �� ���� �������� ����. ���������� ������� ������� � ��������� ���� ������� � �������� ������ ��������������� ������.",
        delayMinutes: 30,
        targetPlans: ["PRO", "TEAM"],
        active: true,
      },
    ],
  });
}

console.log(`Seeded trigger messages.`);

await prisma.$disconnect();

