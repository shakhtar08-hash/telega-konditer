# Decisions

This document records project decisions so future chats do not need the full conversation history.

## Use Repo Docs as Durable Context

Decision: keep architecture, database, prompts, API, decisions, and roadmap in repo docs.

Reason: reduce token usage in new Codex chats and give second developers a stable project map.

## Russian-First Product

Decision: user-facing bot/admin text should be Russian.

Reason: target customers are in Russia/Russian-speaking market.

## Supabase as Shared Database

Decision: local and deployed app can point at the same Supabase project during development.

Reason: faster iteration and simpler admin testing.

Trade-off: local admin edits affect server-visible data if both environments share `DATABASE_URL`.

## Separate Test Bot for Local ngrok

Decision: local webhook testing should use a separate Telegram bot token.

Reason: Telegram allows only one webhook per bot token. A separate token avoids taking production offline.

## OpenRouter for Vision

Decision: dessert photo analysis uses OpenRouter with a strong multimodal model.

Reason: the feature needs high-quality visual reasoning and structured output.

## OpenAI for Image Editing

Decision: dessert photo styling uses OpenAI `gpt-image-1` image edits.

Reason: the feature takes an input dessert photo and returns styled variants; image editing is a better fit than text-only generation.

## Remove Fal AI

Decision: Fal AI is not part of the active provider setup.

Reason: simplify provider surface and avoid extra cost/configuration while using OpenAI/OpenRouter.

## Bot Menu from Database

Decision: main Telegram menu is driven by `BotMenuButton` records.

Reason: admin needs to change button text, order, visibility, prompt bindings, and URL actions without code changes.

## Persistent Telegram Session

Decision: grammY session state is stored in Postgres through `TelegramSession`, not only in process memory.

Reason: the Next.js webhook route creates bot instances per request, and Telegram interactions arrive as separate webhook requests. Persistent session is required for prompt selection, recipe follow-ups, and `/stop` to work reliably.

## Deduplicate Telegram Webhook Updates

Decision: claim each Telegram `update_id` in `TelegramSession` before running bot handlers.

Reason: Telegram retries webhook updates when a request times out or returns an error. AI calls can be slow or produce send errors, so claiming updates before work starts prevents duplicate recipe generations from the same Telegram message.

Trade-off: if a handler crashes after the claim, Telegram will not retry that exact update. The app should log the error and give the user a new command path rather than risk repeated paid AI calls.

## Split Long Telegram AI Answers

Decision: recipe text answers are split into multiple Telegram messages before sending.

Reason: generated recipes can exceed Telegram's per-message limit. Splitting avoids `Bad Request: message is too long` and prevents retry loops from long outputs.

## Admin as Operational UI

Decision: admin panel should be dense, dark, utilitarian, and Russian.

Reason: it is an operational surface for repeated management tasks, not a landing page.

## Do Not Auto-Push

Decision: do not commit/push unless explicitly requested.

Reason: user wants to review larger local changes before GitHub updates.

## Tariff/Token Access Instead of Plan Model

Decision: replace FREE/PRO/TEAM plan enum with editable `TariffPlan` records and token-based image access.

Reason: the old three-plan model was rigid and couldn't be changed without code. The new system lets admins create/edit tariffs with custom token amounts and durations, charge 1 token per sent image, and keep text scenarios token-free while access is still governed by an active tariff. Business rules (batch token check, recipe flow exceptions, full tariff replacement on purchase) are centralized in `TokenGuardService`.

Key rules:
- 1 sent image = 1 token, charged AFTER successful `ctx.replyWithPhoto()`.
- Text responses are never charged.
- Batch image flows (photoshoot) check all required tokens before ANY generation.
- Recipe flows use special logic: text always sent, photos up to min(dishes.length, remainingTokens, 4).
- New purchase fully replaces old tariff (tokens and expiry discarded).
- Expired tariff → images blocked, unused tokens lost.

## Prompt Access by Active Tariff

Decision: access to Telegram AI scenarios is determined by active `UserTariff`, not by legacy `FREE/PRO/TEAM` user plan labels.

Reason: the product now sells and administers editable tariffs. Keeping prompt access on the legacy plan model would create conflicting access states between admin UI and bot behavior.

Key rules:
- New users receive the `promo` tariff on their first `/start` if they do not have a tariff yet.
- Text AI scenarios require an active, non-expired tariff, but do not spend tokens by themselves.
- Image scenarios require an active tariff and spend tokens according to the feature rules.
- Expired tariff -> both text and image AI scenario access are blocked until a new tariff is assigned or purchased.

## KIE for Seeded Dessert Photo Styling

Decision: the seeded `Создать фото` flow uses KIE `flux-kontext-pro`.

Reason: the feature takes an input dessert photo and returns styled variants, and the current seeded prompt/photo-style setup is configured around KIE image-to-image generation.

## KIE Flux Kontext for Recipe Photo Generation

Decision: recipe photo examples use KIE `flux-kontext-pro` for text-to-image generation.

Reason: the current KIE integration accepts `flux-kontext-pro` for recipe photo generation, while the attempted OpenRouter image path was not working in this project setup.

## Caddy Replaces Coolify/Traefik as Public Edge

Decision: on July 21, 2026, after the 72-hour observation window, `coolify-proxy` (Traefik) was stopped and `eu-edge-caddy` (Caddy) was started on ports 80/443.

Reason: the Coolify-managed Traefik proxy was the last Coolify dependency in the application request path. Caddy provides automatic Let's Encrypt TLS, simpler configuration, and can be deployed as a standalone Docker Compose stack without the Coolify orchestration layer. The cutover removes the operational dependency on Coolify for the public edge while keeping Coolify infrastructure services running on the server for rollback safety.

Key rules:
- Caddy proxies `eu-gateway.194.113.209.251.sslip.io` to `host.docker.internal:3001`
- The EU gateway container on port 3001 is unchanged by the proxy cutover
- Rollback: stop Caddy, restart `coolify-proxy`, and Traefik resumes routing from its existing Docker labels

## Structured Recipe Output

Decision: recipe agents return `{ text, dishes }` (via `generateObject`) instead of plain text.

Reason: the recipe flow now generates photo examples of suggested desserts. Structured output (`dishes[]` with `name` and `description`) gives the handler deterministic access to dish data for image generation, avoiding brittle text parsing.

## Generated Recipe Context

Decision: each generated recipe is saved as a durable `GeneratedRecipeContext` record with its own `recipeId`, and follow-up actions are bound to that `recipeId`.

Reason: the old flow merged all recipes into one text block with no persistent reference to individual recipes. Per-recipe delivery improves readability, and durable context with `recipeId` binding ensures follow-up actions (card, recalculation, ask-chef) can load the exact saved recipe without asking the user to re-paste text. Storing context in the database (not session) survives scenario switches and allows future cross-session access.

Key rules:
- One `GeneratedRecipeContext` record per generated recipe.
- Callback data encodes the `recipeId` directly so no server-side lookup is needed to find the target.
- Ownership is validated on every callback: `findByIdForUser(id, userId)` returns null if the record belongs to another user.
- Recipe-card generation from context reuses saved `recipeJson`/`imageUrl` when available; no new image is generated if one already exists.
- Recalculation and ask-chef callbacks store `selectedGeneratedRecipeId`/`selectedGeneratedRecipeText` in session to pass context to the text handler.
