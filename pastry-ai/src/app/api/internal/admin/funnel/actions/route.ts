import {
  performCreateFunnelStep,
  performUpdateFunnelStep,
  type FunnelMutationInput,
} from "@/features/admin/funnel/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

type ActionPayload = {
  action: "createFunnelStep" | "updateFunnelStep";
  payload: (FunnelMutationInput & { id?: string }) | null;
};

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
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
