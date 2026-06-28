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
      createdAt: true,
    },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Reusable art-direction styles for generated pastry photos."
        title="Photo Styles"
      />
      <DataTable
        columns={[
          { header: "Name", cell: (style) => style.name },
          { header: "Description", cell: (style) => style.description },
          { header: "Status", cell: (style) => <StatusBadge active={style.active} /> },
          { header: "Created", cell: (style) => formatDate(style.createdAt) },
        ]}
        empty="No photo styles yet. Add styles before enabling photo presets in the bot."
        getKey={(style) => style.id}
        rows={styles}
      />
    </section>
  );
}
