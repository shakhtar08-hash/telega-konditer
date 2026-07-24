# Roadmap

## Done

- **Admin navigation overhaul**:
  - Left sidebar extracted to client component (`sidebar.tsx`) with `usePathname()`-based active-state highlighting.
  - Nav items cleaned: `База знаний` → `Промты`, `AI-настройки` removed (single `Настройки` kept), `Триггеры` and `Рассылки` removed as top-level items, `История` and `Использование` accessible from sidebar.
  - New sidebar items order: Дашборд, Чат-бот, Пользователи, Тарифы, Стили фото, Промты, История, Использование, Настройки.
  - Active-state rules: `/admin/chat-bot`, `/admin/triggers`, `/admin/funnel` all highlight `Чат-бот`. Other sections match their path prefix.
- **Chat-bot section sub-navigation** (`ChatBotSubNav` component):
  - Shared local submenu on `/admin/chat-bot`, `/admin/triggers`, `/admin/funnel` with three tabs: `Меню`, `Триггеры`, `Воронка`.
  - Active tab correctly highlights based on current pathname.

- **Trigger automation redesign**:
  - `/admin/triggers` rebuilt around event-based rules with templates, event filters, searchable table, and dedicated create/edit pages.
  - Each trigger rule has exactly one event, supports multiple `AND` conditions, and can send immediately or after minutes, hours, or days.
  - Onboarding remains separate in `/admin/funnel`, while queued trigger sends keep a snapshot of `text`, `imageUrl`, and `buttons`.
- **Manual user groups rollout**:
  - Added `/admin/user-groups` with manual group creation, editing, deletion, and member management.
  - Added `/admin/users/[userId]` as a dedicated detail screen with tariff controls and manual group membership editing.
  - Trigger conditions now support structured manual-group membership via `userGroupId`, while system segments remain separate conditions.
  - Touched trigger admin screens are localized to Russian, and existing triggers can now be deleted explicitly from the edit form.

