import { AdminPageHeader } from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminTextarea,
  AdminToggle,
} from "@/components/admin/form";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function updateFunnelStep(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const sortOrder = Number(formData.get("sortOrder"));
  const active = formData.get("active") === "on";
  const title = String(formData.get("title") ?? "").trim();
  const imagePath = String(formData.get("imagePath") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const nextButtonText = String(formData.get("nextButtonText") ?? "").trim();
  const buyButtonText = String(formData.get("buyButtonText") ?? "").trim();
  const buyButtonUrl = String(formData.get("buyButtonUrl") ?? "").trim();
  const offerButtonText = String(formData.get("offerButtonText") ?? "").trim();

  if (
    !id ||
    !title ||
    !imagePath ||
    !text ||
    !nextButtonText ||
    !buyButtonText ||
    Number.isNaN(sortOrder)
  ) {
    return;
  }

  await prisma.funnelStep.update({
    where: { id },
    data: {
      active,
      buyButtonText,
      buyButtonUrl: buyButtonUrl || null,
      imagePath,
      nextButtonText,
      offerButtonText: offerButtonText || null,
      sortOrder,
      text,
      title,
    },
  });

  revalidatePath("/admin/funnel");
}

export async function createFunnelStep(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder"));
  const title = String(formData.get("title") ?? "").trim();
  const imagePath = String(formData.get("imagePath") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const nextButtonText = String(formData.get("nextButtonText") ?? "").trim() || "Далее";
  const buyButtonText = String(formData.get("buyButtonText") ?? "").trim() || "Купить";
  const buyButtonUrl = String(formData.get("buyButtonUrl") ?? "").trim();
  const offerButtonText = String(formData.get("offerButtonText") ?? "").trim();

  if (!slug || !title || !imagePath || !text || Number.isNaN(sortOrder)) {
    return;
  }

  await prisma.funnelStep.create({
    data: {
      active: true,
      buyButtonText,
      buyButtonUrl: buyButtonUrl || null,
      imagePath,
      nextButtonText,
      offerButtonText: offerButtonText || null,
      slug,
      sortOrder,
      text,
      title,
    },
  });

  revalidatePath("/admin/funnel");
}

export default async function AdminFunnelPage() {
  const steps = await prisma.funnelStep.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      active: true,
      buyButtonText: true,
      buyButtonUrl: true,
      id: true,
      imagePath: true,
      nextButtonText: true,
      offerButtonText: true,
      slug: true,
      sortOrder: true,
      text: true,
      title: true,
    },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Редактирование приветствия, изображений, порядка и кнопок Telegram-воронки."
        title="Воронка"
      />

      <form action={createFunnelStep}>
        <AdminPanel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">Создать новый шаг</h3>
              <p className="text-sm leading-6 text-[#97a4b8]">
                Добавьте новый пост воронки со своим изображением, текстом и
                кнопками. URL покупки можно оставить пустым, тогда бот построит
                ссылку оплаты автоматически.
              </p>
            </div>
            <AdminButton type="submit">Создать</AdminButton>
          </div>

          <div className="grid gap-3 md:grid-cols-[120px_1fr_1fr]">
            <AdminField label="Порядок">
              <AdminInput defaultValue={steps.length} name="sortOrder" type="number" />
            </AdminField>
            <AdminField label="Slug">
              <AdminInput name="slug" placeholder="new-step" />
            </AdminField>
            <AdminField label="Заголовок">
              <AdminInput name="title" placeholder="Новый шаг воронки" />
            </AdminField>
          </div>

          <AdminField label="Путь к изображению или URL">
            <AdminInput name="imagePath" placeholder="/onboarding/new-step.png" />
          </AdminField>

          <AdminField label="Текст сообщения">
            <AdminTextarea className="min-h-32" name="text" />
          </AdminField>

          <div className="grid gap-3 md:grid-cols-4">
            <AdminField label="Кнопка далее">
              <AdminInput defaultValue="Далее" name="nextButtonText" />
            </AdminField>
            <AdminField label="Кнопка покупки">
              <AdminInput defaultValue="Купить" name="buyButtonText" />
            </AdminField>
            <AdminField label="Кнопка оффера">
              <AdminInput name="offerButtonText" />
            </AdminField>
            <AdminField
              hint="Поддерживает {{baseUrl}} и {{telegramId}}."
              label="Свой URL покупки"
            >
              <AdminInput
                name="buyButtonUrl"
                placeholder="{{baseUrl}}/pay?telegramId={{telegramId}}"
              />
            </AdminField>
          </div>
        </AdminPanel>
      </form>

      {steps.length === 0 ? (
        <AdminPanel className="text-sm text-[#97a4b8]">
          Шаги воронки не найдены. Запустите{" "}
          <code className="font-mono text-[#dbe3ef]">npm run seed</code>, чтобы
          создать воронку по умолчанию.
        </AdminPanel>
      ) : (
        <div className="grid gap-4">
          {steps.map((step) => (
            <form action={updateFunnelStep} key={step.id}>
              <AdminPanel className="space-y-4">
                <input name="id" type="hidden" value={step.id} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#f4f7fb]">{step.title}</h3>
                    <p className="font-mono text-xs text-[#97a4b8]">{step.slug}</p>
                  </div>
                  <AdminButton type="submit">Сохранить</AdminButton>
                </div>

                <div className="grid gap-3 md:grid-cols-[120px_1fr_180px]">
                  <AdminField label="Порядок">
                    <AdminInput
                      defaultValue={step.sortOrder}
                      name="sortOrder"
                      type="number"
                    />
                  </AdminField>
                  <AdminField label="Заголовок">
                    <AdminInput defaultValue={step.title} name="title" />
                  </AdminField>
                  <div className="flex items-end pb-2">
                    <AdminToggle defaultChecked={step.active} name="active">
                      Активен
                    </AdminToggle>
                  </div>
                </div>

                <AdminField label="Путь к изображению или URL">
                  <AdminInput defaultValue={step.imagePath} name="imagePath" />
                </AdminField>

                <AdminField label="Текст сообщения">
                  <AdminTextarea
                    className="min-h-40"
                    defaultValue={step.text}
                    name="text"
                  />
                </AdminField>

                <div className="grid gap-3 md:grid-cols-4">
                  <AdminField label="Кнопка далее">
                    <AdminInput
                      defaultValue={step.nextButtonText}
                      name="nextButtonText"
                    />
                  </AdminField>
                  <AdminField label="Кнопка покупки">
                    <AdminInput
                      defaultValue={step.buyButtonText}
                      name="buyButtonText"
                    />
                  </AdminField>
                  <AdminField label="Кнопка оффера">
                    <AdminInput
                      defaultValue={step.offerButtonText ?? ""}
                      name="offerButtonText"
                    />
                  </AdminField>
                  <AdminField
                    hint="Можно оставить пустым для стандартной оплаты."
                    label="Свой URL покупки"
                  >
                    <AdminInput
                      defaultValue={step.buyButtonUrl ?? ""}
                      name="buyButtonUrl"
                      placeholder="{{baseUrl}}/pay?telegramId={{telegramId}}"
                    />
                  </AdminField>
                </div>
              </AdminPanel>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
