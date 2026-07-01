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
      <h2 className="text-2xl font-semibold text-[#f4f7fb]">{title}</h2>
      <p className="text-sm leading-6 text-[#97a4b8]">{description}</p>
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
      <div className="rounded-lg border border-[#223047] bg-[#121a27] p-5 text-sm text-[#97a4b8]">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#223047] bg-[#121a27]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-[#192334] text-xs uppercase text-[#97a4b8]">
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
            <tr className="border-t border-[#223047]/80" key={getKey(row)}>
              {columns.map((column) => (
                <td
                  className={`px-4 py-3 text-[#dbe3ef] ${column.className ?? ""}`}
                  key={column.header}
                >
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
    <span className="rounded-full bg-[#192334] px-2 py-1 text-xs font-medium text-[#dbe3ef]">
      {active ? "Активно" : "Выключено"}
    </span>
  );
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