- Next.js foundation with admin login and protected admin routes.
- Prisma/Supabase schema and seed.
- Telegram bot foundation with grammY.
- Onboarding/funnel messages with images and buy buttons.
- CloudPayments webhook foundation.
- YooKassa redirect payment foundation for Telegram tariff purchases.
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
- YooKassa rollout for Telegram payments:
  - `POST /api/payments/yookassa/create` creates redirect payments for `pastry-chef`, `master`, and `head-chef`, then stores a pending internal `Payment` row.
  - `POST /api/payments/yookassa/webhook` verifies `payment.succeeded` with YooKassa before activating access, updates `Payment`, renews `UserTariff`, and upserts `Subscription`.
  - Telegram bot purchase actions now request the YooKassa payment link and send the returned `confirmationUrl` back to the user inside Telegram.
  - Current rollout prices: `Кондитер` - 990 RUB, `Мастер` - 1490 RUB, `Шеф-кондитер` - env-configured amount via `YOOKASSA_HEAD_CHEF_AMOUNT_RUB`.
  - Subscription/payment records now store reusable provider fields (`providerPaymentId`, `paymentMethodId`, `lastPaidAt`, `nextChargeAt`, failure timestamps) so recurring billing can be added later without another schema redesign.
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
- **Recipe card never clips content**: fullPage screenshot, structured multi-page split (карточка 1/2, 2/2 etc.), page 1 = photo+title+description+meta+ingredients, subsequent pages = steps+tips, never shrinks fonts or compresses content.
- **Per-recipe delivery with persistent context**: recipe results are now delivered one by one instead of as a merged text block. Each recipe is saved as a `GeneratedRecipeContext` record, sent as its own text, followed by a photo (if tokens allow), with inline action buttons. Follow-up actions (`create_recipe_card`, `recipe_recalculate`, `ask_chef_recipe`) load the saved context by `recipeId` with user ownership validation.
- **Recipe card service accepts saved context**: `createCard()` now accepts `recipeJson` and `imageUrl` from stored context. If `imageUrl` is provided, no new image is generated. Falls back to `recipeText` when `recipeJson` is absent.
- **Callback handlers for recipe-bound actions**: `create_recipe_card:<recipeId>` loads saved context and runs card generation with reuse of stored data. `recipe_recalculate:<recipeId>` and `ask_chef_recipe:<recipeId>` store the selected recipe in session (`selectedGeneratedRecipeId`, `selectedGeneratedRecipeText`) and switch scenario.
- **Follow-up context fallback fix**: `ask-chef` and `recipe-recalculation` now append the selected saved recipe context at runtime even if the editable prompt template omits `{{recipeContext}}`, which fixes lost-context follow-ups without changing the callback/session flow.
- **Recipe count contract fix**: recipe generation now targets `2-4` recipes for normal requests, prefers `3-4` when enough realistic options exist, and allows `1` recipe only as a fallback.
- **Cookie info for menu selection**: after choosing any feature, the bot now shows cookie cost + balance. Centralised in `cookie-info.ts` — paid/free/recipe-special messages with proper Russian pluralisation. Used by `prompt:` and `menu:` callback handlers.
- **Photoshoot unlimited styles**: the `listActive()` method no longer has a hardcoded limit of 7. The service, token guard, and user-facing text all use the actual count of active styles dynamically.
- **Explicit best-recipe-search branch**: `best-recipe-search` now has its own handler function (`handleBestRecipeSearch`) with a separate dispatch path, while still sharing the same recipe agent, photo generation, and per-recipe delivery.
- **Recipe count contract relaxed**: `1-4` recipes allowed; `1` is a normal valid response, not a fallback. The schema already supported this — only the prompt instructions and tests were updated.
- **New tests**: `cookie-info.test.ts` (16 tests), updated `photoshoot-service.test.ts` (no-limit), `recipe-agent.test.ts` (4-recipe test), `prompt-menu.test.ts` (no hardcoded "7 вариантов").
- **Security hardening (4 zones)**:
  - `/api/render-card` secured: requires `x-render-card-secret` header, body size limit (1MB), Playwright timeout (25s), rate limit (20/60s).
  - `/api/admin/login` protected: rate limit (5 attempts per 15 min per IP), timing-safe credential comparison via `timingSafeCompare`, failed-attempt tracking.
  - CRON endpoint (`/api/cron/process-triggers`) migrated from `?token=` query param to `Authorization: Bearer` header; changed from GET to POST.
  - SSRF guard for image URLs: `assertAllowedImageUrl()` validates all URLs before fetch/download. Allowlist includes Telegram file URLs, data URLs, and KIE result URLs. Blocks private IPs (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16), cloud metadata endpoints, localhost, .internal/.local domains.
  - New test files: `rate-limit.test.ts` (6 tests), `image-url-validator.test.ts` (18 tests). Updated existing provider tests to use allowed Telegram URLs.
- **Funnel improvements** (`buyButtons` array, `nextAction`, `promoClaimed`):
  - `FunnelStep.buyButtons` JSONB field for multiple pay buttons per step (text, url, active, sortOrder).
  - `FunnelStep.nextAction` field: `"next"` or `"activate_promo_and_next"`.
  - `User.promoClaimed` boolean — one-time promo flag (not tied to tariff status).
  - `migrateLegacyStep()` — auto-migrates `buyButtonText`/`buyButtonUrl` to `buyButtons` array.
  - `buildOnboardingKeyboard()` renders Далее + multiple sorted/active buy buttons.
  - `onboarding:n` callback handles `activate_promo_and_next`: checks `promoClaimed`, issues promo only once, sets `promoClaimed=true`.
  - Admin `/admin/funnel` UI: `AdminBuyButtonsEditor` — add/remove/edit/reorder/toggle pay buttons, `nextAction` selector.
  - `prisma/seed.mjs` updated with new fields.
  - New tests: `onboarding.test.ts` 15 tests (migration, keyboard, multiple buttons, promo), updated `funnel/page.test.tsx`.
- **Typed button actions for scenarios and funnel**:
  - Scenario buttons now support explicit action types for URL, scenario step transition, bot command, tariff purchase, and main menu.
  - Funnel buttons in `/admin/funnel` now use the same typed model with `Далее`, `Активировать промо + переход`, `Оплата тарифа`, and `Команда бота`, while still normalizing legacy URL-only buttons.
  - Onboarding and expired-tariff Telegram keyboards now render tariff-purchase and bot-command buttons from explicit button metadata instead of inferring them from raw links or text.
  - Added shared funnel button normalization helpers and refreshed admin/onboarding tests around the new button model.
