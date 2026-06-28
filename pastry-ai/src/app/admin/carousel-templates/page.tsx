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
        description="Reusable carousel structures for pastry content."
        title="Carousel Templates"
      />
      <DataTable
        columns={[
          { header: "Name", cell: (template) => template.name },
          { header: "Slides", cell: (template) => template.slides },
          {
            header: "Status",
            cell: (template) => <StatusBadge active={template.active} />,
          },
          {
            header: "Created",
            cell: (template) => formatDate(template.createdAt),
          },
        ]}
        empty="No carousel templates yet. Add templates before enabling carousel presets."
        getKey={(template) => template.id}
        rows={templates}
      />
    </section>
  );
}
