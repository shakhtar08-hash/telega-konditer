import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "@/components/admin/form";
import { AdminPageHeader } from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";
import type { PromptProvider } from "@/db/repositories/prompt-repository";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const providers: PromptProvider[] = ["openai", "openrouter"];

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
      <AdminPageHeader
        description="Активные промты выводятся кнопками в меню Telegram-бота. Здесь можно менять название кнопки, модель, провайдера и текст инструкций."
        title="Промты"
      />

      {prompts.length === 0 ? (
        <AdminPanel className="text-sm text-[#97a4b8]">
          Промты не найдены. Запустите{" "}
          <code className="font-mono text-[#dbe3ef]">npm run seed</code>, чтобы
          добавить стартовые промты.
        </AdminPanel>
      ) : (
        <AdminPanel className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-[#192334] text-xs uppercase text-[#97a4b8]">
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
                <tr className="border-t border-[#223047]/80" key={prompt.id}>
                  <td className="px-4 py-3 font-medium text-[#f4f7fb]">
                    {prompt.title}
                  </td>
                  <td className="px-4 py-3 text-[#dbe3ef]">{prompt.feature}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#97a4b8]">
                    {prompt.slug}
                  </td>
                  <td className="px-4 py-3 text-[#dbe3ef]">{prompt.provider}</td>
                  <td className="px-4 py-3 text-[#dbe3ef]">{prompt.model}</td>
                  <td className="px-4 py-3 text-[#dbe3ef]">{prompt.temperature}</td>
                  <td className="px-4 py-3 text-[#dbe3ef]">v{prompt.version}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#192334] px-2 py-1 text-xs font-medium text-[#dbe3ef]">
                      {prompt.active ? "Активен" : "Выключен"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#97a4b8]">
                    {prompt.updatedAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      )}

      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <form action={updatePrompt} key={`${prompt.id}-editor`}>
            <AdminPanel className="space-y-4">
              <input name="id" type="hidden" value={prompt.id} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#f4f7fb]">
                    {prompt.title || prompt.slug}
                  </h3>
                  <p className="text-sm text-[#97a4b8]">
                    {prompt.feature} · v{prompt.version}
                  </p>
                </div>
                <AdminButton type="submit">Сохранить</AdminButton>
              </div>

              <AdminField label="Название кнопки">
                <AdminInput defaultValue={prompt.title} name="title" />
              </AdminField>

              <AdminToggle defaultChecked={prompt.active} name="active">
                Показывать в меню бота
              </AdminToggle>

              <div className="grid gap-3 md:grid-cols-[180px_1fr_140px]">
                <AdminField label="Провайдер">
                  <AdminSelect defaultValue={prompt.provider} name="provider">
                    {providers.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
                <AdminField label="Модель">
                  <AdminInput defaultValue={prompt.model} name="model" />
                </AdminField>
                <AdminField label="Температура">
                  <AdminInput
                    defaultValue={prompt.temperature}
                    max="2"
                    min="0"
                    name="temperature"
                    step="0.1"
                    type="number"
                  />
                </AdminField>
              </div>

              <AdminField label="Системный промт">
                <AdminTextarea
                  className="min-h-32"
                  defaultValue={prompt.systemPrompt}
                  name="systemPrompt"
                />
              </AdminField>
              <AdminField label="Шаблон пользователя">
                <AdminTextarea
                  className="min-h-28"
                  defaultValue={prompt.userTemplate}
                  name="userTemplate"
                />
              </AdminField>
            </AdminPanel>
          </form>
        ))}
      </div>
    </section>
  );
}