- **Admin settings ingress runtime visibility**:
  - `/admin/settings` on `APP_ROLE=ingress` now reads masked runtime env previews from the RU internal admin bridge instead of showing most runtime variables as empty.
  - Added YooKassa runtime keys to the shared settings env list and `.env.example`.
- **"Return to menu" button in bot replies**:
  - `src/bot/menu-return.ts` — shared helper `addMenuKeyboard()`, `replyChunks()` for adding "📋 В меню" inline button.
  - Single callback `menu:return` registered in `start.ts` — clears session context, shows main menu.
  - Applied to: ask-chef, free-lesson, text-prompt (margin-calculator, recipe-recalculation), vision, recipe-card (callback replies, text fallback).
  - Not applied to: recipe results (already have action keyboards), style selection, photoshoot image sends.
  - New tests: `menu-return.test.ts` (6 tests).
- **Single-recipe delivery with "Create another recipe" follow-up**:
  - `recipe-agent.ts` now returns exactly 1 recipe (was 1-4) and accepts `excludeRecipes` to avoid repeating already-given recipes.
  - `recipe-service.ts` passes through `excludeRecipes`.
  - `BotSession` gains `recipeSearchQuery`, `givenRecipeIds`, `givenRecipeNames` — track original query and already-delivered recipes.
  - `clearScenarioSession()` clears these new fields on `/menu`, `/start`, `/stop`, or scenario switch.
  - `handleIngredientRecipe`/`handleBestRecipeSearch` now store the original query on first call and pass `givenRecipeNames` as exclusion list to the AI.
  - `buildRecipeActionKeyboard()` now includes "🍳 Создать ещё 1 рецепт" as the first button (alongside existing photo/card/recalculate/ask buttons).
  - New callback `create_another_recipe:<recipeId>`: loads stored query + exclusion list, generates a new unique recipe, saves it, updates `givenRecipeIds`/`givenRecipeNames`, sets new recipe as current active, and sends with full action keyboard.
  - Each new recipe automatically becomes the current active recipe for all follow-up actions.
  - `GeneratedRecipeContextRepository.create()` accepts `source: "create_recipe" | "create_another"`.
  - Updated tests: `recipe-agent.test.ts` (6 tests — 1-recipe contract, excludeRecipes), `recipes.test.ts` (5-button keyboard).
- **Expired-tariff promo abuse fix**:
  - `buildExpiredTariffKeyboard()` now accepts optional `promoClaimed` param; hides "Попробовать бесплатно" button when `promoClaimed = true`.
  - `sendExpiredTariffMessage()` in both `start.ts` and `command-actions.ts` fetches user's `promoClaimed` before building keyboard.
  - `try_free` callback handler now checks `promoClaimed` and rejects the attempt with a message if the user already claimed the promo.
  - New test: `start.test.ts` — "rejects try_free when promo already claimed".

**Promo/menu recovery fixes**:
- `assignPromoTariff()` now reissues the `promo` tariff when an existing `UserTariff` is expired, so `Попробовать бесплатно` restores real access instead of leaving the user on a stale expired tariff row.
- `menu:return` now resolves the current user and checks prompt access by internal `user.id`, which fixes menu reopening after callback flows.
- The onboarding callback path with `nextAction = activate_promo_and_next` now opens the main bot menu right after promo activation instead of trying to continue the funnel.
- Added regression tests in `user-service.test.ts` and `start.test.ts`.
- **Dashboard real metrics activated**:
  - `Рецепты создано`: `prisma.generatedRecipeContext.count()` (was fake conversation count).
  - `Фото сгенерировано`: `prisma.tokenUsage.aggregate({ _sum: { imagesSent: true } })` (was fake computed value).
  - `Расходы на API`: `prisma.usage.aggregate({ _sum: { cost: true } })`.
  - `Генерации по типам`: donut from `prisma.usage.groupBy({ by: ["feature"] })` mapped to categories — no hardcoded percentages.
  - Removed fake delta strings and unused queries.
