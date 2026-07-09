import {
  AdminPageHeader,
  DataTable,
  formatDate,
  StatusBadge,
} from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSectionTitle,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "@/components/admin/form";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const providers = ["openai", "openrouter", "kie"] as const;

async function createStyle(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const provider = String(formData.get("provider") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  const preview = String(formData.get("preview") ?? "").trim() || null;
  const userPreview = String(formData.get("userPreview") ?? "").trim() || null;
  const userText = String(formData.get("userText") ?? "").trim() || null;
  const active = formData.get("active") === "on";

  if (!name || !description || !prompt || !provider || !model) return;

  await prisma.photoStyle.create({
    data: { name, description, prompt, provider, model, preview, userPreview, userText, active },
  });

  revalidatePath("/admin/photo-styles");
}

async function updateStyle(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const provider = String(formData.get("provider") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  const preview = String(formData.get("preview") ?? "").trim() || null;
  const userPreview = String(formData.get("userPreview") ?? "").trim() || null;
  const userText = String(formData.get("userText") ?? "").trim() || null;
  const active = formData.get("active") === "on";

  if (!id || !name || !description || !prompt || !provider || !model) return;

  await prisma.photoStyle.update({
    data: { name, description, prompt, provider, model, preview, userPreview, userText, active },
    where: { id },
  });

  revalidatePath("/admin/photo-styles");
}

async function deleteStyle(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.photoStyle.delete({ where: { id } });

  revalidatePath("/admin/photo-styles");
}

export default async function AdminPhotoStylesPage() {
  const styles = await prisma.photoStyle.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Переиспользуемые стили для генерации фотографий. Можно создавать, редактировать и отключать прямо из админки."
        title="Фото-стили"
      />

      <DataTable
        columns={[
          { header: "Название", cell: (s) => s.name },
          { header: "Описание", cell: (s) => s.description },
          { header: "Провайдер", cell: (s) => s.provider ?? "—" },
          { header: "Модель", cell: (s) => s.model ?? "—" },
          {
            header: "Статус",
            cell: (s) => <StatusBadge active={s.active} />,
          },
          { header: "Создан", cell: (s) => formatDate(s.createdAt) },
        ]}
        empty="Фото-стилей пока нет. Создайте первый стиль ниже."
        getKey={(s) => s.id}
        rows={styles}
      />

      <AdminPanel>
        <AdminSectionTitle
          description="Новый стиль появится в меню фотосъёмки бота после включения."
          title="Создать стиль"
        />
        <form action={createStyle} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Название">
              <AdminInput name="name" placeholder="Тёмный премиум" required />
            </AdminField>
            <AdminField label="Описание">
              <AdminInput
                name="description"
                placeholder="Короткое описание для админки"
                required
              />
            </AdminField>
            <AdminField label="Провайдер">
              <AdminSelect defaultValue="kie" name="provider" required>
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Модель">
              <AdminInput
                name="model"
                placeholder="flux-kontext-pro"
                required
              />
            </AdminField>
            <AdminField
              hint="Ссылка на пример изображения (опционально)"
              label="Preview URL"
            >
              <AdminInput name="preview" placeholder="https://..." />
            </AdminField>
          </div>
          <AdminField label="Промт">
            <AdminTextarea
              className="min-h-24"
              name="prompt"
              placeholder="Описание визуального стиля для генерации изображения"
              required
            />
          </AdminField>
          <AdminField label="Текст для пользователя (userText)">
            <AdminTextarea
              className="min-h-16"
              name="userText"
              placeholder="Сообщение после выбора стиля. Если пусто — используется стандартный fallback"
            />
          </AdminField>
          <AdminField label="Фото-превью для пользователя (userPreview)">
            <AdminInput
              name="userPreview"
              placeholder="/images/style-preview.jpg или https://..."
            />
          </AdminField>
          <div className="flex items-center justify-between">
            <AdminToggle defaultChecked name="active">
              Активен
            </AdminToggle>
            <AdminButton type="submit">Создать</AdminButton>
          </div>
        </form>
      </AdminPanel>

      {styles.length > 0 && (
        <div className="space-y-4">
          <AdminSectionTitle
            description="Редактирование существующих стилей. Поля модели и провайдера можно менять без ограничений."
            title="Редактировать стили"
          />
          {styles.map((style) => (
            <AdminPanel className="space-y-4" key={style.id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#f4f7fb]">{style.name}</h3>
                <div className="flex items-center gap-2">
                  <form action={deleteStyle}>
                    <input name="id" type="hidden" value={style.id} />
                    <AdminButton type="submit" variant="danger">
                      Удалить
                    </AdminButton>
                  </form>
                </div>
              </div>
              <form action={updateStyle} className="space-y-4">
                <input name="id" type="hidden" value={style.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="Название">
                    <AdminInput
                      defaultValue={style.name}
                      name="name"
                      required
                    />
                  </AdminField>
                  <AdminField label="Описание">
                    <AdminInput
                      defaultValue={style.description}
                      name="description"
                      required
                    />
                  </AdminField>
                  <AdminField label="Провайдер">
                    <AdminSelect
                      defaultValue={style.provider ?? "kie"}
                      name="provider"
                      required
                    >
                      {providers.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Модель">
                    <AdminInput
                      defaultValue={style.model ?? ""}
                      name="model"
                      required
                    />
                  </AdminField>
                  <AdminField label="Preview URL">
                    <AdminInput
                      defaultValue={style.preview ?? ""}
                      name="preview"
                      placeholder="https://..."
                    />
                  </AdminField>
                </div>
                <AdminField label="Промт">
                  <AdminTextarea
                    className="min-h-24"
                    defaultValue={style.prompt}
                    name="prompt"
                    required
                  />
                </AdminField>
                <AdminField label="Текст для пользователя (userText)">
                  <AdminTextarea
                    className="min-h-16"
                    defaultValue={style.userText ?? ""}
                    name="userText"
                    placeholder="Сообщение после выбора стиля. Если пусто — используется стандартный fallback"
                  />
                </AdminField>
                <AdminField label="Фото-превью для пользователя (userPreview)">
                  <AdminInput
                    defaultValue={style.userPreview ?? ""}
                    name="userPreview"
                    placeholder="/images/style-preview.jpg или https://..."
                  />
                </AdminField>
                <AdminToggle defaultChecked={style.active} name="active">
                  Активен
                </AdminToggle>
                <div className="flex justify-end">
                  <AdminButton type="submit">Сохранить</AdminButton>
                </div>
              </form>
            </AdminPanel>
          ))}
        </div>
      )}
    </section>
  );
}