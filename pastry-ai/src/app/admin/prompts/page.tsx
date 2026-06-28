import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPromptsPage() {
  const prompts = await prisma.prompt.findMany({
    orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
    select: {
      id: true,
      slug: true,
      feature: true,
      model: true,
      temperature: true,
      active: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Prompts</h2>
        <p className="text-sm text-muted-foreground">
          Active and versioned AI instructions used by the bot.
        </p>
      </div>

      {prompts.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-5 text-sm text-muted-foreground">
          No prompts found. Run <code className="font-mono">npm run seed</code>{" "}
          to add the starter prompts.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">Temp</th>
                <th className="px-4 py-3 font-semibold">Version</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt) => (
                <tr key={prompt.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{prompt.feature}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {prompt.slug}
                  </td>
                  <td className="px-4 py-3">{prompt.model}</td>
                  <td className="px-4 py-3">{prompt.temperature}</td>
                  <td className="px-4 py-3">v{prompt.version}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                      {prompt.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {prompt.updatedAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
