import { prisma } from "@/db/prisma";
import type { PromptProvider } from "@/db/repositories/prompt-repository";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const providers: PromptProvider[] = ["openai", "openrouter", "fal"];

function isPromptProvider(value: string): value is PromptProvider {
  return providers.includes(value as PromptProvider);
}

export async function updatePrompt(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const provider = String(formData.get("provider") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  const temperature = Number(formData.get("temperature"));
  const systemPrompt = String(formData.get("systemPrompt") ?? "").trim();
  const userTemplate = String(formData.get("userTemplate") ?? "").trim();
  const active = formData.get("active") === "on";

  if (
    !id ||
    !isPromptProvider(provider) ||
    !model ||
    !systemPrompt ||
    !userTemplate ||
    Number.isNaN(temperature)
  ) {
    return;
  }

  await prisma.prompt.update({
    where: { id },
    data: {
      active,
      model,
      provider,
      systemPrompt,
      temperature,
      title,
      userTemplate,
    },
  });

  revalidatePath("/admin/prompts");
}

export default async function AdminPromptsPage() {
  const prompts = await prisma.prompt.findMany({
    orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
    select: {
      active: true,
      createdAt: true,
      feature: true,
      id: true,
      model: true,
      provider: true,
      slug: true,
      systemPrompt: true,
      temperature: true,
      title: true,
      updatedAt: true,
      userTemplate: true,
      version: true,
    },
  });

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Промпты</h2>
        <p className="text-sm text-muted-foreground">
          Активные промпты выводятся кнопками в меню Telegram-бота.
        </p>
      </div>

      {prompts.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-5 text-sm text-muted-foreground">
          Промпты не найдены. Запустите{" "}
          <code className="font-mono">npm run seed</code> для добавления стартовых
          промптов.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Кнопка</th>
                <th className="px-4 py-3 font-semibold">Функция</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Провайдер</th>
                <th className="px-4 py-3 font-semibold">Модель</th>
                <th className="px-4 py-3 font-semibold">Темп.</th>
                <th className="px-4 py-3 font-semibold">Версия</th>
                <th className="px-4 py-3 font-semibold">Статус</th>
                <th className="px-4 py-3 font-semibold">Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt) => (
                <tr key={prompt.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{prompt.title}</td>
                  <td className="px-4 py-3">{prompt.feature}</td>
                  <td className="px-4 py-3 font-mono text-xs">{prompt.slug}</td>
                  <td className="px-4 py-3">{prompt.provider}</td>
                  <td className="px-4 py-3">{prompt.model}</td>
                  <td className="px-4 py-3">{prompt.temperature}</td>
                  <td className="px-4 py-3">v{prompt.version}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                      {prompt.active ? "Активен" : "Выключен"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {prompt.updatedAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <form
            action={updatePrompt}
            className="space-y-4 rounded-lg border border-border bg-white p-5"
            key={`${prompt.id}-editor`}
          >
            <input name="id" type="hidden" value={prompt.id} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{prompt.title || prompt.slug}</h3>
                <p className="text-sm text-muted-foreground">
                  {prompt.feature} · v{prompt.version}
                </p>
              </div>
              <button
                className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
                type="submit"
              >
                Сохранить
              </button>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Название кнопки</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                defaultValue={prompt.title}
                name="title"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked={prompt.active} name="active" type="checkbox" />
              <span className="font-medium">Показывать в меню бота</span>
            </label>

            <div className="grid gap-3 md:grid-cols-[160px_1fr_120px]">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Провайдер</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  defaultValue={prompt.provider}
                  name="provider"
                >
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Модель</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  defaultValue={prompt.model}
                  name="model"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Температура</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  defaultValue={prompt.temperature}
                  max="2"
                  min="0"
                  name="temperature"
                  step="0.1"
                  type="number"
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Системный промпт</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2"
                defaultValue={prompt.systemPrompt}
                name="systemPrompt"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Шаблон пользователя</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2"
                defaultValue={prompt.userTemplate}
                name="userTemplate"
              />
            </label>
          </form>
        ))}
      </div>
    </section>
  );
}