- **New tests**: `sidebar.test.ts` (12), `chat-bot-subnav.test.ts` (4); updated `admin-pages.test.ts`, `dashboard-page.test.tsx`, `chat-bot/page.test.tsx`.
- **History + Usage logging system**:
  - Extended `Usage` model with fields: `provider`, `model`, `status`, `errorMessage`, `conversationId` — migration applied.
  - `UsageLogService` (`src/db/repositories/usage-log-service.ts`): centralized AI provider usage logging with `recordSuccess` and `recordError`. Records userId, feature, provider, model, tokens, cost, latency, status, errorMessage, conversationId.
  - `ConversationLogService` (`src/db/repositories/conversation-log-service.ts`): centralized dialog history logging. `startConversation`, `appendUserMessage` (text or `[photo]`), `appendAssistantMessage` (with nullable model), `appendErrorMessage` (SYSTEM role).
  - `InstrumentedAIService` (`src/ai/provider/instrumented-ai-service.ts`): wraps any `AIService` to auto-record usage on every `generateText`/`generateObject`/`generateImage` call with latency measurement.
  - History logging wired into all AI bot handlers: recipes, text-prompt, vision, photoshoot, free-lesson, ask-chef.
  - Instrumented AI service ready for webhook route integration.
  - `/admin/usage` page updated with columns: пользователь, функция, провайдер, модель, токены, стоимость, latency, статус, ошибка.
  - Dashboard API Usage block now shows real per-provider costs (OpenRouter, OpenAI, KIE) from `Usage.groupBy` — no hardcoded data.
  - New tests: `usage-log-service.test.ts` (4), `conversation-log-service.test.ts` (7), `instrumented-ai-service.test.ts` (5), `logging-integration.test.ts` (2).
- **Admin image upload**:
  - Shared upload helper `saveAdminImage` (`src/app/admin/_lib/save-admin-image.ts`) — validates image type/size, writes to `public/uploads/admin/<entity>/`, returns web path.
  - Shared UI component `AdminImageField` (`src/components/admin/form.tsx`) — combines text input, file picker, and preview.
  - Added `TriggerMessage.imageUrl` nullable field (migration + server action support).
  - Fixed `/admin/chat-bot` create action: `previewImageUrl` now actually persisted (was read but dropped).
  - Wired image upload into `/admin/triggers`, `/admin/chat-bot`, `/admin/funnel`, `/admin/photo-styles` — all accept file upload or manual URL.
  - Priority rule: uploaded file overrides manual text when both provided.
  - New tests: `save-admin-image.test.ts` (6), `form.test.tsx` (2), updated trigger actions test (7).

## Current State

The app can run locally and via ngrok. The test bot can point to the local webhook without touching production if it uses a separate Telegram token.

Admin data is stored in Supabase. If local and server use the same database, changes are shared.

**Trigger rules are now event-based automations with templates, condition builder, immediate or delayed sending, and dedicated create/edit screens on `/admin/triggers`.**

**Manual user groups are now a first-class admin feature:** `/admin/user-groups` manages hand-made segments, `/admin/users/[userId]` lets admins edit memberships per user, and triggers can target those groups through a structured audience condition.

**Admin image upload:** `/admin/triggers`, `/admin/chat-bot`, `/admin/funnel`, `/admin/photo-styles` accept either manual URL/path or local file upload. Files stored under `public/uploads/admin/...`. Shared helper `saveAdminImage` and shared UI component `AdminImageField` reused across all pages.

**Scheduled-message tracking redesigned:**
- `ScheduledMessage` now stores `triggerRuleId`, `triggerEventKey`, `triggeredAt`, and a full payload snapshot (`text`, `imageUrl`, `buttons`).
- One product event can enqueue multiple pending trigger sends when several active rules match the same user state.
- Queue processing sends the stored snapshot as-is, so later trigger edits do not rewrite already queued messages.

**Tariff/token system is implemented.** Key facts:

**Caddy edge is live:** As of July 21, 2026, `eu-edge-caddy` (Caddy) serves public `80/443` with automatic Let's Encrypt TLS, proxying to the EU gateway on `3001`. The old `coolify-proxy` (Traefik) and legacy Coolify application have been retired.

