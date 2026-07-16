import { loadEnv } from "@/lib/env";
import { resolveManagedApiKey } from "@/lib/api-secrets";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = await resolveManagedApiKey("OPENROUTER_API_KEY");

  if (!apiKey) {
    return new Response("OpenRouter API key is not configured.", {
      status: 502,
    });
  }

  const { path } = await context.params;
  const rawBody = await request.text();
  const contentType = request.headers.get("content-type") ?? "application/json";

  const upstreamResponse = await fetch(
    `${OPENROUTER_BASE_URL}/${path.join("/")}`,
    {
      body: rawBody,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": contentType,
      },
      method: "POST",
    },
  );

  return new Response(await upstreamResponse.text(), {
    headers: {
      "content-type":
        upstreamResponse.headers.get("content-type") ?? "application/json",
    },
    status: upstreamResponse.status,
  });
}
