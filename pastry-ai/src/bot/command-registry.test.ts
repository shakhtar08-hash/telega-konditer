import { describe, expect, it } from "vitest";
import { KNOWN_BOT_COMMANDS } from "./command-registry";

describe("KNOWN_BOT_COMMANDS", () => {
  it("exports supported scenario command actions", () => {
    expect(KNOWN_BOT_COMMANDS.map((item) => item.value)).toEqual(
      expect.arrayContaining(["/menu", "/recipe", "/bestrecipe", "/ask", "/photo", "/styles"]),
    );
  });
});
