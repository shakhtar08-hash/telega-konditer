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
import { revalidatePath } from "next/cache";
import {
  fetchInternalAdminFunnelPageData,
  postInternalAdminFunnelAction,
} from "@/features/admin/funnel/internal-admin-client";
import {
  loadAdminFunnelPageData,
  performCreateFunnelStep,
  performUpdateFunnelStep,
  type FunnelMutationInput,
} from "@/features/admin/funnel/service";
import { parseBuyButtons, parseBuyButtonsFromFormData } from "./buy-buttons-form";
import { AdminBuyButtonsEditor } from "./buy-buttons-editor";
import { AdminNextActionSelect } from "./next-action-select";
import { saveAdminImage } from "../_lib/save-admin-image";

export const dynamic = "force-dynamic";

async function parseFunnelMutationInput(
  formData: FormData,
): Promise<FunnelMutationInput | null> {
  const sortOrder = Number(formData.get("sortOrder"));
  const active = formData.get("active") === "on";
  const title = String(formData.get("title") ?? "").trim();
  const imagePath =
    (await saveAdminImage({
      entity: "funnel",
      file: (formData.get("imageFile") as File | null) ?? null,
      manualValue: String(formData.get("imagePath") ?? ""),
    })) ?? "";
  const text = String(formData.get("text") ?? "").trim();
  const nextButtonText = String(formData.get("nextButtonText") ?? "").trim();
  const nextAction = String(formData.get("nextAction") ?? "next").trim() as
    | "next"
    | "activate_promo_and_next";
  const offerButtonText = String(formData.get("offerButtonText") ?? "").trim();

  if (!title || !imagePath || !text || Number.isNaN(sortOrder)) {
    return null;
  }

  const buyButtons = parseBuyButtonsFromFormData(formData);

  return {
    active,
    buyButtons,
    firstBuyButton: buyButtons.find((button) => button.active),
    imagePath,
    nextAction,
    nextButtonText,
    offerButtonText,
    sortOrder,
    text,
    title,
  };
}

export async function updateFunnelStep(formData: FormData) {
  "use server";

  const isIngress = process.env.APP_ROLE === "ingress";
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  if (isIngress) {
    await postInternalAdminFunnelAction("updateFunnelStep", formData);
  } else {
    const input = await parseFunnelMutationInput(formData);
    if (!input) {
      return;
    }

    await performUpdateFunnelStep({ id, ...input });
  }

  revalidatePath("/admin/funnel");
}

export async function createFunnelStep(formData: FormData) {
  "use server";

  const isIngress = process.env.APP_ROLE === "ingress";
  const slug = String(formData.get("slug") ?? "").trim();

  if (!slug) {
    return;
  }

  if (isIngress) {
    await postInternalAdminFunnelAction("createFunnelStep", formData);
  } else {
    const input = await parseFunnelMutationInput(formData);
    if (!input) {
      return;
    }

    const createInput = {
      ...input,
      nextButtonText: input.nextButtonText || "Далее",
      slug,
    };

    await performCreateFunnelStep(createInput);
  }

  revalidatePath("/admin/funnel");
}

export default async function AdminFunnelPage() {
  const { steps } =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminFunnelPageData()
      : await loadAdminFunnelPageData();

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Редактирование приветствия, изображений, порядка и кнопок Telegram-воронки."
        title="Воронка"
      />
      <ChatBotSubNav />

      <form action={createFunnelStep}>
        <AdminPanel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">Создать новый шаг</h3>
              <p className="text-sm leading-6 text-[#97a4b8]">
                Добавьте новый пост воронки со своим изображением, текстом и
                кнопками.
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

          <AdminImageField
            fileName="imageFile"
            label="Путь к изображению или URL"
            placeholder="/onboarding/new-step.png"
            textName="imagePath"
          />

          <AdminField label="Текст сообщения">
            <AdminTextarea className="min-h-32" name="text" />
          </AdminField>

          <div className="grid gap-3 md:grid-cols-3">
            <AdminField label="Кнопка далее">
              <AdminInput defaultValue="Далее" name="nextButtonText" />
            </AdminField>
            <AdminField label="Действие при нажатии">
              <AdminNextActionSelect initialValue="next" />
            </AdminField>
            <AdminField label="Кнопка оффера">
              <AdminInput name="offerButtonText" />
            </AdminField>
          </div>

          <AdminBuyButtonsEditor initialButtons={[]} />
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
          {steps.map((step) => {
            const buyButtons = parseBuyButtons(step.buyButtons);

            return (
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

                  <AdminImageField
                    fileName="imageFile"
                    label="Путь к изображению или URL"
                    defaultValue={step.imagePath}
                    placeholder="/onboarding/new-step.png"
                    textName="imagePath"
                  />

                  <AdminField label="Текст сообщения">
                    <AdminTextarea
                      className="min-h-40"
                      defaultValue={step.text}
                      name="text"
                    />
                  </AdminField>

                  <div className="grid gap-3 md:grid-cols-3">
                    <AdminField label="Кнопка далее">
                      <AdminInput
                        defaultValue={step.nextButtonText}
                        name="nextButtonText"
                      />
                    </AdminField>
                    <AdminField label="Действие при нажатии">
                      <AdminNextActionSelect
                        initialValue={
                          (step.nextAction as "next" | "activate_promo_and_next") ??
                          "next"
                        }
                      />
                    </AdminField>
                    <AdminField label="Кнопка оффера">
                      <AdminInput
                        defaultValue={step.offerButtonText ?? ""}
                        name="offerButtonText"
                      />
                    </AdminField>
                  </div>

                  <AdminBuyButtonsEditor initialButtons={buyButtons} />
                </AdminPanel>
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}
