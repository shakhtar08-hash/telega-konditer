# API and Integrations

This file lists integration surfaces and environment variables. It must not contain real secrets.

## Environment Variables

Required or commonly used:

- `DATABASE_URL` - pooled Supabase Postgres URL.
- `DIRECT_URL` - direct Supabase Postgres URL when needed.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `APP_BASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`

Some API keys can also be stored in `ApiSecret` through the admin settings page.

## Telegram

Webhook route:

```text
POST /api/telegram/webhook
```

The route checks:

```text
x-telegram-bot-api-secret-token == TELEGRAM_WEBHOOK_SECRET
```

The route also deduplicates Telegram retries by claiming each incoming `update_id` in `TelegramSession`. If Telegram redelivers an already claimed update, the route immediately returns `200 OK` and skips bot handlers, preventing repeated AI generations.

Set webhook example:

```bash
curl -X POST "https://api.telegram.org/bot<token>/setWebhook" \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com/api/telegram/webhook","secret_token":"<secret>","drop_pending_updates":true}'
```

Use a separate bot token for local ngrok testing to avoid changing the production bot webhook.

## Payments

CloudPayments integration lives in:

```text
src/app/api/payments/cloudpayments/route.ts
src/features/payments/cloudpayments.ts
```

Payment records are stored in `Payment`, and user access/token balance is represented by `UserTariff` (backed by `TariffPlan`). On successful payment, the webhook assigns the `pastry-chef` tariff plan via `UserTariff.upsert`, replacing the old tariff completely.

## AI Providers

Provider implementation:

```text
src/ai/provider/openai-provider.ts
```

Despite the filename, it handles:

- OpenAI via `@ai-sdk/openai`.
- OpenRouter via OpenAI-compatible `baseURL`.
- OpenAI Images Edits through direct `fetch` to `/v1/images/edits`.

## Admin Auth

Admin login routes:

```text
POST /api/admin/login
POST /api/admin/logout
```

Auth utilities live in `src/lib/admin-auth.ts`.

## Supabase

Supabase client helpers live in:

```text
src/lib/supabase/admin.ts
src/lib/supabase/browser.ts
src/lib/supabase/server.ts
```

The main application database access currently goes through Prisma.
