import { describe, expect, it, vi } from "vitest";
import { metadata } from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

describe("root layout metadata", () => {
  it("names the product", () => {
    expect(metadata.title).toBe("AI Pastry Assistant");
  });
});
