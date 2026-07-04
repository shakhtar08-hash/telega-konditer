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

## Current State

The app can run locally and via ngrok. The test bot can point to the local webhook without touching production if it uses a separate Telegram token.

Admin data is stored in Supabase. If local and server use the same database, changes are shared.

## Near-Term Next Steps

- Test the local Telegram bot end to end:
  - `/start`
  - access/onboarding
  - dynamic menu buttons
  - recipe prompt, including long answers and `/stop`
  - dessert photo analysis
  - dessert photo styling
- Verify OpenRouter credentials or switch recipe prompt provider/model in admin for environments that only have `OPENAI_API_KEY`.
- Decide what to do with the seeded `Мой профиль` URL button. It currently points to `{{baseUrl}}/profile`, but the app does not yet have a full profile page.
- Add richer admin editing for `PhotoStyle` if needed.
- Add a deployment checklist for Coolify/Beget.
- Commit and push the current local changes when approved.

## Possible Later Features

- Separate development and production Supabase databases.
- Full web profile page.
- Subscription tier rules and usage limits.
- More detailed cost tracking per provider/model.
- Admin audit log for prompt/menu/settings changes.
- Bulk broadcasts and trigger chains.
- Better media storage for generated images.
