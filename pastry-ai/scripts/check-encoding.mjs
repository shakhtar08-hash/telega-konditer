// @ts-check
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

// Standard Russian Cyrillic code points
const RUSSIAN = new Set([
  // Ё
  0x0401,
  // А-Я
  ...Array.from({ length: 0x042f - 0x0410 + 1 }, (_, i) => 0x0410 + i),
  // а-я
  ...Array.from({ length: 0x044f - 0x0430 + 1 }, (_, i) => 0x0430 + i),
  // ё
  0x0451,
]);

// Cyrillic characters OUTSIDE standard Russian — these indicate mojibake
const NON_RUSSIAN_CYRILLIC = Array.from(
  { length: 0x04ff - 0x0400 + 1 },
  (_, i) => 0x0400 + i,
).filter((cp) => !RUSSIAN.has(cp));

const SEARCH_RE = new RegExp(
  `[${NON_RUSSIAN_CYRILLIC.map((cp) => `\\u${cp.toString(16).padStart(4, "0")}`).join("")}]`,
  "u",
);

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".sql",
  ".css",
  ".sh",
  ".ps1",
]);

const SKIP_DIRS = ["node_modules", ".next", ".git", "coverage", ".superpowers"];

function shouldCheck(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf("."));
  if (!EXTENSIONS.has(ext)) return false;
  for (const dir of SKIP_DIRS) {
    if (filePath.includes(`${dir}/`) || filePath.includes(`\\${dir}\\`))
      return false;
  }
  return true;
}

let exitCode = 0;

try {
  const gitFiles = execSync("git ls-files", {
    cwd: ROOT,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);

  let found = false;

  for (const file of gitFiles) {
    const fullPath = resolve(ROOT, file);
    if (!existsSync(fullPath)) continue;
    if (!shouldCheck(file)) continue;

    const content = readFileSync(fullPath, "utf8");
    const match = content.match(SEARCH_RE);
    if (match) {
      console.error(
        `MOJIBAKE: ${file}  (U+${match[0]
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()} "${match[0]}")`,
      );
      found = true;
      exitCode = 1;
    }
  }

  if (!found) {
    console.log("✓ No mojibake found");
  } else {
    console.error(
      "\nNon-Russian Cyrillic characters detected — likely mojibake from encoding corruption.",
    );
    console.error("Fix by re-saving affected files as UTF-8 without BOM.");
  }
} catch (err) {
  console.error("check-encoding failed:", err.message);
  process.exit(1);
}

process.exit(exitCode);