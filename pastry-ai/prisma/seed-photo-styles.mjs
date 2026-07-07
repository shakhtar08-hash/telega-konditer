import { seedEditableCollection } from "./seed-editable-collection.mjs";

const photoStylesSeedMarkerKey = "seed_state:photo_styles_initialized";

export const photoStyles = [
  {
    name: "Тёмный премиум",
    description: "Премиальная тёмная съёмка для дорогих десертов.",
    prompt:
      "Тёмный премиальный фон, мягкий боковой свет, глубокие тени, богатый контраст, элегантная атмосфера",
    provider: "kie",
    model: "flux-kontext-pro",
  },
  {
    name: "Витрина кондитерской",
    description: "Светлая подача как в хорошей городской кондитерской.",
    prompt:
      "Светлая витрина, мягкие отражения на стекле, уютная атмосфера, аппетитная подача десерта",
    provider: "kie",
    model: "flux-kontext-pro",
  },
  {
    name: "Каталог",
    description: "Чистая предметная съёмка для меню и сайта.",
    prompt:
      "Белый фон, ракурс 3/4, нейтральный свет, минималистичная сервировка, коммерческая предметная съёмка",
    provider: "kie",
    model: "flux-kontext-pro",
  },
  {
    name: "Крупный план",
    description: "Акцент на текстуре, слоях и деталях десерта.",
    prompt:
      "Макросъёмка, видимая текстура десерта, мягкий естественный свет, внимание к слоям и деталям",
    provider: "kie",
    model: "flux-kontext-pro",
  },
  {
    name: "Кофейня",
    description: "Уютный кадр с атмосферой кафе.",
    prompt:
      "Уютное кафе, деревянный стол, тёплый свет, чашка кофе рядом, расслабленная food-съёмка",
    provider: "kie",
    model: "flux-kontext-pro",
  },
  {
    name: "Праздничная подача",
    description: "Яркая сервировка для торжеств и праздников.",
    prompt:
      "Праздничный декор, свечи на фоне, богатая подача, золотые акценты, торжественная атмосфера",
    provider: "kie",
    model: "flux-kontext-pro",
  },
  {
    name: "Минимализм",
    description: "Лаконичный кадр с акцентом на форме десерта.",
    prompt:
      "Минималистичный интерьер, приглушённый свет, чистые линии, нейтральные тона, акцент на форме",
    provider: "kie",
    model: "flux-kontext-pro",
  },
];

export async function seedPhotoStyles(prisma, styles = photoStyles) {
  const marker = await prisma.botTextBlock.findUnique({
    where: { key: photoStylesSeedMarkerKey },
    select: { id: true },
  });

  if (marker) {
    return;
  }

  const existingCount = await prisma.photoStyle.count();

  if (existingCount === 0) {
    await seedEditableCollection(prisma.photoStyle, styles);
  }

  await prisma.botTextBlock.upsert({
    where: { key: photoStylesSeedMarkerKey },
    update: {},
    create: {
      key: photoStylesSeedMarkerKey,
      text: "initialized",
    },
  });
}
