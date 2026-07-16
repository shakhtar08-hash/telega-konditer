export function sanitizeOutboundPrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim();
}
