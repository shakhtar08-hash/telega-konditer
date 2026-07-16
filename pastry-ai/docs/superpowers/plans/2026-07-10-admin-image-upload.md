# Admin Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared admin-side image upload by file picker while preserving manual URL/path entry, and extend `/admin/triggers` with image support.

**Architecture:** Use one server-side upload helper that validates image files and writes them into `public/uploads/admin/<entity>/`, then reuse one admin UI field that combines manual path entry, file upload, and optional preview. Existing server actions stay page-local but delegate file handling to the shared helper and apply the same precedence rule: uploaded file overrides manual text when both are present.

**Tech Stack:** Next.js App Router server actions, React server components, Prisma, Vitest, local filesystem under `public/`

## Global Constraints

- Scope is admin only.
- Local file storage is required in this phase.
- Manual URL/path entry must remain available on all covered pages.
- Covered pages are `/admin/triggers`, `/admin/chat-bot`, `/admin/funnel`, and `/admin/photo-styles`.
- Files must be stored under `public/uploads/admin/...` and persisted as public paths like `/uploads/admin/triggers/example.webp`.
- Accept image files only.
- Reject empty file selections.
- Maximum file size is 10 MB.
- If both file and text are provided, file wins.
- Existing data and existing string-only workflows must keep working.
- No media library, drag-and-drop, disk cleanup, or external storage in this phase.

---

### Task 1: Add Trigger Image Persistence

**Files:**
- Modify: `pastry-ai/prisma/schema.prisma`
- Create: `pastry-ai/prisma/migrations/<timestamp>_add_trigger_image_url/migration.sql`
- Test: `pastry-ai/src/app/admin/triggers/page.actions.test.ts`

**Interfaces:**
- Consumes: existing `TriggerMessage` model and trigger server actions in `pastry-ai/src/app/admin/triggers/page.tsx`
- Produces: `TriggerMessage.imageUrl: string | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createTriggerMessage, updateTriggerMessage } from "./page";

const { prismaMock, revalidatePathMock } = vi.hoisted(() => ({
  prismaMock: {
    tariffPlan: { findMany: vi.fn() },
    triggerMessage: { create: vi.fn(), update: vi.fn() },
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

describe("trigger actions image persistence", () => {
  it("stores manual imageUrl on create", async () => {
    prismaMock.tariffPlan.findMany.mockResolvedValue([{ slug: "promo" }]);

    const formData = new FormData();
    formData.set("slug", "after-start");
    formData.set("title", "После старта");
    formData.set("text", "Текст");
    formData.set("delayMinutes", "15");
    formData.set("imageUrl", "/uploads/admin/triggers/start.webp");
    formData.set("target_promo", "on");

    await createTriggerMessage(formData);

    expect(prismaMock.triggerMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: "/uploads/admin/triggers/start.webp",
        }),
      }),
    );
  });

  it("stores manual imageUrl on update", async () => {
    prismaMock.tariffPlan.findMany.mockResolvedValue([{ slug: "promo" }]);

    const formData = new FormData();
    formData.set("id", "trigger_1");
    formData.set("title", "После старта");
    formData.set("text", "Текст");
    formData.set("delayMinutes", "30");
    formData.set("imageUrl", "/uploads/admin/triggers/edited.webp");
    formData.set("target_promo", "on");
    formData.set("active", "on");

    await updateTriggerMessage(formData);

    expect(prismaMock.triggerMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: "/uploads/admin/triggers/edited.webp",
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts`
Expected: FAIL because `imageUrl` is not part of trigger action payloads yet.

- [ ] **Step 3: Write minimal implementation**

```prisma
model TriggerMessage {
  id           String   @id @default(cuid())
  slug         String   @unique
  title        String
  text         String
  imageUrl     String?
  delayMinutes Int
  targetPlans  Json
  buttons      Json?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

```sql
ALTER TABLE "TriggerMessage"
ADD COLUMN "imageUrl" TEXT;
```

```ts
const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

await prisma.triggerMessage.create({
  data: { slug, title, text, imageUrl, delayMinutes, targetPlans, active: true },
});

