import { describe, expect, it } from "vitest";
import { appendLisaPersonaInstruction } from "./lisa-persona";

describe("Lisa persona", () => {
  it("appends feminine persona guidance to the system prompt", () => {
    const result = appendLisaPersonaInstruction("Base system prompt.");

    expect(result).toContain("Base system prompt.");
    expect(result).toContain("AI-кондитера Лисы");
    expect(result).toContain("женский род");
  });
});
