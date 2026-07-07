# Roadmap

## Done

- Next.js foundation with admin login and protected admin routes.
- Prisma/Supabase schema and seed.
- Telegram bot foundation with grammY.
- Onboarding/funnel messages with images and buy buttons.
- CloudPayments webhook foundation.
- Manual user plan management in admin.
- Russian admin navigation and redesigned dashboard.
- Prompt editor with provider/model/system/user template fields.
- Managed API key settings.
- OpenRouter recipe and dessert photo analysis.
- Structured dessert photo analysis output.
- OpenAI image editing for dessert photo styling.
- 7 seeded photo styles for dessert photo generation.
- Dynamic bot menu buttons managed from `/admin/chat-bot`.
- Local ngrok testing flow with a separate Telegram test bot token.
- Working recipe-from-ingredients Telegram flow with text input, persistent session state, `/stop`, and long-answer splitting.
- Persistent Telegram session storage and webhook update deduplication to prevent repeated AI generations on Telegram retries.
- Recipe scenario re-entry now clears stale follow-up context so old ingredient requests are not reused after `/menu`, `/start`, or prompt re-selection.
- Recipe follow-up detection now keeps context for ingredient adjustment questions like `А если добавить...`, instead of treating them as a brand-new recipe search.
- Recipe follow-ups now go through deterministic intent parsing and recipe session state, so common actions like add/remove/replace ingredients stop behaving like independent one-shot prompt launches.
- Photoshoot feature: agent, service, bot photo handler, and admin-managed photo styles.
- Bot menu buttons: admin CRUD with Telegram-style preview, callback routing to prompts, URL buttons with `{{baseUrl}}` resolution.
- Fixed photo handler middleware chain: `photoshoot` and `vision` photo handlers now call `next()` when session doesn't match, preventing blocking of subsequent handlers.
- Fixed dessert photo analysis: updated AI SDK 7.x `ImagePart` to `FilePart`, added 120s timeout to `generateText`, split long responses to avoid Telegram 4096-char limit, localized error handler to Russian.
- Tariff/token access system: `TariffPlan`, `UserTariff`, `TokenUsage` models + migration.
- Admin CRUD for tariffs at `/admin/tariffs`; sidebar nav link fixed.
- Admin users page now manages real user tariffs directly: admin can assign/remove tariff, set token balance, and set expiry in one place.
- `TokenGuardService`: `ensureSufficientTokens`, `getAvailablePhotoSlots`, `chargeTokens`, `getUserTariffState`.
- `TariffPlanRepository`, `UserTariffRepository`, `TokenUsageRepository` with tests.
- Migration script (`prisma/migrate-legacy-users.mjs`) for existing users.
- Prisma migration config now prefers `DIRECT_URL` over pooled `DATABASE_URL`, and the tariff system migration has been applied to the current shared database.
- New users now receive the `promo` tariff automatically on first `/start` if they do not already have a tariff.
- Prompt access now depends on an active `UserTariff`; after tariff expiry, both text and image AI scenarios are blocked until a new tariff is assigned or purchased.
- RecipeAgent returns structured output (`RecipeOutput = { text, dishes }`) via `generateObject`.
- Recipe flows generate 0-4 photo examples via OpenRouter/FLUX, charged 1 token per successful send.
- Photoshoot and single-style photoshoot: pre-generation token check, post-send charge.
- CloudPayments webhook assigns `pastry-chef` tariff plan instead of legacy plan/credits.
- `userHasTokenAccess()` function added to `access.ts`.
- Expanded `recipe-from-ingredients` system prompt: detailed role, task, output format (8 sections per variant), selection rules, edge cases, and image description requirements.
- Admin photo-styles page: full CRUD — create, edit, delete styles with provider/model fields directly from admin panel.
- "Фото по стилю" bot button: shows all active photo styles as inline keyboard, lets user pick one, then processes photo in that single style.
- **"Поиск бесплатного урока" feature**: new `free-lesson` bot feature with AI agent, service, text handler, prompt (`free-lesson-search`), and bot menu button (sortOrder 5). Users write a topic and get curated free video lesson recommendations.
- **"Спросить кондитера" feature**: new `ask-chef` bot feature with AI agent, service, text handler, prompt (`ask-chef`), and bot menu button (sortOrder 6). Users ask any pastry-related question and get expert advice.
- **Recipe card templates redesign**: per-template layout functions (minimal, pinterest, luxury, dark) with proper block ordering and individual CSS.
- **Card auto-sizing**: compact/normal/long modes with density configuration (padding, fonts, gaps, hero height, max tips) based on content length.
- **Extended meta block**: nullable difficulty, storage, weight fields in AI schema + prompt, with strict RECIPE METADATA rules for AI generation.
- **Image handling fix**: hero block omitted entirely when no imageUrl available (no placeholder text, no emoji fallback).
- **Recipe card image crop fix**: changed aspect ratio from 3:4 to 16:9 for recipe card hero images; added English composition instructions to the image generation prompt to ensure the full dessert is visible without cropping.
- **Recipe card never clips content**: fullPage screenshot, auto-height cards, multi-page split for long recipes (2-3 pages), section subheading detection for ingredients/steps.

## Current State

The app can run locally and via ngrok. The test bot can point to the local webhook without touching production if it uses a separate Telegram token.

Admin data is stored in Supabase. If local and server use the same database, changes are shared.

**Tariff/token system is implemented.** Key facts:

**Known fix applied:** KIE API rejects `aspectRatio: "2:3"` (code 422). The `recipe-card` agent now passes `"3:4"` which KIE supports.
- Tariff plans (Промо, Кондитер, Мастер, Шеф-кондитер) are editable at `/admin/tariffs`.
- TokenGuardService handles all token checking and charging.
- Text AI scenarios require an active, non-expired tariff, but do not spend tokens themselves.
- Recipe flows return structured output (`{ text, dishes }`) with up to 4 AI-generated photo examples.
- Photos use OpenRouter/FLUX for text-to-image, charged at 1 token per successful send.
- Photoshoot (multi-image) checks all tokens before any generation; if insufficient, none are sent.
- CloudPayments webhook assigns `pastry-chef` tariff on successful payment.
- Existing user `credits` are migrated to `UserTariff` tokens via `prisma/migrate-legacy-users.mjs`.

## Near-Term Next Steps

- Run `prisma migrate deploy` on the production database to apply the new tariff system migration.
- Run `node prisma/migrate-legacy-users.mjs` to migrate existing users.
- Test the local Telegram bot end to end with the new tariff system:
  - `/start` → prompt menu
  - recipe prompt with photo generation (verify token charging)
  - dessert photo analysis (text only, no charge)
  - photoshoot with insufficient tokens (verify limit message)
  - photoshoot with sufficient tokens (verify charge)
- Add a deployment checklist for Coolify/Beget.
- Commit and push the current local changes when approved.

## Possible Later Features

- Separate development and production Supabase databases.
- Full web profile page (replace the `{{baseUrl}}/profile` stub).
- More detailed cost tracking per provider/model.
- Admin audit log for prompt/menu/settings changes.
- Bulk broadcasts and trigger chains.
- Better media storage for generated images.
- Multi-tariff purchase support (summing tokens, extending expiry).
