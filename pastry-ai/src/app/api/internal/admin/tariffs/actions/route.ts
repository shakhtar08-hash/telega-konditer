import {
  performCreateTariff,
  performToggleTariff,
  performUpdateTariff,
} from "@/features/admin/tariffs/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return new Response("Unsupported content type", { status: 400 });
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "").trim();

  switch (action) {
    case "createTariff":
      await performCreateTariff(formData);
      break;
    case "updateTariff":
      await performUpdateTariff(formData);
      break;
    case "toggleTariff":
      await performToggleTariff(formData);
      break;
    default:
      return new Response("Unsupported action", { status: 400 });
  }

  return Response.json({ ok: true });
}
