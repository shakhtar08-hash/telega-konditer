import { AdminPageHeader } from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function updateFunnelStep(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const sortOrder = Number(formData.get("sortOrder"));
  const active = formData.get("active") === "on";
  const title = String(formData.get("title") ?? "").trim();
  const imagePath = String(formData.get("imagePath") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const nextButtonText = String(formData.get("nextButtonText") ?? "").trim();
  const buyButtonText = String(formData.get("buyButtonText") ?? "").trim();
  const buyButtonUrl = String(formData.get("buyButtonUrl") ?? "").trim();
  const offerButtonText = String(formData.get("offerButtonText") ?? "").trim();

  if (
    !id ||
    !title ||
    !imagePath ||
    !text ||
    !nextButtonText ||
    !buyButtonText ||
    Number.isNaN(sortOrder)
  ) {
    return;
  }

  await prisma.funnelStep.update({
    where: { id },
    data: {
      active,
      buyButtonText,
      buyButtonUrl: buyButtonUrl || null,
      imagePath,
      nextButtonText,
      offerButtonText: offerButtonText || null,
      sortOrder,
      text,
      title,
    },
  });

  revalidatePath("/admin/funnel");
}

export async function createFunnelStep(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder"));
  const title = String(formData.get("title") ?? "").trim();
  const imagePath = String(formData.get("imagePath") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const nextButtonText =
    String(formData.get("nextButtonText") ?? "").trim() || "Далее";
  const buyButtonText =
    String(formData.get("buyButtonText") ?? "").trim() || "Купить";
  const buyButtonUrl = String(formData.get("buyButtonUrl") ?? "").trim();
  const offerButtonText = String(formData.get("offerButtonText") ?? "").trim();

  if (!slug || !title || !imagePath || !text || Number.isNaN(sortOrder)) {
    return;
  }

  await prisma.funnelStep.create({
    data: {
      active: true,
      buyButtonText,
      buyButtonUrl: buyButtonUrl || null,
      imagePath,
      nextButtonText,
      offerButtonText: offerButtonText || null,
      slug,
      sortOrder,
      text,
      title,
    },
  });

  revalidatePath("/admin/funnel");
}

export default async function AdminFunnelPage() {
  const steps = await prisma.funnelStep.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      active: true,
      buyButtonText: true,
      buyButtonUrl: true,
      id: true,
      imagePath: true,
      nextButtonText: true,
      offerButtonText: true,
      slug: true,
      sortOrder: true,
      text: true,
      title: true,
    },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Edit Telegram onboarding text, images, order, and buttons."
        title="Funnel"
      />

      <form
        action={createFunnelStep}
        className="space-y-4 rounded-lg border border-border bg-white p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Create new step</h3>
            <p className="text-sm text-muted-foreground">
              Add a new Telegram funnel post with its own image, text, and buttons.
            </p>
          </div>
          <button
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
            type="submit"
          >
            Create
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[120px_1fr_1fr]">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Order</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              defaultValue={steps.length}
              name="sortOrder"
              type="number"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Slug</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              name="slug"
              placeholder="new-step"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Title</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              name="title"
              placeholder="New funnel step"
            />
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Image path or URL</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            name="imagePath"
            placeholder="/onboarding/new-step.png"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Message text</span>
          <textarea
            className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2"
            name="text"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Next button</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              defaultValue="Далее"
              name="nextButtonText"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Buy button</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              defaultValue="Купить"
              name="buyButtonText"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Offer button</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              name="offerButtonText"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Custom buy URL</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              name="buyButtonUrl"
              placeholder="{{baseUrl}}/pay?telegramId={{telegramId}}"
            />
          </label>
        </div>
      </form>

      {steps.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-5 text-sm text-muted-foreground">
          No funnel steps found. Run <code className="font-mono">npm run seed</code>{" "}
          to create the default funnel.
        </div>
      ) : (
        <div className="grid gap-4">
          {steps.map((step) => (
            <form
              action={updateFunnelStep}
              className="space-y-4 rounded-lg border border-border bg-white p-5"
              key={step.id}
            >
              <input name="id" type="hidden" value={step.id} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {step.slug}
                  </p>
                </div>
                <button
                  className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
                  type="submit"
                >
                  Save
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[120px_1fr_1fr]">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Order</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    defaultValue={step.sortOrder}
                    name="sortOrder"
                    type="number"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Title</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    defaultValue={step.title}
                    name="title"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input defaultChecked={step.active} name="active" type="checkbox" />
                  <span className="font-medium">Active</span>
                </label>
              </div>

              <label className="block space-y-2 text-sm">
                <span className="font-medium">Image path or URL</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  defaultValue={step.imagePath}
                  name="imagePath"
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="font-medium">Message text</span>
                <textarea
                  className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2"
                  defaultValue={step.text}
                  name="text"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Next button</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    defaultValue={step.nextButtonText}
                    name="nextButtonText"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Buy button</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    defaultValue={step.buyButtonText}
                    name="buyButtonText"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Offer button</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    defaultValue={step.offerButtonText ?? ""}
                    name="offerButtonText"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Custom buy URL</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    defaultValue={step.buyButtonUrl ?? ""}
                    name="buyButtonUrl"
                    placeholder="{{baseUrl}}/pay?telegramId={{telegramId}}"
                  />
                </label>
              </div>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