await prisma.triggerMessage.update({
  data: { title, text, imageUrl, delayMinutes, active, targetPlans },
  where: { id },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.tsx
git commit -m "feat: add trigger image field"
```

### Task 2: Build Shared Admin Upload Helper

**Files:**
- Create: `pastry-ai/src/app/admin/_lib/save-admin-image.ts`
- Test: `pastry-ai/src/app/admin/_lib/save-admin-image.test.ts`

**Interfaces:**
- Consumes: `File`, `Buffer`, `fs/promises`, `path`, `crypto`
- Produces: `saveAdminImage(input: { file: File | null; entity: "chat-bot" | "funnel" | "photo-styles" | "triggers"; existingValue?: string | null; manualValue?: string | null; }): Promise<string | null>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { saveAdminImage } from "./save-admin-image";

function makeImageFile(name = "cake.png", size = 8) {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

describe("saveAdminImage", () => {
  it("returns manual value when file is missing", async () => {
    const result = await saveAdminImage({
      entity: "triggers",
      file: null,
      manualValue: "/uploads/admin/triggers/manual.png",
    });

    expect(result).toBe("/uploads/admin/triggers/manual.png");
  });

  it("returns saved upload path when file is present", async () => {
    const result = await saveAdminImage({
      entity: "triggers",
      file: makeImageFile(),
      manualValue: "/uploads/admin/triggers/manual.png",
    });

    expect(result).toMatch(/^\/uploads\/admin\/triggers\/.+\.png$/);
  });

  it("returns manual value when file type is not an image", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });

    const result = await saveAdminImage({
      entity: "funnel",
      file,
      manualValue: "/onboarding/existing.png",
    });

    expect(result).toBe("/onboarding/existing.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/_lib/save-admin-image.test.ts`
Expected: FAIL with module/function missing

- [ ] **Step 3: Write minimal implementation**

```ts
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function sanitizeStem(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

export async function saveAdminImage(input: {
  entity: "chat-bot" | "funnel" | "photo-styles" | "triggers";
  file: File | null;
  existingValue?: string | null;
  manualValue?: string | null;
}) {
  const manualValue = input.manualValue?.trim() || null;
  const file = input.file;

  if (!file || file.size === 0) {
    return manualValue;
  }

  if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE) {
    return manualValue ?? input.existingValue ?? null;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".bin";
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const filename = `${stamp}-${randomBytes(3).toString("hex")}-${sanitizeStem(file.name)}${ext}`;
  const relativeDir = path.join("uploads", "admin", input.entity);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, filename), bytes);

  return `/${relativeDir.replace(/\\/g, "/")}/${filename}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/_lib/save-admin-image.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/_lib/save-admin-image.ts src/app/admin/_lib/save-admin-image.test.ts
git commit -m "feat: add shared admin image upload helper"
```

### Task 3: Build Shared Admin Image Field UI

**Files:**
- Modify: `pastry-ai/src/components/admin/form.tsx`
- Test: `pastry-ai/src/components/admin/form.test.tsx`

**Interfaces:**
- Consumes: existing `AdminField`, `AdminInput`
- Produces: `AdminImageField(props: { label: string; textName: string; fileName: string; defaultValue?: string; placeholder?: string; hint?: string; fileLabel?: string; })`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminImageField } from "./form";

describe("AdminImageField", () => {
  it("renders manual input, file input, and preview", () => {
    const html = renderToStaticMarkup(
      <AdminImageField
        defaultValue="/uploads/admin/triggers/cake.webp"
        fileName="imageFile"
        label="Изображение"
        placeholder="/uploads/admin/triggers/cake.webp"
        textName="imageUrl"
      />,
    );

    expect(html).toContain('name="imageUrl"');
    expect(html).toContain('name="imageFile"');
    expect(html).toContain('type="file"');
    expect(html).toContain('src="/uploads/admin/triggers/cake.webp"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/admin/form.test.tsx`
Expected: FAIL because `AdminImageField` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```tsx
export function AdminImageField({
  defaultValue = "",
  fileLabel = "Или выберите файл",
  fileName,
  hint,
  label,
  placeholder,
  textName,
}: {
  defaultValue?: string;
  fileLabel?: string;
  fileName: string;
  hint?: string;
  label: string;
  placeholder?: string;
  textName: string;
}) {
  const previewable = defaultValue.startsWith("/") || defaultValue.startsWith("http");

  return (
    <AdminField hint={hint} label={label}>
      <div className="space-y-3">
        <AdminInput defaultValue={defaultValue} name={textName} placeholder={placeholder} />
        <div className="space-y-2">
          <span className="block text-xs text-[#7f8da3]">{fileLabel}</span>
          <AdminInput accept="image/*" name={fileName} type="file" />
        </div>
        {previewable ? (
          <img
            alt=""
            className="h-24 w-24 rounded-md border border-[#2a3a55] object-cover"
            src={defaultValue}
          />
        ) : null}
      </div>
    </AdminField>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/admin/form.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/form.tsx src/components/admin/form.test.tsx
git commit -m "feat: add reusable admin image field"
```

### Task 4: Wire Uploads into Trigger and Chat-Bot Actions

**Files:**
- Modify: `pastry-ai/src/app/admin/triggers/page.tsx`
- Modify: `pastry-ai/src/app/admin/chat-bot/page.tsx`
- Modify: `pastry-ai/src/app/admin/chat-bot/page.test.tsx`
- Modify: `pastry-ai/src/app/admin/triggers/page.actions.test.ts`

**Interfaces:**
- Consumes: `saveAdminImage`, `AdminImageField`
- Produces:
  - trigger forms with `imageUrl` + `imageFile`
  - chat-bot forms with `previewImageUrl` + `previewImageFile`

- [ ] **Step 1: Write the failing test**

```ts
it("stores uploaded trigger image path when file is present", async () => {
  prismaMock.tariffPlan.findMany.mockResolvedValue([{ slug: "promo" }]);
  saveAdminImageMock.mockResolvedValue("/uploads/admin/triggers/uploaded.webp");

  const formData = new FormData();
  formData.set("slug", "after-start");
  formData.set("title", "После старта");
  formData.set("text", "Текст");
  formData.set("delayMinutes", "15");
  formData.set("target_promo", "on");
  formData.set("imageFile", new File([new Uint8Array([1])], "cake.png", { type: "image/png" }));

  await createTriggerMessage(formData);

  expect(saveAdminImageMock).toHaveBeenCalled();
  expect(prismaMock.triggerMessage.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        imageUrl: "/uploads/admin/triggers/uploaded.webp",
      }),
    }),
  );
});

it("persists previewImageUrl on bot menu button create", async () => {
  const formData = new FormData();
  formData.set("label", "Бонусы");
  formData.set("emoji", "🎁");
  formData.set("description", "Акции");
  formData.set("previewImageUrl", "/uploads/admin/chat-bot/bonus.webp");
  formData.set("actionType", "URL");
  formData.set("url", "https://example.com");
  formData.set("sortOrder", "1");

  await createBotMenuButton(formData);

  expect(prismaMock.botMenuButton.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        previewImageUrl: "/uploads/admin/chat-bot/bonus.webp",
      }),
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/chat-bot/page.test.tsx`
Expected: FAIL because upload helper is not wired and chat-bot create still omits `previewImageUrl`

- [ ] **Step 3: Write minimal implementation**

```ts
import { saveAdminImage } from "@/app/admin/_lib/save-admin-image";
import { AdminImageField } from "@/components/admin/form";

const imageUrl = await saveAdminImage({
  entity: "triggers",
  file: (formData.get("imageFile") as File | null) ?? null,
  manualValue: String(formData.get("imageUrl") ?? ""),
});
```

```ts
const previewImageUrl = await saveAdminImage({
  entity: "chat-bot",
  file: (formData.get("previewImageFile") as File | null) ?? null,
  manualValue: String(formData.get("previewImageUrl") ?? ""),
});

await prisma.botMenuButton.create({
  data: {
    actionType: actionTypeRaw,
    active: true,
    description,
    emoji,
    fullWidth,
    instructionText: instructionText || null,
    label,
    previewImageUrl,
    processingText: processingText || null,
    promptFeature: actionTypeRaw === "PROMPT" ? target.feature || null : null,
    promptSlug: actionTypeRaw === "PROMPT" ? target.slug || null : null,
    sortOrder,
    url: actionTypeRaw === "URL" ? url || null : null,
  },
});
```

```tsx
<AdminImageField
  defaultValue={trigger.imageUrl ?? ""}
  fileName="imageFile"
  label="Изображение"
  placeholder="/uploads/admin/triggers/example.webp или https://..."
  textName="imageUrl"
/>

<AdminImageField
  defaultValue={button.previewImageUrl ?? ""}
  fileName="previewImageFile"
  label="Фото-превью (previewImageUrl)"
  placeholder="/images/preview.jpg или https://..."
  textName="previewImageUrl"
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/chat-bot/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/triggers/page.tsx src/app/admin/chat-bot/page.tsx src/app/admin/chat-bot/page.test.tsx src/app/admin/triggers/page.actions.test.ts
git commit -m "feat: add admin image upload to triggers and chat bot"
```

### Task 5: Wire Uploads into Funnel and Photo Styles

**Files:**
- Modify: `pastry-ai/src/app/admin/funnel/page.tsx`
- Modify: `pastry-ai/src/app/admin/funnel/page.actions.test.ts`
- Modify: `pastry-ai/src/app/admin/funnel/page.test.tsx`
- Modify: `pastry-ai/src/app/admin/photo-styles/page.tsx`
- Modify: `pastry-ai/src/app/admin/admin-data-pages.test.tsx`

**Interfaces:**
- Consumes: `saveAdminImage`, `AdminImageField`
- Produces:
  - funnel forms with `imagePath` + `imageFile`
  - photo-style forms with `preview` + `previewFile`

- [ ] **Step 1: Write the failing test**

```ts
it("stores uploaded funnel image path when file is present", async () => {
  saveAdminImageMock.mockResolvedValue("/uploads/admin/funnel/step.webp");

  const formData = new FormData();
  formData.set("slug", "welcome");
  formData.set("title", "Приветствие");
  formData.set("text", "Текст");
  formData.set("sortOrder", "0");
  formData.set("nextAction", "next");
  formData.set("imageFile", new File([new Uint8Array([1])], "welcome.png", { type: "image/png" }));

  await createFunnelStep(formData);

  expect(prisma.funnelStep.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        imagePath: "/uploads/admin/funnel/step.webp",
      }),
    }),
  );
});
```

```ts
it("renders photo styles from the database", async () => {
  prismaMock.photoStyle.findMany.mockResolvedValue([
    {
      id: "style_1",
      name: "Editorial pastry",
      description: "Bright magazine lighting",
      preview: "/uploads/admin/photo-styles/editorial.webp",
      active: true,
      createdAt: new Date("2026-06-28T00:00:00.000Z"),
    },
  ]);

  const text = renderToStaticMarkup(await PhotoStylesPage());

  expect(text).toContain('name="previewFile"');
  expect(text).toContain("/uploads/admin/photo-styles/editorial.webp");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/app/admin/admin-data-pages.test.tsx`
Expected: FAIL because forms and action payloads do not yet include uploaded image handling

- [ ] **Step 3: Write minimal implementation**

```ts
const imagePath = await saveAdminImage({
  entity: "funnel",
  file: (formData.get("imageFile") as File | null) ?? null,
  manualValue: String(formData.get("imagePath") ?? ""),
});
```

```ts
const preview = await saveAdminImage({
  entity: "photo-styles",
  file: (formData.get("previewFile") as File | null) ?? null,
  manualValue: String(formData.get("preview") ?? ""),
});
```

```tsx
<AdminImageField
  defaultValue={step.imagePath}
  fileName="imageFile"
  label="Путь к изображению или URL"
  placeholder="/onboarding/new-step.png"
  textName="imagePath"
/>

<AdminImageField
  defaultValue={style.preview ?? ""}
  fileName="previewFile"
  hint="Ссылка на пример изображения или локальная загрузка"
  label="Preview URL"
  placeholder="https://..."
  textName="preview"
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/app/admin/admin-data-pages.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/funnel/page.tsx src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/app/admin/photo-styles/page.tsx src/app/admin/admin-data-pages.test.tsx
git commit -m "feat: add admin image upload to funnel and photo styles"
```

### Task 6: Full Verification and Cleanup

**Files:**
- Modify: `pastry-ai/docs/roadmap.md`
- Modify: `pastry-ai/docs/architecture.md`

**Interfaces:**
- Consumes: completed implementation from Tasks 1-5
- Produces: updated docs and verification evidence

- [ ] **Step 1: Write the failing test**

No new failing unit test is required in this task. The verification target is full regression coverage plus docs updates.

- [ ] **Step 2: Run test to verify current status**

Run: `npm test -- src/app/admin/_lib/save-admin-image.test.ts src/components/admin/form.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/chat-bot/page.test.tsx src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/app/admin/admin-data-pages.test.tsx`
Expected: PASS only when all admin upload changes are integrated correctly

- [ ] **Step 3: Write minimal implementation**

```md
- Admin image upload: `/admin/triggers`, `/admin/chat-bot`, `/admin/funnel`, and `/admin/photo-styles` now accept either manual image URLs/paths or local file uploads. Files are stored under `public/uploads/admin/...`.
```

```md
- Trigger messages now support optional `imageUrl`.
- Admin server actions can persist uploaded image files through a shared local-disk helper.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/_lib/save-admin-image.test.ts src/components/admin/form.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/chat-bot/page.test.tsx src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/app/admin/admin-data-pages.test.tsx`
Expected: PASS

Run: `npm test`
Expected: PASS, or if unrelated failures already exist, capture exact failing suites before handoff.

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap.md docs/architecture.md
git commit -m "docs: record admin image upload support"
```

## Self-Review

- Spec coverage check:
  - Shared helper: Task 2
  - Shared UI field: Task 3
  - Trigger image model change: Task 1
  - `/admin/triggers`: Task 4
  - `/admin/chat-bot`: Task 4
  - `/admin/funnel`: Task 5
  - `/admin/photo-styles`: Task 5
  - Regression coverage: Tasks 1, 4, 5, 6
- Placeholder scan: no `TODO`, `TBD`, or undefined “appropriate handling” phrases remain.
- Type consistency check:
  - shared helper name is `saveAdminImage`
  - trigger text field is `imageUrl`, file field is `imageFile`
  - chat-bot text field is `previewImageUrl`, file field is `previewImageFile`
  - funnel text field is `imagePath`, file field is `imageFile`
  - photo-style text field is `preview`, file field is `previewFile`

Plan complete and saved to `docs/superpowers/plans/2026-07-10-admin-image-upload.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
