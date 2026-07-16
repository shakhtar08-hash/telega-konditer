import AdminSidebar from "./sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b111a] text-[#eef4ff]">
      <AdminSidebar />
      <main className="px-4 py-5 lg:ml-60 lg:px-7">{children}</main>
    </div>
  );
}
