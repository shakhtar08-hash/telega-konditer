# AI Pastry Assistant

Production-ready foundation for an AI-powered Telegram assistant for pastry chefs.

## Stack

- Next.js App Router
- TypeScript
- Vercel AI SDK
- grammY
- Prisma with Supabase Postgres
- Supabase Storage and Auth clients
- Tailwind CSS
- shadcn-style local UI primitives
- Zod and React Hook Form
- Vitest

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Fill `.env` before running the Telegram webhook or AI flows.

## Verification

```bash
npm run verify
```

## Architecture

Routes live in `src/app`. Telegram code lives in `src/bot` and delegates to feature services. Feature services live in `src/features`. AI agents live in `src/ai/agents` and call `AIService`. Prisma and repository code live in `src/db`.
