import {
  fetchInternalAdminJson,
} from "@/features/admin/shared/internal-admin-client";
import type { PromptProvider } from "@/db/repositories/prompt-repository";

export { shouldUseInternalAdminBridge } from "@/features/admin/shared/internal-admin-client";

export async function fetchInternalAdminPromptsPageData() {
  const data = await fetchInternalAdminJson<{
    prompts: Array<{
      active: boolean;
      createdAt: string;
      feature: string;
      id: string;
      model: string;
      provider: PromptProvider;
      slug: string;
      systemPrompt: string;
      temperature: number;
      title: string;
      updatedAt: string;
      userTemplate: string;
      version: number;
    }>;
  }>("/api/internal/admin/prompts");

  return {
    prompts: data.prompts.map((prompt) => ({
      ...prompt,
      createdAt: new Date(prompt.createdAt),
      updatedAt: new Date(prompt.updatedAt),
    })),
  };
}

export async function postInternalAdminPromptAction(payload: {
  action: "updatePrompt";
  payload: {
    active: boolean;
    id: string;
    model: string;
    provider: PromptProvider;
    systemPrompt: string;
    temperature: number;
    title: string;
    userTemplate: string;
  };
}) {
  await fetchInternalAdminJson("/api/internal/admin/prompts/actions", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}
