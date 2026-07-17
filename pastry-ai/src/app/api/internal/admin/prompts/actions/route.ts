import {
  performUpdatePrompt,
  type PromptMutationInput,
} from "@/features/admin/prompts/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

type ActionPayload = {
  action: "updatePrompt";
  payload: (PromptMutationInput & { id?: string }) | null;
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
    case "updatePrompt":
      await performUpdatePrompt(body.payload?.id ?? "", {
        active: body.payload?.active ?? false,
        model: body.payload?.model ?? "",
        provider: body.payload?.provider ?? "openai",
        systemPrompt: body.payload?.systemPrompt ?? "",
        temperature: body.payload?.temperature ?? Number.NaN,
        title: body.payload?.title ?? "",
        userTemplate: body.payload?.userTemplate ?? "",
      });
      break;
    default:
      return new Response("Unsupported action", { status: 400 });
  }

  return Response.json({ ok: true });
}
