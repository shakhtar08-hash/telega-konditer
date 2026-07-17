import {
  Camera,
  ChartPie,
  Coins,
  CupSoda,
  ImageIcon,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchInternalAdminDashboardPageData } from "@/features/admin/dashboard/internal-admin-client";
import { loadAdminDashboardPageData } from "@/features/admin/dashboard/service";
import { getPlanLabel } from "@/features/subscriptions/plans";

export const dynamic = "force-dynamic";

const numberFormat = new Intl.NumberFormat("ru-RU");
const currencyFormat = new Intl.NumberFormat("ru-RU", {
  currency: "RUB",
  maximumFractionDigits: 0,
  style: "currency",
});

const activity = [210, 270, 215, 295, 235, 205, 325];
const revenueBars = [42, 52, 59, 64, 67, 74, 86];

function formatNumber(value: number) {
  return numberFormat.format(value);
}

function formatCurrency(value: number) {
  return currencyFormat.format(value);
}

function formatFeature(feature: string) {
  const normalized = feature.toLowerCase();

  if (normalized.includes("photo") || normalized.includes("image")) {
    return "Фото";
  }

  if (normalized.includes("vision") || normalized.includes("analysis")) {
    return "Анализ";
  }

  if (normalized.includes("recipe")) {
    return "Рецепт";
  }

  return "Помощник";
}

function preview(content: string) {
  return content.length > 78 ? `${content.slice(0, 78)}...` : content;
}

function MiniLineChart() {
  const points = activity
    .map((value, index) => {
      const x = 8 + index * 14;
      const y = 90 - (value / 360) * 76;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" className="h-40 w-full" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="activity-glow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7257ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7257ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M8,90 L${points} L92,92 L8,92 Z`}
        fill="url(#activity-glow)"
      />
      <polyline
        fill="none"
        points={points}
        stroke="#7257ff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function DonutChart({
  recipeCount,
  photoCount,
  analysisCount,
  otherCount,
}: {
  recipeCount: number;
  photoCount: number;
  analysisCount: number;
  otherCount: number;
}) {
  const total = Math.max(recipeCount + photoCount + analysisCount + otherCount, 1);
  const recipePercent = Math.round((recipeCount / total) * 100);
  const photoPercent = Math.round((photoCount / total) * 100);
  const analysisPercent = Math.round((analysisCount / total) * 100);
  const otherPercent = Math.max(
    100 - recipePercent - photoPercent - analysisPercent,
    0,
  );

  return (
    <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
      <div
        aria-label="Распределение генераций"
        className="size-36 rounded-full"
        style={{
          background: `conic-gradient(#35d08b 0 ${recipePercent}%, #2b91ff ${recipePercent}% ${
            recipePercent + photoPercent
          }%, #ff8a1f ${recipePercent + photoPercent}% 100%)`,
        }}
      >
        <div className="grid size-full place-items-center rounded-full p-6">
          <div className="grid size-full place-items-center rounded-full bg-[#121a27] text-center text-xs text-[#97a4b8]">
            всего
            <span className="block text-lg font-semibold text-[#eef4ff]">
              {formatNumber(total)}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <ChartLegend color="#35d08b" label="Рецепты" value={`${recipePercent}%`} />
        <ChartLegend color="#2b91ff" label="Фото" value={`${photoPercent}%`} />
        <ChartLegend
          color="#ff8a1f"
          label="Прочее"
          value={`${analysisPercent + otherPercent}%`}
        />
      </div>
    </div>
  );
}

