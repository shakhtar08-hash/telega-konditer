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
  AdminToggle,
} from "@/components/admin/form";
import { revalidatePath } from "next/cache";
import {
  fetchInternalAdminTariffsPageData,
  postInternalAdminTariffAction,
} from "@/features/admin/tariffs/internal-admin-client";
import {
  loadAdminTariffsPageData,
  performCreateTariff,
  performToggleTariff,
  performUpdateTariff,
} from "@/features/admin/tariffs/service";

export const dynamic = "force-dynamic";

async function createTariff(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "");
  const tokenAmount = Number(formData.get("tokenAmount") ?? 0);
  const durationDays = Number(formData.get("durationDays") ?? 0);

  if (!slug || !name || tokenAmount < 0 || !durationDays) return;

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminTariffAction("createTariff", formData);
  } else {
    await performCreateTariff(formData);
  }

  revalidatePath("/admin/tariffs");
}

async function updateTariff(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const tokenAmount = Number(formData.get("tokenAmount") ?? 0);
  const durationDays = Number(formData.get("durationDays") ?? 0);

  if (!id || !name || tokenAmount < 0 || !durationDays) return;

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminTariffAction("updateTariff", formData);
  } else {
    await performUpdateTariff(formData);
  }

  revalidatePath("/admin/tariffs");
}

async function toggleTariff(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) return;

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminTariffAction("toggleTariff", formData);
  } else {
    await performToggleTariff(formData);
  }

  revalidatePath("/admin/tariffs");
}

export default async function AdminTariffsPage() {
  const { tariffs } = process.env.APP_ROLE === "ingress"
    ? await fetchInternalAdminTariffsPageData()
    : await loadAdminTariffsPageData();

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Управление тарифами: создание, редактирование и включение/отключение."
        title="Тарифы"
      />

      <AdminPanel>
        <h3 className="mb-4 text-lg font-semibold text-[#f4f7fb]">Создать тариф</h3>
        <form action={createTariff} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminField label="Slug">
              <AdminInput name="slug" placeholder="basic" required />
            </AdminField>
            <AdminField label="Название">
              <AdminInput name="name" placeholder="Базовый" required />
            </AdminField>
            <AdminField label="Токенов">
              <AdminInput name="tokenAmount" placeholder="1000" required type="number" />
            </AdminField>
            <AdminField label="Дней">
              <AdminInput name="durationDays" placeholder="30" required type="number" />
            </AdminField>
          </div>
          <div className="flex items-center justify-between">
            <AdminToggle name="active" defaultChecked>
              Активен
            </AdminToggle>
            <AdminButton type="submit">Создать</AdminButton>
          </div>
        </form>
      </AdminPanel>

      <DataTable
        columns={[
          { header: "Название", cell: (t) => t.name },
          { header: "Токенов", cell: (t) => t.tokenAmount },
          { header: "Дней", cell: (t) => t.durationDays },
          { header: "Порядок", cell: (t) => t.sortOrder },
          { header: "Статус", cell: (t) => <StatusBadge active={t.active} /> },
          { header: "Создан", cell: (t) => formatDate(t.createdAt) },
          {
            header: "Действия",
            cell: (t) => (
              <div className="flex flex-wrap items-center gap-2">
                <form action={updateTariff} className="flex flex-wrap items-center gap-2">
                  <input name="id" type="hidden" value={t.id} />
                  <AdminInput className="w-24 py-1" defaultValue={t.name} name="name" required />
                  <AdminInput className="w-16 py-1" defaultValue={t.tokenAmount} name="tokenAmount" required type="number" />
                  <AdminInput className="w-16 py-1" defaultValue={t.durationDays} name="durationDays" required type="number" />
                  <AdminToggle name="active" defaultChecked={t.active}>
                    Активен
                  </AdminToggle>
                  <AdminButton className="py-1" type="submit" variant="secondary">
                    Сохр
                  </AdminButton>
                </form>
                <form action={toggleTariff}>
                  <input name="id" type="hidden" value={t.id} />
                  <input name="active" type="hidden" value={t.active ? "false" : "true"} />
                  <AdminButton className="py-1" type="submit" variant="secondary">
                    {t.active ? "Выкл" : "Вкл"}
                  </AdminButton>
                </form>
              </div>
            ),
          },
        ]}
        empty="Тарифов пока нет. Создайте первый тариф выше."
        getKey={(t) => t.id}
        rows={tariffs}
      />
    </section>
  );
}
