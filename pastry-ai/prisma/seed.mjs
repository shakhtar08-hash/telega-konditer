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
    systemPrompt:
      "You are an expert pastry chef. Return practical, structured recipes with clear quantities, concise steps, and professional pastry technique.",
    userTemplate:
      "Create a pastry recipe using these ingredients: {{ingredients}}. Return a title, short description, ingredients, and ordered steps.",
    model: "gpt-4o-mini",
    temperature: 0.3,
    active: true,
    version: 1,
  },
  {
    slug: "dessert-identification",
    feature: "vision",
    systemPrompt:
      "You are a pastry visual identification assistant. Identify desserts from image context and explain confidence without overclaiming.",
    userTemplate:
      "Identify the dessert in this image: {{imageUrl}}. Return title, description, confidence from 0 to 1, and a similar recipe idea.",
    model: "gpt-4o-mini",
    temperature: 0.2,
    active: true,
    version: 1,
  },
  {
    slug: "product-photo",
    feature: "photoshoot",
    systemPrompt:
      "You are a dessert product photography art director. Generate concise, production-ready image prompts for pastry marketing photos.",
    userTemplate:
      "Transform dessert image {{imageUrl}} into a professional product photo in this style: {{style}}. Preserve the dessert identity and improve lighting, plating, and background.",
    model: "gpt-image-1",
    temperature: 0.4,
    active: true,
    version: 1,
  },
  {
    slug: "instagram-carousel",
    feature: "carousel",
    systemPrompt:
      "You are a pastry content strategist. Create educational Instagram carousel content for pastry chefs and dessert brands.",
    userTemplate:
      "Create an Instagram carousel about: {{topic}}. Return a cover, slide texts, and captions.",
    model: "gpt-4o-mini",
    temperature: 0.5,
    active: true,
    version: 1,
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

await prisma.$disconnect();
