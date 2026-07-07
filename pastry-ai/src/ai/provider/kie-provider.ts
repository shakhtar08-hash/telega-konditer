import { resolveManagedApiKey } from "@/lib/api-secrets";

const KIE_BASE = "https://api.kie.ai";

type KieTaskStatus = "waiting" | "queuing" | "generating" | "success" | "fail";

type KieResult = {
  resultUrls: string[];
};

type TaskDetailResponse = {
  code: number;
  data: {
    state: KieTaskStatus;
    resultJson?: string;
    failMsg?: string;
  };
};

async function getApiKey(): Promise<string> {
  const apiKey = await resolveManagedApiKey("KIE_API_KEY");

  if (!apiKey) {
    throw new Error(
      "KIE_API_KEY is required. Add it in admin/settings.",
    );
  }

  return apiKey;
}

async function submitFluxKontextTask(params: {
  prompt: string;
  inputImage?: string;
  aspectRatio?: string;
  model?: string;
}): Promise<string> {
  const apiKey = await getApiKey();

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    enableTranslation: true,
    model: params.model ?? "flux-kontext-pro",
    outputFormat: "jpeg",
    promptUpsampling: false,
    safetyTolerance: 2,
  };

  if (params.inputImage) {
    body.inputImage = params.inputImage;
  }

  if (params.aspectRatio) {
    body.aspectRatio = params.aspectRatio;
  }

  const response = await fetch(`${KIE_BASE}/api/v1/flux/kontext/generate`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`KIE Flux Kontext task submission failed: ${response.status} ${details}`);
  }

  const result = (await response.json()) as {
    code: number;
    data?: { taskId: string };
  };

  if (result.code !== 200 || !result.data?.taskId) {
    throw new Error(`KIE Flux Kontext rejected: ${JSON.stringify(result)}`);
  }

  return result.data.taskId;
}

async function pollTask(taskId: string, timeoutMs = 120000): Promise<KieResult> {
  const apiKey = await getApiKey();
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(
      `${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`KIE poll failed: ${response.status}`);
    }

    const result = (await response.json()) as TaskDetailResponse;

    if (result.code !== 200) {
      throw new Error(`KIE poll error: ${JSON.stringify(result)}`);
    }

    const state = result.data.state;

    if (state === "success") {
      const parsed = result.data.resultJson
        ? (JSON.parse(result.data.resultJson) as KieResult)
        : { resultUrls: [] };

      return parsed;
    }

    if (state === "fail") {
      throw new Error(
        `KIE task failed: ${result.data.failMsg ?? "unknown error"}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`KIE task timed out after ${timeoutMs}ms`);
}

export async function generateFluxKontextImage(input: {
  prompt: string;
  imageUrl?: string;
  model?: string;
  aspectRatio?: string;
}): Promise<{ url: string }> {
  const taskId = await submitFluxKontextTask({
    aspectRatio: input.aspectRatio,
    inputImage: input.imageUrl,
    model: input.model,
    prompt: input.prompt,
  });

  const result = await pollTask(taskId);
  const imageUrl = result.resultUrls?.[0];

  if (!imageUrl) {
    throw new Error("KIE Flux Kontext returned no image URL");
  }

  // Download the image and return as data URL
  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    // Return the URL directly if download fails
    return { url: imageUrl };
  }

  const blob = await imageResponse.blob();
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = blob.type || "image/jpeg";

  return { url: `data:${mediaType};base64,${base64}` };
}