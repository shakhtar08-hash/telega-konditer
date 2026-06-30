import { prisma } from "@/db/prisma";
import type { PromptProvider } from "@/db/repositories/prompt-repository";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const providers: PromptProvider[] = ["openai", "openrouter", "fal"];

function isPromptProvider(value: string): value is PromptProvider {
  return providers.includes(value as PromptProvider);
}

export async function updatePrompt(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const provider = String(formData.get("provider") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  const temperature = Number(formData.get("temperature"));
  const systemPrompt = String(formData.get("systemPrompt") ?? "").trim();
  const userTemplate = String(formData.get("userTemplate") ?? "").trim();

  if (
    !id ||
    !isPromptProvider(provider) ||
    !model ||
    !systemPrompt ||
    !userTemplate ||
    Number.isNaN(temperature)
  ) {
    return;
  }

  await prisma.prompt.update({
    where: { id },
    data: {
      provider,
      model,
      temperature,
      systemPrompt,
      userTemplate,
    },
  });

  revalidatePath("/admin/prompts");
}

export default async function AdminPromptsPage() {
  const prompts = await prisma.prompt.findMany({
    orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
    select: {
      id: true,
      slug: true,
      feature: true,
      provider: true,
      systemPrompt: true,
      userTemplate: true,
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
                <th className="px-4 py-3 font-semibold">Provider</th>
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
                  <td className="px-4 py-3">{prompt.provider}</td>
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
      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <form
            action={updatePrompt}
            className="space-y-4 rounded-lg border border-border bg-white p-5"
            key={`${prompt.id}-editor`}
          >
            <input name="id" type="hidden" value={prompt.id} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{prompt.slug}</h3>
                <p className="text-sm text-muted-foreground">
                  {prompt.feature} · v{prompt.version}
                </p>
              </div>
              <button
                className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
                type="submit"
              >
                Save
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[160px_1fr_120px]">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Provider</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  defaultValue={prompt.provider}
                  name="provider"
                >
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Model</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  defaultValue={prompt.model}
                  name="model"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Temp</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  defaultValue={prompt.temperature}
                  max="2"
                  min="0"
                  name="temperature"
                  step="0.1"
                  type="number"
                />
              </label>
            </div>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">System prompt</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2"
                defaultValue={prompt.systemPrompt}
                name="systemPrompt"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">User template</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2"
                defaultValue={prompt.userTemplate}
                name="userTemplate"
              />
            </label>
          </form>
        ))}
      </div>
    </section>
  );
}