function ChartLegend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[#97a4b8]">
        <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function RevenueChart() {
  return (
    <div className="flex h-40 items-end gap-3 pt-5">
      {revenueBars.map((height, index) => (
        <div className="flex flex-1 flex-col items-center gap-2" key={height}>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-[#7257ff] to-[#9c86ff]"
            style={{ height: `${height}%` }}
          />
          <span className="text-[10px] text-[#97a4b8]">{index + 1} июн</span>
        </div>
      ))}
    </div>
  );
}

const metricCardIcons = {
  apiCost: ChartPie,
  photos: ImageIcon,
  recipes: CupSoda,
  revenue: Coins,
  users: Users,
} as const;

export default async function AdminDashboardPage() {
  const {
    conversations,
    conversion,
    distribution,
    metricCards,
    photoStyles,
    providerUsage,
    users,
  } = process.env.APP_ROLE === "ingress"
    ? await fetchInternalAdminDashboardPageData()
    : await loadAdminDashboardPageData();

  const donutRecipe = distribution.recipes;
  const donutPhoto = distribution.photo;
  const donutAnalysis =
    distribution.analysis + distribution.consulting + distribution.content;
  const donutOther = distribution.other;

  const providerLabels: Record<string, string> = {
    kie: "KIE",
    openai: "OpenAI",
    openrouter: "OpenRouter",
  };
  const maxProviderCost = Math.max(
    ...providerUsage.map((provider) => provider.cost),
    1,
  );

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Дашборд</h2>
          <p className="mt-1 text-sm text-[#97a4b8]">
            Общая статистика вашего бота
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[#223047] bg-[#121a27] px-4 py-2 text-sm text-[#97a4b8]">
            29 мая - 4 июня 2025
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[#223047] bg-[#121a27] px-3 py-2">
            <div className="grid size-9 place-items-center rounded-full bg-accent font-semibold">
              AA
            </div>
            <div>
              <p className="text-sm font-semibold">Александра</p>
              <p className="text-xs text-[#97a4b8]">Администратор</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => {
          const Icon =
            ("key" in card && card.key
              ? metricCardIcons[
                  card.key as keyof typeof metricCardIcons
                ]
              : undefined) ?? Users;

          return (
            <Card className="min-h-28" key={card.label}>
              <div className="flex items-center gap-4">
                <div className={`grid size-11 place-items-center rounded-lg ${card.accent}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-[#97a4b8]">{card.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{card.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.8fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Активность пользователей</h3>
            <span className="rounded-md border border-[#223047] px-3 py-1 text-xs text-[#97a4b8]">
              За неделю
            </span>
          </div>
          <MiniLineChart />
        </Card>
        <Card>
          <h3 className="mb-5 font-semibold">Генерации по типам</h3>
          <DonutChart
            analysisCount={donutAnalysis}
            otherCount={donutOther}
            photoCount={donutPhoto}
            recipeCount={donutRecipe}
          />
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Выручка</h3>
            <span className="rounded-md border border-[#223047] px-3 py-1 text-xs text-[#97a4b8]">
              За неделю
            </span>
          </div>
          <RevenueChart />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <Card>
          <h3 className="mb-4 font-semibold">Последние пользователи</h3>
          <div className="space-y-3">
            {users.map((user) => (
              <div
                className="grid gap-3 rounded-md border border-[#223047]/70 bg-[#192334]/55 p-3 text-sm md:grid-cols-[1fr_110px_90px_110px]"
                key={user.id}
              >
                <div>
                  <p className="font-medium">
                    {user.name ?? user.username ?? "Без имени"}
                  </p>
                  <p className="text-xs text-[#97a4b8]">
                    @{user.username ?? user.telegramId}
                  </p>
                </div>
                <span className="text-[#97a4b8]">{getPlanLabel(user.plan)}</span>
                <span>{user.credits} фото</span>
                <span className="text-xs text-[#97a4b8]">
                  {new Intl.DateTimeFormat("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: "Europe/Moscow",
                    year: "numeric",
                  }).format(user.createdAt)}
                </span>
              </div>
            ))}
          </div>
          <a className="mt-4 inline-block text-sm text-[#9c86ff]" href="/admin/users">
            Показать всех пользователей →
          </a>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Последние диалоги</h3>
            <a
              className="rounded-md border border-[#223047] px-3 py-1 text-xs text-[#97a4b8]"
              href="/admin/history"
            >
              Открыть все диалоги
            </a>
          </div>
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                className="flex items-start gap-3 rounded-md bg-[#192334]/55 p-3"
                key={conversation.id}
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2b91ff]">
                  <MessageCircle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">
                      {conversation.user.name ??
                        conversation.user.username ??
                        conversation.user.telegramId}
                    </p>
                    <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-medium">
                      {formatFeature(conversation.feature)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#97a4b8]">
                    {preview(conversation.messages[0]?.content ?? "Нет сообщений")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_0.7fr_1fr]">
        <Card>
          <h3 className="mb-4 font-semibold">Использование API</h3>
          {providerUsage.length === 0 ? (
            <p className="text-sm text-[#97a4b8]">Нет данных по провайдерам</p>
          ) : (
            providerUsage.map((provider) => {
              const percent = Math.round((provider.cost / maxProviderCost) * 100);
              const label = providerLabels[provider.provider] ?? provider.provider;
              return (
                <ApiUsage
                  key={provider.provider}
                  label={label}
                  percent={percent}
                  value={`$${provider.cost.toFixed(2)} · ${provider.count} вызовов`}
                />
              );
            })
          )}
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Конверсия в оплату</h3>
          <p className="text-3xl font-semibold">{conversion.toFixed(1)}%</p>
          <p className="mt-1 text-sm text-[#35d08b]">+2.4% за неделю ↗</p>
          <Sparkles className="mt-6 size-10 text-[#35d08b]" />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Популярные стили фото</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {photoStyles.map((style, index) => (
              <div className="space-y-2" key={style.id}>
                <div className="grid aspect-[4/3] place-items-center rounded-md bg-[#192334] text-[#f5a524]">
                  {style.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-full w-full rounded-md object-cover"
                      src={style.preview}
                    />
                  ) : (
                    <Camera className="size-5" />
                  )}
                </div>
                <p className="truncate text-xs">{style.name}</p>
                <p className="text-[10px] text-[#97a4b8]">
                  {[28, 17, 12, 8, 6][index] ?? 5}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function ApiUsage({
  label,
  percent,
  value,
}: {
  label: string;
  percent: number;
  value: string;
}) {
  return (
    <div className="mb-4 space-y-2 last:mb-0">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-[#97a4b8]">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[#192334]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2b91ff] to-[#35d08b]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
