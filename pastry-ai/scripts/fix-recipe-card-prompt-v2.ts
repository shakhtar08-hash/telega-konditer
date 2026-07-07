import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const RECIPE_METADATA_BLOCK = [
  "",
  "# RECIPE METADATA",
  "",
  "Определи дополнительные параметры рецепта:",
  "",
  "- difficulty (сложность)",
  "- storage (срок хранения)",
  "- weight (примерный выход или вес готового изделия)",
  "",
  "Правила:",
  "1. Используй только данные, которые можно достоверно определить из рецепта.",
  "2. Для difficulty оцени: количество этапов, используемые техники, требования к точности, необходимость специального оборудования. Возможные значения: Легко, Средне, Сложно.",
  "3. Для storage используй общепринятые нормы хранения для данного типа изделия. Указывай только если можешь определить тип изделия с высокой уверенностью.",
  "4. Для weight вычисляй: суммарный вес ингредиентов, либо примерный выход изделия, если это очевидно из рецепта.",
  "5. Не придумывай значения.",
  "6. Если значение нельзя определить достаточно надежно, возвращай null.",
  "",
  "Пример:",
  '{',
  '  "difficulty": "Средне",',
  '  "storage": "До 3 дней в холодильнике",',
  '  "weight": "≈ 850 г"',
  "}",
  "",
  "или",
  "",
  "{",
  '  "difficulty": "Легко",',
  '  "storage": null,',
  '  "weight": null',
  "}",
  "",
  "Если значение равно null — блок не отображается на карточке.",
].join("\n");

async function main() {
  const prompts = await prisma.prompt.findMany({
    where: { slug: "recipe-card" },
    orderBy: { version: "desc" },
  });

  if (prompts.length === 0) {
    console.log("No recipe-card prompts found.");
    return;
  }

  const active = prompts.find((p) => p.active);
  if (!active) {
    console.log("No active recipe-card prompt found.");
    return;
  }

  const newSystemPrompt = active.systemPrompt + RECIPE_METADATA_BLOCK;
  const newVersion = active.version + 1;

  await prisma.prompt.update({
    where: { id: active.id },
    data: { active: false },
  });

  await prisma.prompt.create({
    data: {
      slug: active.slug,
      feature: active.feature,
      title: active.title,
      provider: active.provider,
      systemPrompt: newSystemPrompt,
      userTemplate: active.userTemplate,
      model: active.model,
      temperature: active.temperature,
      active: true,
      version: newVersion,
    },
  });

  console.log(`Created recipe-card prompt version ${newVersion} with RECIPE METADATA section.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });