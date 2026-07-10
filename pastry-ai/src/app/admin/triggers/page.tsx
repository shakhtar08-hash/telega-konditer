import { Plus, Save, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import {
  AdminButton,
  AdminField,
  AdminImageField,
  AdminInput,
  AdminPanel,
  AdminTextarea,
  AdminToggle,
} from "@/components/admin/form";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

async function parseTargetTariffs(formData: FormData, tariffs: Array<{ slug: string }>) {
  const targetPlans: string[] = [];
  for (const tariff of tariffs) {
    if (formData.get(`target_${tariff.slug}`) === "on") {
      targetPlans.push(tariff.slug);
    }
  }
  return targetPlans;
}

export async function createTriggerMessage(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const delayMinutes = Number(formData.get("delayMinutes"));
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  if (!slug || !title || !text || Number.isNaN(delayMinutes)) return;

  const tariffs = await prisma.tariffPlan.findMany({ select: { slug: true } });
  const targetPlans = await parseTargetTariffs(formData, tariffs);

  if (targetPlans.length === 0) return;

  const duplicate = await prisma.triggerMessage.findFirst({
    where: { slug, delayMinutes },
    select: { id: true },
  });

  if (duplicate) {
    redirect(`/admin/triggers?error=duplicate-delay&slug=${encodeURIComponent(slug)}&delayMinutes=${delayMinutes}`);
  }

  await prisma.triggerMessage.create({
    data: { slug, title, text, imageUrl, delayMinutes, targetPlans, active: true },
  });

  revalidatePath("/admin/triggers");
}

export async function updateTriggerMessage(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const delayMinutes = Number(formData.get("delayMinutes"));
  const active = formData.get("active") === "on";
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  if (!id || !title || !text || Number.isNaN(delayMinutes)) return;

  const tariffs = await prisma.tariffPlan.findMany({ select: { slug: true } });
  const targetPlans = await parseTargetTariffs(formData, tariffs);

  if (targetPlans.length === 0) return;

  const duplicate = await prisma.triggerMessage.findFirst({
    where: { slug, delayMinutes, NOT: { id } },
    select: { id: true },
  });

  if (duplicate) {
    redirect(`/admin/triggers?error=duplicate-delay&slug=${encodeURIComponent(slug)}&delayMinutes=${delayMinutes}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.triggerMessage.update({
      where: { id },
      data: { title, text, imageUrl, delayMinutes, active, targetPlans },
    });

    const unsentRows = await tx.scheduledMessage.findMany({
      where: { triggerMessageId: id, sentAt: null },
      select: { id: true, triggeredAt: true },
    });

    for (const row of unsentRows) {
      await tx.scheduledMessage.update({
        where: { id: row.id },
        data: {
          text,
          imageUrl,
          sendAt: new Date(row.triggeredAt.getTime() + delayMinutes * 60 * 1000),
        },
      });
    }
  });

  revalidatePath("/admin/triggers");
}

export async function deleteTriggerMessage(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.$transaction([
    prisma.scheduledMessage.deleteMany({
      where: { triggerMessageId: id, sentAt: null },
    }),
    prisma.triggerMessage.delete({ where: { id } }),
  ]);

  revalidatePath("/admin/triggers");
}

export default async function AdminTriggersPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; slug?: string; delayMinutes?: string }>;
}) {
  const [triggers, tariffs] = await Promise.all([
    prisma.triggerMessage.findMany({ orderBy: [{ slug: "asc" }, { delayMinutes: "asc" }] }),
    prisma.tariffPlan.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error = resolvedSearchParams?.error ?? "";
  const errorSlug = resolvedSearchParams?.slug ?? "";
  const errorDelayMinutes = resolvedSearchParams?.delayMinutes ?? "";

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <AdminPageHeader
          description="Автоматические сообщения, которые бот отправляет через заданное время после события."
          title="Триггерные сообщения"
        />
        <div className="rounded-lg border border-[#223047] bg-[#121a27] px-4 py-2 text-sm text-[#97a4b8]">
          Изменения применяются после сохранения формы
        </div>
      </header>

      {error === "duplicate-delay" ? (
        <div className="rounded-lg border border-[#7f1d1d] bg-[#2a1218] px-4 py-3 text-sm text-[#fecaca]">
          В правиле <strong>{errorSlug}</strong> уже есть сообщение с задержкой <strong>{errorDelayMinutes}</strong> мин. Укажите другую задержку.
        </div>
      ) : null}

      <ChatBotSubNav />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.7fr]">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <AdminPanel className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#f4f7fb]">Триггеры</h3>
                <p className="mt-1 text-sm text-[#97a4b8]">
                  Правила автоматической отправки сообщений.
                </p>
              </div>
              <span className="rounded-md border border-[#2a3a55] px-2 py-1 text-xs text-[#97a4b8]">
                {triggers.length}
              </span>
            </div>

            <div className="space-y-2">
              {triggers.map((trigger) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-[#223047] bg-[#0d1522] p-3"
                  key={trigger.id}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#f4f7fb]">
                      {trigger.title}
                    </p>
                    <p className="truncate text-xs text-[#97a4b8]">
                      {trigger.slug} · {trigger.delayMinutes} мин ·{" "}
                      {(trigger.targetPlans as string[]).join(", ")}
                    </p>
                  </div>
                  <span className="text-right text-[#7f8da3]">›</span>
                </div>
              ))}
            </div>

            <form action={createTriggerMessage} className="space-y-3 border-t border-[#223047] pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#f4f7fb]">
                <Plus className="size-4 text-[#9c86ff]" />
                Создать триггер
              </div>
              <AdminField label="Slug">
                <AdminInput name="slug" placeholder="after-start" />
              </AdminField>
              <AdminField label="Название">
                <AdminInput name="title" placeholder="После /start" />
              </AdminField>
              <AdminField label="Текст сообщения">
                <AdminTextarea
                  className="min-h-24"
                  name="text"
                  placeholder="Текст, который получит пользователь..."
                />
              </AdminField>
              <AdminImageField
                fileName="imageFile"
                label="Изображение"
                placeholder="/uploads/admin/triggers/example.webp или https://..."
                textName="imageUrl"
              />
              <AdminField label="Задержка (минуты)">
                <AdminInput
                  defaultValue={15}
                  name="delayMinutes"
                  type="number"
                />
              </AdminField>
              <fieldset className="space-y-1">
                <legend className="text-sm font-medium text-[#f4f7fb]">Тарифы</legend>
                <div className="flex flex-wrap gap-4">
                  {tariffs.map((tariff) => (
                    <label
                      className="flex items-center gap-2 text-sm text-[#97a4b8]"
                      key={tariff.slug}
                    >
                      <input name={`target_${tariff.slug}`} type="checkbox" />
                      {tariff.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <AdminButton type="submit">Создать триггер</AdminButton>
            </form>
          </AdminPanel>

          <div className="space-y-4">
            {triggers.map((trigger) => {
              const plans = trigger.targetPlans as string[];

              return (
                <form action={updateTriggerMessage} key={`${trigger.id}-edit`}>
                  <AdminPanel className="space-y-4">
                    <input name="id" type="hidden" value={trigger.id} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#f4f7fb]">
                          Редактирование
                        </h3>
                        <p className="text-sm text-[#97a4b8]">
                          {trigger.slug}
                        </p>
                      </div>
                      <AdminButton type="submit">
                        <span className="inline-flex items-center gap-2">
                          <Save className="size-4" />
                          Сохранить
                        </span>
                      </AdminButton>
                    </div>

                    <AdminField label="Название">
                      <AdminInput defaultValue={trigger.title} name="title" />
                    </AdminField>
                    <AdminField label="Текст сообщения">
                      <AdminTextarea
                        className="min-h-24"
                        defaultValue={trigger.text}
                        name="text"
                      />
                    </AdminField>
                    <AdminImageField
                      defaultValue={trigger.imageUrl ?? ""}
                      fileName="imageFile"
                      label="Изображение"
                      placeholder="/uploads/admin/triggers/example.webp или https://..."
                      textName="imageUrl"
                    />
                    <AdminField label="Задержка (минуты)">
                      <AdminInput
                        defaultValue={trigger.delayMinutes}
                        name="delayMinutes"
                        type="number"
                      />
                    </AdminField>
                    <fieldset className="space-y-1">
                      <legend className="text-sm font-medium text-[#f4f7fb]">Тарифы</legend>
                      <div className="flex flex-wrap gap-4">
                        {tariffs.map((tariff) => (
                          <label
                            className="flex items-center gap-2 text-sm text-[#97a4b8]"
                            key={tariff.slug}
                          >
                            <input
                              defaultChecked={plans.includes(tariff.slug)}
                              name={`target_${tariff.slug}`}
                              type="checkbox"
                            />
                            {tariff.name}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <AdminToggle defaultChecked={trigger.active} name="active">
                        Активен
                      </AdminToggle>
                      <button
                        formAction={deleteTriggerMessage}
                        className="inline-flex items-center gap-2 rounded-md border border-[#7f1d1d] bg-[#2a1218] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[#3a1720]"
                        type="submit"
                      >
                        <Trash2 className="size-4" />
                        Удалить триггер
                      </button>
                    </div>
                  </AdminPanel>
                </form>
              );
            })}
          </div>
        </div>

        <AdminPanel className="space-y-5">
          <div>
            <h3 className="font-semibold text-[#f4f7fb]">Как это работает</h3>
            <p className="mt-1 text-sm leading-6 text-[#97a4b8]">
              Бот отслеживает события (первый запуск, оплата) и через
              заданное количество минут отправляет пользователю сообщение.
            </p>
          </div>
          <div className="space-y-2 text-sm text-[#97a4b8]">
            <p><strong className="text-[#d8d2ff]">Slug</strong> — уникальный идентификатор, связывает событие в коде с правилом.</p>
            <p><strong className="text-[#d8d2ff]">Тарифы</strong> — пользователи каких тарифов получат это сообщение.</p>
            <p><strong className="text-[#d8d2ff]">Задержка</strong> — через сколько минут после события отправить.</p>
            <p>Каждую минуту сервер проверяет, не пора ли отправить сообщения.</p>
          </div>
        </AdminPanel>
      </div>
    </section>
  );
}
