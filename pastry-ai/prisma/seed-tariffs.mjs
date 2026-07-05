import { seedEditableCollection } from "./seed-editable-collection.mjs";

export const tariffPlans = [
  {
    slug: "promo",
    name: "Промо",
    tokenAmount: 15,
    durationDays: 3,
    active: true,
    sortOrder: 1,
  },
  {
    slug: "pastry-chef",
    name: "Кондитер",
    tokenAmount: 100,
    durationDays: 30,
    active: true,
    sortOrder: 2,
  },
  {
    slug: "master",
    name: "Мастер",
    tokenAmount: 200,
    durationDays: 30,
    active: true,
    sortOrder: 3,
  },
  {
    slug: "head-chef",
    name: "Шеф-кондитер",
    tokenAmount: 400,
    durationDays: 30,
    active: true,
    sortOrder: 4,
  },
];

export async function seedTariffPlans(prisma) {
  await seedEditableCollection(prisma.tariffPlan, tariffPlans);
}