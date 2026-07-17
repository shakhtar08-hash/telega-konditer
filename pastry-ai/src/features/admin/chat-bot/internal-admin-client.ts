import {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";
import type { BotMenuButtonMutationInput } from "./service";

export {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";

type ChatBotAction =
  | "createBotMenuButton"
  | "updateBotMenuButton"
  | "deleteBotMenuButton"
  | "updateMenuIntro";

export async function fetchInternalAdminChatBotPageData() {
  return fetchInternalAdminJson<{
    buttons: Array<{
      actionType: "PROMPT" | "URL";
      active: boolean;
      description: string;
      emoji: string;
      fullWidth: boolean;
      id: string;
      instructionText: string | null;
      label: string;
      previewImageUrl: string | null;
      processingText: string | null;
      promptFeature: string | null;
      promptSlug: string | null;
      sortOrder: number;
      url: string | null;
    }>;
    menuIntro: { text: string } | null;
    prompts: Array<{
      feature: string;
      slug: string;
      title: string;
    }>;
  }>("/api/internal/admin/chat-bot");
}

export async function postInternalAdminChatBotAction(
  action: ChatBotAction,
  payload:
    | BotMenuButtonMutationInput
    | (BotMenuButtonMutationInput & { id: string })
    | { id: string }
    | { text: string }
    | FormData,
) {
  if (payload instanceof FormData) {
    const requestBody = new FormData();
    for (const [key, value] of payload.entries()) {
      requestBody.append(key, value);
    }
    requestBody.set("action", action);

    await fetchInternalAdminJson("/api/internal/admin/chat-bot/actions", {
      body: requestBody,
      method: "POST",
    });
    return;
  }

  await fetchInternalAdminJson("/api/internal/admin/chat-bot/actions", {
    body: JSON.stringify({ action, payload }),
    method: "POST",
  });
}
