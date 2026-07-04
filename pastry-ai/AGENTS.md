# AI Pastry Assistant - Agent Context

This repository is a Next.js Telegram assistant for Russian-speaking pastry chefs.

# Project Instructions

Before starting any task:

- Read docs/architecture.md
- Read docs/database.md
- Read docs/prompts.md
- Read docs/decisions.md
- Read docs/roadmap.md

These documents are the source of truth.

Never change architecture, database schema, AI prompts or product behavior without checking these documents first.

After completing a task:
- Update docs/roadmap.md.
- If an architectural decision changed, update docs/decisions.md.
- If AI behavior changed, update docs/prompts.md.

## Commands

Run from `pastry-ai/`:

```bash
npm run dev
npm run test
npm run typecheck
npm run build
npm run seed
npx prisma generate
npx prisma migrate deploy
```

Use `npm run verify` for the full local check. It runs lint, typecheck, tests, and build.

## Project Rules

- Do not commit or push unless the user explicitly asks.
- Never put secrets, tokens, passwords, Supabase keys, Telegram tokens, or API keys in docs.
- `.env` is local/private. Use `.env.example` and docs for variable names only.
- Database changes need a Prisma migration in `prisma/migrations/`.
- After changing `prisma/schema.prisma`, run `npx prisma generate`.
- Keep Telegram bot behavior in `src/bot`, feature orchestration in `src/features`, AI calls in `src/ai`.
- Admin pages are server components under `src/app/admin`.
- User-facing bot/admin text should be Russian and valid UTF-8.

## Current Local Testing Setup

Local bot testing can use a separate Telegram bot token and ngrok:

1. Run local Next.js on `localhost:3000`.
2. Expose it with ngrok.
3. Set the test bot webhook to `https://<ngrok-url>/api/telegram/webhook`.

Do not reuse the production bot token for local webhook testing unless the user explicitly wants to move the production bot webhook.

## Documentation

После завершения любой задачи:

- Обнови docs/architecture.md, если изменилась архитектура.
- Обнови docs/api.md, если появились новые API.
- Обнови docs/database.md, если изменилась схема БД.
- Обнови docs/prompts.md, если изменились AI-промпты.
- Обнови docs/roadmap.md, отметив выполненные задачи.
- Обнови docs/decisions.md, если было принято архитектурное решение.

Документация должна всегда соответствовать текущему состоянию проекта.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
