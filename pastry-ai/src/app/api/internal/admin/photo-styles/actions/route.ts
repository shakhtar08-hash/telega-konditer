import { saveAdminImage } from "@/app/admin/_lib/save-admin-image";
import {
  performCreatePhotoStyle,
  performDeletePhotoStyle,
  performUpdatePhotoStyle,
  type PhotoStyleMutationInput,
} from "@/features/admin/photo-styles/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

type ActionPayload =
  | { action: "createPhotoStyle"; payload: PhotoStyleMutationInput | null }
  | { action: "updatePhotoStyle"; payload: (PhotoStyleMutationInput & { id?: string }) | null }
  | { action: "deletePhotoStyle"; payload: { id?: string } | null };

async function parsePhotoStyleMutationInput(
  formData: FormData,
): Promise<PhotoStyleMutationInput | null> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const preview = await saveAdminImage({
    entity: "photo-styles",
    file: (formData.get("previewFile") as File | null) ?? null,
    manualValue: String(formData.get("preview") ?? ""),
  });
  const userPreview = String(formData.get("userPreview") ?? "").trim() || null;
  const userText = String(formData.get("userText") ?? "").trim() || null;
  const active = formData.get("active") === "on";

  if (!name || !description || !prompt || !provider || !model) {
    return null;
  }

  return {
    active,
    description,
    model,
    name,
    preview,
    prompt,
    provider,
    userPreview,
    userText,
  };
}

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "").trim();

    switch (action) {
      case "createPhotoStyle": {
        const input = await parsePhotoStyleMutationInput(formData);
        if (input) {
          await performCreatePhotoStyle(input);
        }
        break;
      }
      case "updatePhotoStyle": {
        const id = String(formData.get("id") ?? "").trim();
        const input = await parsePhotoStyleMutationInput(formData);
        if (id && input) {
          await performUpdatePhotoStyle({ id, ...input });
        }
        break;
      }
      default:
        return new Response("Unsupported action", { status: 400 });
    }

    return Response.json({ ok: true });
  }

  const body = (await request.json()) as ActionPayload;

  switch (body.action) {
    case "createPhotoStyle":
      if (body.payload) {
        await performCreatePhotoStyle(body.payload);
      }
      break;
    case "updatePhotoStyle":
      if (body.payload?.id && body.payload) {
        await performUpdatePhotoStyle({
          ...body.payload,
          id: body.payload.id,
        });
      }
      break;
    case "deletePhotoStyle":
      await performDeletePhotoStyle(body.payload?.id ?? "");
      break;
    default:
      return new Response("Unsupported action", { status: 400 });
  }

  return Response.json({ ok: true });
}
