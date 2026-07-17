import { prisma } from "@/db/prisma";

const numberFormat = new Intl.NumberFormat("ru-RU");
const currencyFormat = new Intl.NumberFormat("ru-RU", {
  currency: "RUB",
  maximumFractionDigits: 0,
  style: "currency",
});

const featureGroups = {
  analysis: ["vision"],
  content: ["carousel"],
  consulting: ["ask-chef", "free-lesson"],
  photo: ["photoshoot"],
  recipes: [
    "recipes",
    "best-recipe-search",
    "recipe-recalculation",
    "recipe-card",
    "margin-calculator",
  ],
} as const;

function groupFeature(feature: string): string {
  for (const [group, features] of Object.entries(featureGroups)) {
    if ((features as readonly string[]).includes(feature)) {
      return group;
    }
  }

  return "other";
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && value !== null && "toString" in value) {
    return Number(value.toString());
  }

  return Number(value);
}

function formatNumber(value: number) {
  return numberFormat.format(value);
}

function formatCurrency(value: number) {
  return currencyFormat.format(value);
}

export async function loadAdminDashboardPageData() {
  const [
    userCount,
    subscriptionCount,
    usageAggregate,
    paymentAggregate,
    recipeCount,
    photosSentAgg,
    usageByFeature,
    usageByProvider,
    users,
    conversations,
    photoStyles,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.usage.aggregate({ _sum: { cost: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.generatedRecipeContext.count(),
    prisma.tokenUsage.aggregate({ _sum: { imagesSent: true } }),
    prisma.usage.groupBy({ by: ["feature"], _count: true }),
    prisma.usage.groupBy({
      _count: true,
      _sum: { cost: true },
      by: ["provider"],
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        credits: true,
        id: true,
        name: true,
        plan: true,
        telegramId: true,
        username: true,
      },
      take: 5,
    }),
    prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          select: { content: true },
          take: 1,
        },
        user: {
          select: {
            name: true,
            telegramId: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.photoStyle.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        preview: true,
      },
      take: 5,
    }),
  ]);

  const apiCost = toNumber(usageAggregate._sum.cost);
  const revenue = toNumber(paymentAggregate._sum.amount);
  const conversion = userCount > 0 ? (subscriptionCount / userCount) * 100 : 0;
  const photosSent = toNumber(photosSentAgg._sum.imagesSent);

  const distribution: Record<string, number> = {};
  for (const item of usageByFeature) {
    const group = groupFeature(item.feature);
    distribution[group] = (distribution[group] ?? 0) + item._count;
  }

  return {
    conversations,
    conversion,
    distribution: {
      analysis: distribution.analysis ?? 0,
      consulting: distribution.consulting ?? 0,
      content: distribution.content ?? 0,
      other: distribution.other ?? 0,
      photo: distribution.photo ?? 0,
      recipes: distribution.recipes ?? 0,
    },
    metricCards: [
      {
        accent: "bg-[#7257ff]",
        key: "users",
        label: "Пользователи",
        value: formatNumber(userCount),
      },
      {
        accent: "bg-[#35d08b]",
        key: "recipes",
        label: "Рецепты создано",
        value: formatNumber(recipeCount),
      },
      {
        accent: "bg-[#2b91ff]",
        key: "photos",
        label: "Фото сгенерировано",
        value: formatNumber(photosSent),
      },
      {
        accent: "bg-[#f5a524]",
        key: "revenue",
        label: "Выручка",
        value: formatCurrency(revenue),
      },
      {
        accent: "bg-[#8b5cf6]",
        key: "apiCost",
        label: "Расходы на API",
        value: formatCurrency(apiCost),
      },
    ],
    photoStyles,
    providerUsage: usageByProvider.map((item) => ({
      cost: toNumber(item._sum.cost),
      count: item._count,
      provider: item.provider,
    })),
    users,
  };
}

export async function loadAdminHistoryPageData() {
  return {
    conversations: await prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            createdAt: true,
            model: true,
            role: true,
          },
          take: 1,
        },
        user: {
          select: {
            telegramId: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  };
}

export async function loadAdminUsagePageData() {
  const usage = await prisma.usage.findMany({
    include: {
      user: {
        select: {
          telegramId: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    usage: usage.map((row) => ({
      ...row,
      cost: row.cost.toString(),
    })),
  };
}
