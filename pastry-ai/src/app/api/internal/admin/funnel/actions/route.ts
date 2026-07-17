import { saveAdminImage } from "@/app/admin/_lib/save-admin-image";
import {
  performCreateFunnelStep,
  performUpdateFunnelStep,
  type FunnelMutationInput,
} from "@/features/admin/funnel/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";
import { parseBuyButtonsFromFormData } from "@/app/admin/funnel/buy-buttons-form";

type ActionPayload = {
  action: "createFunnelStep" | "updateFunnelStep";
  payload: (FunnelMutationInput & { id?: string }) | null;
};

async function parseFunnelMutationInput(
  formData: FormData,
): Promise<FunnelMutationInput | null> {
  const sortOrder = Number(formData.get("sortOrder"));
  const active = formData.get("active") === "on";
  const title = String(formData.get("title") ?? "").trim();
  const imagePath =
    (await saveAdminImage({
      entity: "funnel",
      file: (formData.get("imageFile") as File | null) ?? null,
      manualValue: String(formData.get("imagePath") ?? ""),
    })) ?? "";
  const text = String(formData.get("text") ?? "").trim();
  const nextButtonText = String(formData.get("nextButtonText") ?? "").trim();
  const nextAction = String(formData.get("nextAction") ?? "next").trim() as
    | "next"
    | "activate_promo_and_next";
  const offerButtonText = String(formData.get("offerButtonText") ?? "").trim();

  if (!title || !imagePath || !text || Number.isNaN(sortOrder)) {
    return null;
  }

  const buyButtons = parseBuyButtonsFromFormData(formData);

  return {
    active,
    buyButtons,
    firstBuyButton: buyButtons.find((button) => button.active),
    imagePath,
    nextAction,
    nextButtonText,
    offerButtonText,
    sortOrder,
    text,
    title,
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
    const input = await parseFunnelMutationInput(formData);

    switch (action) {
      case "createFunnelStep": {
        const slug = String(formData.get("slug") ?? "").trim();
        if (input && slug) {
          await performCreateFunnelStep({
            ...input,
            nextButtonText: input.nextButtonText || "Далее",
            slug,
          });
        }
        break;
      }
      case "updateFunnelStep": {
        const id = String(formData.get("id") ?? "").trim();
        if (input && id) {
          await performUpdateFunnelStep({
            ...input,
            id,
          });
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
    case "createFunnelStep":
      if (body.payload) {
        await performCreateFunnelStep(body.payload);
      }
      break;
    case "updateFunnelStep":
      if (body.payload?.id) {
        await performUpdateFunnelStep({
          ...body.payload,
          id: body.payload.id,
        });
      }
      break;
    default:
      return new Response("Unsupported action", { status: 400 });
  }

  return Response.json({ ok: true });
}
