import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const scannedRoots = ["AGENTS.md", "docs", "prisma", "src"];
const scannedExtensions = new Set([
  ".js",
  ".md",
  ".mjs",
  ".prisma",
  ".ts",
  ".tsx",
  ".txt",
]);

const mojibakePattern = new RegExp(
  [
    "\\u0420[\\u0080-\\u00bf\\u0400-\\u040f\\u0450-\\u045f]",
    "\\u0421[\\u0080-\\u00bf\\u0400-\\u040f\\u0450-\\u045f]",
    "\\u0432[\\u0080-\\u00bf\\u0400-\\u040f\\u2010-\\u20ff]",
    "\\u0440\\u045f",
    "\\u00d0[\\u0080-\\u00bf]",
    "\\u00d1[\\u0080-\\u00bf]",
  ].join("|"),
  "u",
);

describe("source encoding", () => {
  it("does not contain common UTF-8/Windows-1251 mojibake", () => {
    const offenders = listTextFiles()
      .map((file) => ({
        file,
        text: readFileSync(file, "utf8"),
      }))
      .filter(({ text }) => mojibakePattern.test(text))
      .map(({ file, text }) => {
        const line =
          text
            .split("\n")
            .find((candidate) => mojibakePattern.test(candidate))
            ?.trim() ?? "";

        return `${file}: ${line.slice(0, 120)}`;
      });

    expect(offenders).toEqual([]);
  });
});

function listTextFiles() {
  return scannedRoots.flatMap(walk).filter((file) => {
    if (file.endsWith("package-lock.json")) {
      return false;
    }

    return scannedExtensions.has(extname(file));
  });
}

function walk(path: string): string[] {
  const stats = statSync(path);

  if (stats.isFile()) {
    return [path];
  }

  return readdirSync(path).flatMap((entry) => {
    if (entry === ".next" || entry === "node_modules") {
      return [];
    }

    return walk(join(path, entry));
  });
}
