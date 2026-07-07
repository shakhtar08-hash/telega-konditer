import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { recipeCardOutputSchema } from "@/ai/schemas/recipe-card";
import { renderRecipeCardHtml } from "@/components/recipe-card/RecipeCard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = recipeCardOutputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const html = renderRecipeCardHtml(parsed.data);

    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1620 },
    });

    await page.setContent(html);
    const screenshot = await page.screenshot({ type: "png" });
    await browser.close();

    return new NextResponse(new Uint8Array(screenshot), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(screenshot.length),
      },
    });
  } catch (error) {
    console.error("Render card failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}