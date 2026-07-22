import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { recipeCardOutputSchema } from "@/ai/schemas/recipe-card";
import { renderRecipeCardHtml } from "@/components/recipe-card/RecipeCard";
import { loadEnv } from "@/lib/env";
import { getChromiumLaunchOptions } from "@/lib/playwright-launch";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 1024 * 1024;
const RENDER_TIMEOUT_MS = 25_000;

export async function POST(request: Request) {
  const env = loadEnv();
  const authHeader = request.headers.get("x-render-card-secret");

  if (authHeader !== env.RENDER_CARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateKey = `render-card:${getRateLimitKey(request)}`;
  const rateResult = checkRateLimit(rateKey, 20, 60_000);

  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  try {
    const text = await request.text();

    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const body = JSON.parse(text);
    const parsed = recipeCardOutputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const html = renderRecipeCardHtml(parsed.data);

    const browser = await chromium.launch(getChromiumLaunchOptions());
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1620 },
    });

    await page.setContent(html);
    const screenshot = await page.screenshot({ type: "png", timeout: RENDER_TIMEOUT_MS });
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
