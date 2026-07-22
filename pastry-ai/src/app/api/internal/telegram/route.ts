import { POST as handleTelegramWebhook } from "@/app/api/telegram/webhook/route";
import { rejectForAppRole } from "@/lib/app-role";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();
  const roleResponse = rejectForAppRole(
    "/api/internal/telegram",
    env.APP_ROLE,
    ["app"],
  );

  if (roleResponse) {
    return roleResponse;
  }

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const forwardedRequest = new Request(request.url, {
    body: await request.text(),
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": env.TELEGRAM_WEBHOOK_SECRET,
    },
    method: "POST",
  });

  return handleTelegramWebhook(forwardedRequest);
}
