import {
  AdminPageHeader,
  DataTable,
  formatDate,
  StatusBadge,
} from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCarouselTemplatesPage() {
  const templates = await prisma.carouselTemplate.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slides: true,
      active: true,
      createdAt: true,
    },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Переиспользуемые структуры каруселей для контента."
        title="Шаблоны каруселей"
      />
      <DataTable
        columns={[
          { header: "Название", cell: (template) => template.name },
          { header: "Слайды", cell: (template) => template.slides },
          {
            header: "Статус",
            cell: (template) => <StatusBadge active={template.active} />,
          },
          {
            header: "Создан",
            cell: (template) => formatDate(template.createdAt),
          },
        ]}
        empty="Шаблонов каруселей пока нет. Добавьте шаблоны перед включением пресетов."
        getKey={(template) => template.id}
        rows={templates}
      />
    </section>
  );
}
