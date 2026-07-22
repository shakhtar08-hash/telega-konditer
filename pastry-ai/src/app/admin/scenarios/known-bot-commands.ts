import { KNOWN_BOT_COMMANDS } from "@/bot/command-registry";

export type KnownBotCommandOption = {
  value: string;
  label: string;
};

export const knownBotCommands: readonly KnownBotCommandOption[] = KNOWN_BOT_COMMANDS;
