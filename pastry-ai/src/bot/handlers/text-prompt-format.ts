export function formatTextPromptResponseForTelegram(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[ \t]*[-*]\s+\*\*(.+?)\*\*:\s*$/gm, "- $1:")
    .replace(/^[ \t]*[-*]\s+/gm, "- ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
}
