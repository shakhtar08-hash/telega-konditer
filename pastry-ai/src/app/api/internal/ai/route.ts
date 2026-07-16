import { generateOpenAIImageDirect } from "@/ai/provider/openai-provider";
import type { GenerateImageInput } from "@/ai/provider/ai-service";
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

  const payload = (await request.json()) as GenerateImageInput;
  const result = await generateOpenAIImageDirect(payload);

  return Response.json(result);
}
