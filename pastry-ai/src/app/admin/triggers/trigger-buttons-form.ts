import type { TriggerButtonDraft } from "./trigger-buttons-editor";

function normalizeTriggerButton(input: unknown): TriggerButtonDraft | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const text = String(candidate.text ?? "").trim();
  const value = String(candidate.value ?? "").trim();
  const type = candidate.type === "url" ? "url" : null;

  if (!text || !value || !type) {
    return null;
  }

  return { text, type, value };
}

export function parseTriggerButtons(raw: unknown): TriggerButtonDraft[] {
  if (!raw) {
    return [];
  }

  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return [];
          }
        })()
      : raw;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((button) => normalizeTriggerButton(button))
    .filter((button): button is TriggerButtonDraft => button !== null);
}

export function parseTriggerButtonsFromFormData(formData: FormData): TriggerButtonDraft[] {
  return parseTriggerButtons(String(formData.get("buttons") ?? "[]"));
}