**Phase G complete:** 72-hour observation window passed without rollback. Caddy cutover performed. Legacy app container removed. Remaining Coolify infrastructure services removed on July 22, 2026 — all containers stopped and removed, volumes deleted, data directory cleaned, images pruned, and the `coolify` Docker network deleted.

**Admin navigation is cleaned up:**
- Left sidebar has correct active-state based on pathname via `usePathname()`.
- `Чат-бот` section groups `/admin/chat-bot`, `/admin/triggers`, `/admin/funnel` with shared subnav.
- `База знаний` → `Промты`, removed `AI-настройки`, `Триггеры`, `Рассылки` from sidebar.
- `История` and `Использование` accessible from sidebar.

**Dashboard uses real metrics:** Рецепты создано (GeneratedRecipeContext), Фото сгенерировано (TokenUsage.imagesSent), Расходы на API (Usage.cost), Генерации по типам (Usage.feature groupBy). API Usage block shows real per-provider costs.

**History and Usage logging system is implemented:**
- `UsageLogService`, `ConversationLogService`, `InstrumentedAIService` — centralized logging with unit tests.
- All AI bot handlers log conversation history (user input, assistant response, errors).
- Usage auto-recorded via instrumented AI service wrapping every provider call.
- `/admin/history` and `/admin/usage` pages show real data with all required columns.
- `Usage` model extended with provider, model, status, errorMessage, conversationId.

**Known fix applied:** KIE API rejects `aspectRatio: "2:3"` (code 422). The `recipe-card` agent now passes `"3:4"` which KIE supports.

- **Phase G — Migration completion**:
  - 72-hour observation window (2026-07-16T20:45:40Z → 2026-07-19T20:45:40Z) completed successfully — no rollback triggered.
  - **Caddy cutover**: `coolify-proxy` (Traefik) stopped, `eu-edge-caddy` started on ports 80/443 with automatic Let's Encrypt TLS for `eu-gateway.194.113.209.251.sslip.io`.
  - **Legacy app retired**: old Coolify-managed production container stopped and removed.
  - **Verification**: public HTTPS health check (200 OK), HTTP→HTTPS redirect (308), synthetic webhook test (200 OK) all confirmed.
  - **Secret rotation**: planned as separate follow-up.
  - Remaining Coolify infrastructure services (core, db, redis, realtime, sentinel) are still on the EU server but idle — removal deferred to separate cleanup.
- Tariff plans (Промо, Кондитер, Мастер, Шеф-кондитер) are editable at `/admin/tariffs`.
- TokenGuardService handles all token checking and charging.
- Text AI scenarios require an active, non-expired tariff, but do not spend tokens themselves.
- Recipe flows return structured output (`{ text, dishes }`) with photo examples for all generated recipes (up to 4, limited by available tokens).
- Photos use OpenRouter/FLUX for text-to-image, charged at 1 token per successful send.
- Photoshoot (multi-image) uses ALL active styles (no limit); checks all tokens before any generation; if insufficient, none are sent.
- CloudPayments webhook assigns `pastry-chef` tariff on successful payment.
- YooKassa now covers the RU Telegram tariff purchase flow end to end: bot -> create route -> YooKassa redirect -> verified webhook activation.
- Existing user `credits` are migrated to `UserTariff` tokens via `prisma/migrate-legacy-users.mjs`.

## Near-Term Next Steps

- Configure and test recurring charges with YooKassa using the stored payment method data if the production account supports recurring payments on the chosen flow.
- End-to-end test of the new per-recipe delivery flow:
  - recipe prompt → multiple recipes delivered individually
  - each recipe with inline buttons
  - `create_recipe_card` callback → card generated from saved context
  - `recipe_recalculate` callback → scenario switches to recalculation
  - `ask_chef_recipe` callback → scenario switches to ask-chef
- Rotate any exposed or transitional secrets from the migration.

## Possible Later Features

- Separate development and production Supabase databases.
- Full web profile page (replace the `{{baseUrl}}/profile` stub).
- More detailed cost tracking per provider/model.
- Admin audit log for prompt/menu/settings changes.
- Bulk broadcasts and trigger chains.
- Better media storage for generated images.
- Multi-tariff purchase support (summing tokens, extending expiry).
