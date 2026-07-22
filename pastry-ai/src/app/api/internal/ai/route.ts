import { generateOpenAIImageDirect } from "@/ai/provider/openai-provider";
import type { GenerateImageInput } from "@/ai/provider/ai-service";
import { rejectForAppRole } from "@/lib/app-role";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();
  const roleResponse = rejectForAppRole(
    "/api/internal/ai",
    env.APP_ROLE,
    ["ingress"],
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

  const payload = (await request.json()) as GenerateImageInput;
  try {
    const result = await generateOpenAIImageDirect(payload);

    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Internal AI gateway request failed." },
      { status: 502 },
    );
  }
}
