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
