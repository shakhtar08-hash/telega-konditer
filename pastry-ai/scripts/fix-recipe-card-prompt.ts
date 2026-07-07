import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const allPrompts = await prisma.prompt.findMany({
    where: { slug: "recipe-card" },
    orderBy: { version: "desc" },
  });

  console.log(`Found ${allPrompts.length} recipe-card prompts:\n`);
  for (const p of allPrompts) {
    console.log(`  id=${p.id} version=${p.version} active=${p.active} provider=${p.provider} model=${p.model}`);
  }

  // Also check what the prompt loader would return (active + latest version)
  const activePrompt = allPrompts.find((p) => p.active);
  if (activePrompt) {
    console.log(`\nActive prompt: provider=${activePrompt.provider} model=${activePrompt.model}`);
    if (activePrompt.provider !== "openrouter" || activePrompt.model !== "google/gemini-2.5-pro") {
      console.log("Fixing active prompt...");
      await prisma.prompt.update({
        where: { id: activePrompt.id },
        data: {
          provider: "openrouter",
          model: "google/gemini-2.5-pro",
        },
      });
      console.log("Fixed.");
    } else {
      console.log("Active prompt already correct.");
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});