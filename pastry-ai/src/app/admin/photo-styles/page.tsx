import {
  AdminPageHeader,
  DataTable,
  formatDate,
  StatusBadge,
} from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPhotoStylesPage() {
  const styles = await prisma.photoStyle.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      provider: true,
      model: true,
      createdAt: true,
    },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Переиспользуемые стили для генерации фотографий."
        title="Фото-стили"
      />
      <DataTable
        columns={[
          { header: "Название", cell: (style) => style.name },
          { header: "Описание", cell: (style) => style.description },
          { header: "Провайдер", cell: (style) => style.provider ?? "—" },
          { header: "Модель", cell: (style) => style.model ?? "—" },
          { header: "Статус", cell: (style) => <StatusBadge active={style.active} /> },
          { header: "Создан", cell: (style) => formatDate(style.createdAt) },
        ]}
        empty="Фото-стилей пока нет. Добавьте стили перед включением пресетов в боте."
        getKey={(style) => style.id}
        rows={styles}
      />
    </section>
  );
}
