export const KNOWN_BOT_COMMANDS = [
  { value: "/menu", label: "/menu" },
  { value: "/recipe", label: "/recipe" },
  { value: "/bestrecipe", label: "/bestrecipe" },
  { value: "/ask", label: "/ask" },
  { value: "/photo", label: "/photo" },
  { value: "/styles", label: "/styles" },
] as const;

export type KnownBotCommand = (typeof KNOWN_BOT_COMMANDS)[number];
