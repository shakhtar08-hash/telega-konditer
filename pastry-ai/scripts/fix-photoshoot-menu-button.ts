import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const expectedButtons = [
  { label: "Создать рецепт", promptFeature: "recipes", promptSlug: "recipe-from-ingredients" },
  { label: "Создать фото", promptFeature: "photoshoot", promptSlug: "product-photo" },
  { label: "Фото по стилю", promptFeature: "photoshoot-pick-style", promptSlug: "pick-style" },
  { label: "Анализ десерта", promptFeature: "vision", promptSlug: "dessert-identification" },
  { label: "Поиск урока", promptFeature: "free-lesson", promptSlug: "free-lesson-search" },
  { label: "Спросить кондитера", promptFeature: "ask-chef", promptSlug: "ask-chef" },
  { label: "Создать карточку рецепта", promptFeature: "recipe-card", promptSlug: "recipe-card" },
  { label: "Карусель", promptFeature: "carousel", promptSlug: "instagram-carousel" },
  { label: "Калькулятор маржи", promptFeature: "recipe-margin", promptSlug: "margin-calculator" },
  { label: "Пересчёт рецепта", promptFeature: "recipe-recalculation", promptSlug: "recipe-recalculation" },
];

async function main() {
  for (const expected of expectedButtons) {
    const button = await prisma.botMenuButton.findFirst({
      where: { label: expected.label },
    });

    if (!button) {
      console.log(`Button '${expected.label}' not found, skipping.`);
      continue;
    }

    if (button.promptFeature !== expected.promptFeature || button.promptSlug !== expected.promptSlug) {
      console.log(`Fixing '${expected.label}': was promptFeature=${button.promptFeature} promptSlug=${button.promptSlug}`);
      await prisma.botMenuButton.update({
        where: { id: button.id },
        data: {
          promptFeature: expected.promptFeature,
          promptSlug: expected.promptSlug,
        },
      });
    } else {
      console.log(`'${expected.label}': OK`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });