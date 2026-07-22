import { Plus, Save, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import {
  AdminButton,
  AdminField,
  AdminImageField,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "@/components/admin/form";
import {
  fetchInternalAdminChatBotPageData,
  postInternalAdminChatBotAction,
} from "@/features/admin/chat-bot/internal-admin-client";
import {
  loadAdminChatBotPageData,
  performCreateBotMenuButton,
  performDeleteBotMenuButton,
  performUpdateBotMenuButton,
  performUpdateMenuIntro,
  type BotMenuActionType,
  type BotMenuButtonMutationInput,
} from "@/features/admin/chat-bot/service";
import { saveAdminImage } from "../_lib/save-admin-image";

export const dynamic = "force-dynamic";

type ActionType = "PROMPT" | "URL" | "SCENARIO";

function parsePromptTarget(value: string) {
  const [feature, slug] = value.split("::");

  return feature && slug ? { feature, slug } : { feature: "", slug: "" };
}

function promptTargetValue(feature?: string | null, slug?: string | null) {
  return feature && slug ? `${feature}::${slug}` : "";
}

function buildPromptOptions(
  prompts: Array<{ feature: string; slug: string; title: string }>,
) {
  const uniqueTargets = new Set<string>();

  return prompts.flatMap((prompt) => {
    const value = promptTargetValue(prompt.feature, prompt.slug);

    if (!value || uniqueTargets.has(value)) {
      return [];
    }

    uniqueTargets.add(value);

    return [
      {
        label: `${prompt.title || prompt.slug} · ${prompt.feature}`,
        value,
      },
    ];
  });
}

function buildScenarioOptions(
  scenarios: Array<{ id: string; name: string }>,
) {
  return scenarios.map((scenario) => ({
    label: scenario.name,
    value: scenario.id,
  }));
}

function isActionType(value: string): value is ActionType {
  return value === "PROMPT" || value === "URL" || value === "SCENARIO";
}

async function parseBotMenuButtonMutationInput(
  formData: FormData,
): Promise<BotMenuButtonMutationInput | null> {
  const label = String(formData.get("label") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const instructionText = String(formData.get("instructionText") ?? "").trim();
  const processingText = String(formData.get("processingText") ?? "").trim();
  const previewImageUrl = await saveAdminImage({
    entity: "chat-bot",
    file: (formData.get("previewImageFile") as File | null) ?? null,
    manualValue: String(formData.get("previewImageUrl") ?? ""),
  });
  const fullWidth = formData.get("fullWidth") === "on";
  const actionTypeRaw = String(formData.get("actionType") ?? "");
  const promptTarget = String(formData.get("promptTarget") ?? "");
  const scenarioId = String(formData.get("scenarioId") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder"));

  if (!label || !isActionType(actionTypeRaw) || Number.isNaN(sortOrder)) {
    return null;
  }

  const target = parsePromptTarget(promptTarget);

  return {
    actionType: actionTypeRaw as BotMenuActionType,
    active: formData.get("active") === "on",
    description,
    emoji,
    fullWidth,
    instructionText: instructionText || null,
    label,
    previewImageUrl,
    processingText: processingText || null,
    promptFeature: actionTypeRaw === "PROMPT" ? target.feature || null : null,
    promptSlug: actionTypeRaw === "PROMPT" ? target.slug || null : null,
    scenarioId: actionTypeRaw === "SCENARIO" ? scenarioId || null : null,
    sortOrder,
    url: actionTypeRaw === "URL" ? url || null : null,
  };
}

export async function createBotMenuButton(formData: FormData) {
  "use server";

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminChatBotAction("createBotMenuButton", formData);
  } else {
    const input = await parseBotMenuButtonMutationInput(formData);
    if (!input) {
      return;
    }

    await performCreateBotMenuButton(input);
  }

  revalidatePath("/admin/chat-bot");
}

export async function updateBotMenuButton(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminChatBotAction("updateBotMenuButton", formData);
  } else {
    const input = await parseBotMenuButtonMutationInput(formData);
    if (!input) {
      return;
    }

    await performUpdateBotMenuButton({ id, ...input });
  }

  revalidatePath("/admin/chat-bot");
}

export async function deleteBotMenuButton(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminChatBotAction("deleteBotMenuButton", { id });
  } else {
    await performDeleteBotMenuButton(id);
  }

  revalidatePath("/admin/chat-bot");
}

export async function updateMenuIntro(formData: FormData) {
  "use server";

  const text = String(formData.get("text") ?? "");

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminChatBotAction("updateMenuIntro", { text });
  } else {
    await performUpdateMenuIntro(text);
  }

  revalidatePath("/admin/chat-bot");
}

