import type { ReactNode } from "react";

type Column<Row> = {
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
};

type DataTableProps<Row> = {
  columns: Column<Row>[];
  empty: ReactNode;
  getKey: (row: Row) => string;
  rows: Row[];
};

export function AdminPageHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function DataTable<Row>({
  columns,
  empty,
  getKey,
  rows,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-5 text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3 font-semibold" key={column.header}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-border" key={getKey(row)}>
              {columns.map((column) => (
                <td className={`px-4 py-3 ${column.className ?? ""}`} key={column.header}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
