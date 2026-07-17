import { saveAdminImage } from "@/app/admin/_lib/save-admin-image";
import {
  performCreateBotMenuButton,
  performDeleteBotMenuButton,
  performUpdateBotMenuButton,
  performUpdateMenuIntro,
  type BotMenuActionType,
  type BotMenuButtonMutationInput,
} from "@/features/admin/chat-bot/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

type ActionPayload =
  | { action: "createBotMenuButton"; payload: BotMenuButtonMutationInput | null }
  | { action: "updateBotMenuButton"; payload: (BotMenuButtonMutationInput & { id?: string }) | null }
  | { action: "deleteBotMenuButton"; payload: { id?: string } | null }
  | { action: "updateMenuIntro"; payload: { text?: string } | null };

function parsePromptTarget(value: string) {
  const [feature, slug] = value.split("::");
  return feature && slug ? { feature, slug } : { feature: "", slug: "" };
}

function isActionType(value: string): value is BotMenuActionType {
  return value === "PROMPT" || value === "URL";
}

async function parseBotMenuButtonMutationInput(
  formData: FormData,
): Promise<BotMenuButtonMutationInput | null> {
  const label = String(formData.get("label") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const instructionText = String(formData.get("instructionText") ?? "").trim();
  const processingText = String(formData.get("processingText") ?? "").trim();
  const previewImageUrl = await saveAdminImage({
    entity: "chat-bot",
    file: (formData.get("previewImageFile") as File | null) ?? null,
    manualValue: String(formData.get("previewImageUrl") ?? ""),
  });
  const fullWidth = formData.get("fullWidth") === "on";
  const actionTypeRaw = String(formData.get("actionType") ?? "");
  const promptTarget = String(formData.get("promptTarget") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder"));

  if (!label || !isActionType(actionTypeRaw) || Number.isNaN(sortOrder)) {
    return null;
  }

  const target = parsePromptTarget(promptTarget);

  return {
    actionType: actionTypeRaw,
    active: formData.get("active") === "on",
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
      case "createBotMenuButton": {
        const input = await parseBotMenuButtonMutationInput(formData);
        if (input) {
          await performCreateBotMenuButton(input);
        }
        break;
      }
      case "updateBotMenuButton": {
        const id = String(formData.get("id") ?? "").trim();
        const input = await parseBotMenuButtonMutationInput(formData);
        if (id && input) {
          await performUpdateBotMenuButton({ id, ...input });
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
    case "createBotMenuButton":
      if (body.payload) {
        await performCreateBotMenuButton(body.payload);
      }
      break;
    case "updateBotMenuButton":
      if (body.payload?.id && body.payload) {
        await performUpdateBotMenuButton({
          ...body.payload,
          id: body.payload.id,
        });
      }
      break;
    case "deleteBotMenuButton":
      await performDeleteBotMenuButton(body.payload?.id ?? "");
      break;
    case "updateMenuIntro":
      await performUpdateMenuIntro(body.payload?.text ?? "");
      break;
    default:
      return new Response("Unsupported action", { status: 400 });
  }

  return Response.json({ ok: true });
}