export default async function AdminChatBotPage() {
  const { buttons, prompts, scenarios, menuIntro } =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminChatBotPageData()
      : await loadAdminChatBotPageData();

  const promptOptions = buildPromptOptions(prompts);
  const scenarioOptions = buildScenarioOptions(scenarios);
  const activeButtons = buttons.filter((button) => button.active);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <AdminPageHeader
          description="Управление кнопками главного меню Telegram-бота: порядок, текст, видимость и действие при нажатии."
          title="Чат-бот"
        />
        <div className="rounded-lg border border-[#223047] bg-[#121a27] px-4 py-2 text-sm text-[#97a4b8]">
          Изменения применяются после сохранения формы
        </div>
      </header>

      <ChatBotSubNav />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.7fr]">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <AdminPanel className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#f4f7fb]">Меню бота</h3>
                <p className="mt-1 text-sm text-[#97a4b8]">
                  Кнопки, которые видит пользователь после получения доступа.
                </p>
              </div>
              <span className="rounded-md border border-[#2a3a55] px-2 py-1 text-xs text-[#97a4b8]">
                {activeButtons.length} из {buttons.length}
              </span>
            </div>

            <div className="space-y-2">
              {buttons.map((button) => (
                <div
                  className="grid grid-cols-[28px_1fr_28px] items-center gap-3 rounded-lg border border-[#223047] bg-[#0d1522] p-3"
                  key={button.id}
                >
                  <span className="grid size-7 place-items-center rounded-md bg-[#192334] text-xs text-[#97a4b8]">
                    {button.sortOrder}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#f4f7fb]">
                      {[button.emoji, button.label].filter(Boolean).join(" ")}
                    </p>
                    <p className="truncate text-xs text-[#97a4b8]">
                      {button.actionType === "URL"
                        ? button.url || "Ссылка не задана"
                        : button.actionType === "SCENARIO"
                          ? button.scenarioName || "Сценарий не выбран"
                          : `${button.promptFeature ?? "prompt"} / ${
                              button.promptSlug ?? "slug"
                            }`}
                    </p>
                  </div>
                  <span className="text-right text-[#7f8da3]">›</span>
                </div>
              ))}
            </div>

            <form action={createBotMenuButton} className="space-y-3 border-t border-[#223047] pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#f4f7fb]">
                <Plus className="size-4 text-[#9c86ff]" />
                Добавить кнопку
              </div>
              <div className="grid gap-3 sm:grid-cols-[90px_1fr_90px]">
                <AdminField label="Эмодзи">
                  <AdminInput name="emoji" placeholder="🍰" />
                </AdminField>
                <AdminField label="Название">
                  <AdminInput name="label" placeholder="Создать рецепт" />
                </AdminField>
                <AdminField label="Порядок">
                  <AdminInput
                    defaultValue={buttons.length + 1}
                    name="sortOrder"
                    type="number"
                  />
                </AdminField>
              </div>
              <AdminField label="Текст ответа бота">
                <AdminTextarea
                  className="min-h-20"
                  name="description"
                  placeholder="Напишите, что бот ответит пользователю при нажатии на эту кнопку"
                />
              </AdminField>
              <AdminField label="Текст инструкции (instructionText)">
                <AdminTextarea
                  className="min-h-16"
                  name="instructionText"
                  placeholder="Текст сразу после нажатия на кнопку. Если пусто — используется Текст ответа бота"
                />
              </AdminField>
              <AdminField label="Текст обработки (processingText)">
                <AdminTextarea
                  className="min-h-16"
                  name="processingText"
                  placeholder="Сообщение после отправки запроса пользователем. Если пусто — используется стандартный текст функции"
                />
              </AdminField>
              <AdminImageField
                fileName="previewImageFile"
                label="Фото-превью (previewImageUrl)"
                placeholder="/images/preview.jpg или https://..."
                textName="previewImageUrl"
              />
              <div className="flex flex-wrap items-center gap-4 py-2">
                <AdminToggle name="fullWidth">
                  Широкая кнопка (на всю строку)
                </AdminToggle>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Действие">
                  <AdminSelect defaultValue="PROMPT" name="actionType">
                    <option value="PROMPT">Открыть промт</option>
                    <option value="SCENARIO">Запустить сценарий</option>
                    <option value="URL">Открыть ссылку</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Промт">
                  <AdminSelect name="promptTarget">
                    <option value="">Выберите промт</option>
                    {promptOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
              </div>
              <AdminField label="Сценарий">
                <AdminSelect name="scenarioId">
                  <option value="">Выберите сценарий</option>
                  {scenarioOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>
              <AdminField label="URL для ссылки">
                <AdminInput name="url" placeholder="https://example.com" />
              </AdminField>
              <AdminButton type="submit">Создать кнопку</AdminButton>
            </form>
          </AdminPanel>

          <div className="space-y-4">
            {buttons.map((button) => (
              <form action={updateBotMenuButton} key={`${button.id}-edit`}>
                <AdminPanel className="space-y-4">
                  <input name="id" type="hidden" value={button.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#f4f7fb]">
                        Редактирование кнопки
                      </h3>
                      <p className="text-sm text-[#97a4b8]">
                        {[button.emoji, button.label].filter(Boolean).join(" ")}
                      </p>
                    </div>
                    <AdminButton type="submit">
                      <span className="inline-flex items-center gap-2">
                        <Save className="size-4" />
                        Сохранить
                      </span>
                    </AdminButton>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[90px_1fr_90px]">
                    <AdminField label="Эмодзи">
                      <AdminInput defaultValue={button.emoji} name="emoji" />
                    </AdminField>
                    <AdminField label="Название кнопки">
                      <AdminInput defaultValue={button.label} name="label" />
                    </AdminField>
                    <AdminField label="Порядок">
                      <AdminInput
                        defaultValue={button.sortOrder}
                        name="sortOrder"
                        type="number"
                      />
                    </AdminField>
                  </div>

                  <AdminField label="Текст ответа бота">
                    <AdminTextarea
                      className="min-h-20"
                      defaultValue={button.description}
                      name="description"
                    />
                  </AdminField>

                  <AdminField label="Текст инструкции (instructionText)">
                    <AdminTextarea
                      className="min-h-16"
                      defaultValue={button.instructionText ?? ""}
                      name="instructionText"
                      placeholder="Текст сразу после нажатия на кнопку. Если пусто — используется Текст ответа бота"
                    />
                  </AdminField>
                  <AdminField label="Текст обработки (processingText)">
                    <AdminTextarea
                      className="min-h-16"
                      defaultValue={button.processingText ?? ""}
                      name="processingText"
                      placeholder="Сообщение после отправки запроса пользователем"
                    />
                  </AdminField>
                  <AdminImageField
                    defaultValue={button.previewImageUrl ?? ""}
                    fileName="previewImageFile"
                    label="Фото-превью (previewImageUrl)"
                    placeholder="/images/preview.jpg или https://..."
                    textName="previewImageUrl"
                  />

                  <div className="flex flex-wrap items-center gap-4 py-2">
                    <AdminToggle defaultChecked={button.fullWidth} name="fullWidth">
                      Широкая кнопка (на всю строку)
                    </AdminToggle>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <AdminField label="Действие при нажатии">
                      <AdminSelect
                        defaultValue={button.actionType}
                        name="actionType"
                      >
                        <option value="PROMPT">Открыть промт</option>
                        <option value="SCENARIO">Запустить сценарий</option>
                        <option value="URL">Открыть ссылку</option>
                      </AdminSelect>
                    </AdminField>
                    <AdminField label="Выберите промт">
                      <AdminSelect
                        defaultValue={promptTargetValue(
                          button.promptFeature,
                          button.promptSlug,
                        )}
                        name="promptTarget"
                      >
                        <option value="">Не выбран</option>
                        {promptOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </AdminSelect>
                    </AdminField>
                  </div>

                  <AdminField label="Сценарий">
                    <AdminSelect
                      defaultValue={button.scenarioId ?? ""}
                      name="scenarioId"
                    >
                      <option value="">Не выбран</option>
                      {scenarioOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>

                  <AdminField label="URL для действия «Открыть ссылку»">
                    <AdminInput
                      defaultValue={button.url ?? ""}
                      name="url"
                      placeholder="https://example.com"
                    />
                  </AdminField>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <AdminToggle defaultChecked={button.active} name="active">
                      Показывать кнопку
                    </AdminToggle>
                    <button
                      formAction={deleteBotMenuButton}
                      className="inline-flex items-center gap-2 rounded-md border border-[#7f1d1d] bg-[#2a1218] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[#3a1720]"
                      type="submit"
                    >
                      <Trash2 className="size-4" />
                      Удалить кнопку
                    </button>
                  </div>
                </AdminPanel>
              </form>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <form action={updateMenuIntro}>
            <AdminPanel className="space-y-4">
              <div>
                <h3 className="font-semibold text-[#f4f7fb]">Текст над меню</h3>
                <p className="mt-1 text-sm text-[#97a4b8]">
                  Сообщение, которое видит пользователь при открытии меню.
                </p>
              </div>
              <AdminTextarea
                className="min-h-40"
                defaultValue={menuIntro?.text ?? ""}
                name="text"
              />
              <AdminButton type="submit">Сохранить текст</AdminButton>
            </AdminPanel>
          </form>

          <AdminPanel className="space-y-5">
          <div>
            <h3 className="font-semibold text-[#f4f7fb]">Предпросмотр меню</h3>
            <p className="mt-1 text-sm text-[#97a4b8]">
              Так меню будет выглядеть у пользователя в Telegram.
            </p>
          </div>
          <div className="mx-auto max-w-[310px] rounded-[2rem] border border-[#2a3a55] bg-[#060a10] p-3 shadow-2xl">
            <div className="overflow-hidden rounded-[1.45rem] bg-[#f5eedf] text-[#172033]">
              <div className="flex items-center justify-between bg-white px-4 py-3 text-xs">
                <span className="font-semibold">9:41</span>
                <span>AI Кондитер</span>
                <span>🍰</span>
              </div>
              <div className="space-y-3 p-4">
                <div className="ml-auto w-fit rounded-xl bg-[#dff7c8] px-3 py-2 text-xs text-[#16723c]">
                  /start
                </div>
                <div className="max-w-[230px] rounded-xl bg-white px-3 py-3 text-sm leading-5 shadow-sm">
                  Выберите интересующий промт.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {activeButtons.map((button) => (
                    <div
                      className="min-h-12 rounded-lg bg-white/85 px-2 py-2 text-center text-xs font-medium shadow-sm"
                      key={`${button.id}-preview`}
                    >
                      <span className="mr-1">{button.emoji}</span>
                      {button.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs leading-5 text-[#7f8da3]">
            Цвета кнопок внутри Telegram зависят от приложения пользователя. В
            боте сохраняются текст, эмодзи, порядок и действие.
          </p>
        </AdminPanel>
        </div>
      </div>
    </section>
  );
}
