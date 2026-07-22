// @ts-check
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

// Mojibake → correct Russian mapping.
// The corrupted string appears when original UTF-8 bytes of Russian text
// are interpreted as Windows-1251 and then re-saved as UTF-8.
//
// Use: Run once to fix existing broken files, then rely on check-encoding.mjs
// to prevent new corruption.
const FIXES = {
  "\u0420\u045F\u0421\u0402\u0456\u0420\u0456\u0420\u0406\u0420\u0405\u0421\u201A": "Привет",
  "\u0420\u201D\u0420\u00B0\u0420\u00BB\u0420\u00B5\u0420\u00B5": "Далее",
  "\u0420\u2014\u0421\u0402\u0420\u0455\u0420\u0454 \u0420\u0491\u0420\u00B5\u0420\u0457\u0421\u0403\u0421\u201A\u0420\u0406\u0420\u0456\u0421\u040F \u0420\u0406\u0420\u00B0\u0421\u20AC\u0420\u00B5\u0420\u0456\u0420\u0455 \u0421\u201A\u0420\u00B0\u0421\u0402\u0420\u0456\u0421\u201E\u0420\u00B0 \u0420\u0456\u0421\u0403\u0421\u201A\u0421\u2018\u0454\u0420\u0454":
    "Срок действия вашего тарифа истёк",
  "\u0420\u00A7\u0421\u201A\u0420\u0455\u0420\u00B1\u0421\u2039 \u0420\u0457\u0421\u0402\u0420\u0455\u0420\u0491\u0420\u0455\u0420\u00BB\u0420\u00B6\u0420\u0456\u0421\u201A\u0421\u0402 \u0420\u0457\u0420\u0455\u0420\u00BB\u0421\u0402\u0420\u00B7\u0420\u0455\u0420\u0406\u0420\u00B0\u0421\u201A\u0421\u0402\u0421\u0403\u0421\u040F \u0420\u00B1\u0420\u0455\u0421\u201A\u0420\u0455\u0420\u0458":
    "Чтобы продолжить пользоваться ботом",
  "\u0420\u0455\u0420\u0457\u0420\u00BB\u0420\u00B0\u0421\u201A\u0420\u0456\u0421\u201A\u0420\u00B5 \u0420\u0405\u0420\u0455\u0420\u0406\u0421\u0453\u0421\u040E \u0420\u0457\u0420\u0455\u0420\u0491\u0420\u0457\u0420\u0456\u0421\u0403\u0420\u0454\u0421\u0453":
    "оплатите новую подписку",
  "\u0420\u0451\u0420\u0457\u0420\u00BB\u0420\u00B0\u0421\u201A\u0420\u0456\u0421\u201A\u0421\u0402": "Оплатить",
  "\u0420\u0451\u0420\u0457\u0420\u00BB\u0420\u00B0\u0421\u201A\u0420\u0456\u0421\u201A\u0421\u0402\u0421\u0402 \u0420\u00B1\u0420\u00B5\u0421\u0403\u0420\u0457\u0420\u00BB\u0420\u00B0\u0421\u201A\u0420\u0405\u0420\u0455": "Оплатить бесплатно",
  "\u0420\u00A7\u0421\u0403\u0421\u201A\u0420\u0455\u0421\u0402\u0420\u0456\u0421\u040F 1: \u0420\u0452\u0420\u00B0\u0421\u0402\u0420\u0456\u0421\u040F \u0420\u0457\u0420\u0455\u0420\u00BB\u0421\u0453\u0421\u2021\u0420\u0456\u0420\u00BB\u0420\u00B0 \u0421\u0402\u0420\u00B5\u0420\u00B0\u0420\u00BB\u0420\u0456\u0421\u0403\u0421\u201A\u0420\u0456\u0421\u2021\u0420\u0405\u0421\u2039\u0420\u00B5 \u0421\u0403\u0421\u201A\u0421\u0453\u0420\u0491\u0420\u0456\u0420\u0459\u0420\u0405\u0421\u2039\u0420\u00B5 \u0420\u0455\u0420\u00B1\u0421\u0402\u0420\u00B0\u0420\u00B7\u0421\u2039.":
    "История 1: Мария получила реалистичные студийные образы.",
  "1 \u0420\u0458\u0420\u0455\u0420\u0491\u0420\u00B5\u0420\u00BB\u0421\u0402 \u0420\u0456 \u0421\u0402\u0420\u0455 \u0421\u201E\u0420\u0455\u0421\u201A\u0420\u0455 | 899\u201A\u0402\u00BD": "1 модель и 70 фото | 899₽",
};

function applyFixes(content) {
  let result = content;
  for (const [corrupted, fixed] of Object.entries(FIXES)) {
    if (result.includes(corrupted)) {
      result = result.replaceAll(corrupted, fixed);
    }
  }
  return result;
}

let fixedCount = 0;

try {
  const gitFiles = execSync("git ls-files", {
    cwd: ROOT,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const file of gitFiles) {
    const fullPath = resolve(ROOT, file);
    if (!existsSync(fullPath)) continue;

    const original = readFileSync(fullPath, "utf8");
    const fixed = applyFixes(original);

    if (original !== fixed) {
      writeFileSync(fullPath, fixed, "utf8");
      console.log(`✓ FIXED: ${file}`);
      fixedCount++;
    }
  }

  if (fixedCount === 0) {
    console.log("No mojibake found. All files clean.");
  } else {
    console.log(`\nFixed ${fixedCount} file(s).`);
  }
} catch (err) {
  console.error("fix-mojibake failed:", err.message);
  process.exit(1);
}