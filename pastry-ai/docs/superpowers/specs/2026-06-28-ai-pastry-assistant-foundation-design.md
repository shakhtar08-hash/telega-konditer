# AI Pastry Assistant Foundation Design

Date: 2026-06-28
Status: Approved for planning

## Goal

Create a production-ready foundation for an AI-powered Telegram assistant for pastry chefs. The first delivery is an extensible project scaffold, not complete feature implementation.

The existing `pastry-ai` Next.js App Router project is the application root. The root-level dependencies currently outside `pastry-ai` should be normalized into the app during implementation.

## Recommended Approach

Use a single modular Next.js application with feature-first architecture.

This keeps the Telegram webhook, admin dashboard, AI layer, Prisma database access, Supabase clients, and shared services in one deployable Vercel app while preserving clean internal boundaries. A monorepo is not needed for the initial foundation, and a bot-first implementation would make the admin, prompt, and usage systems harder to add cleanly later.

## Source Layout

The app should move from the generated `app/` directory to a `src/` tree:

```text
src/
  app/
    api/
      telegram/
        webhook/
    admin/
    login/
  bot/
    commands/
    conversations/
    handlers/
    menus/
    middleware/
  features/
    carousel/
    photoshoot/
    recipes/
    users/
    vision/
  ai/
    agents/
    prompts/
    provider/
    registry/
    schemas/
  db/
  lib/
  types/
```

Routes and pages compose UI and HTTP boundaries only. Business rules live in feature services. Telegram handlers delegate to services and never call AI providers, Prisma, or Supabase directly.

## Application Boundaries

### Telegram Bot

grammY is used through a webhook route at `src/app/api/telegram/webhook/route.ts`.

The bot layer owns:

- bot creation and webhook callback wiring
- commands: `/start`, `/help`, `/profile`
- middleware: auth, logger, subscription, error handling, session
- inline keyboard menus and thin handlers

Handlers convert Telegram updates into service inputs, call feature services, and render Telegram replies. They do not contain recipe, vision, photoshoot, carousel, subscription, prompt, or usage logic.

### Feature Services

Each feature owns its schema, service, repository dependency, and public exports.

Initial feature modules:

- `recipes`: recipe from ingredient text
- `vision`: dessert identification from uploaded photo metadata or image input
- `photoshoot`: generated product photo request orchestration
- `carousel`: Instagram carousel content generation
- `users`: Telegram user registration and profile lookup

MVP service implementations can be thin, but they should expose stable typed methods for the bot and future admin/API clients.

### AI Layer

All model interaction goes through a reusable `AIService`.

Required methods:

- `generateText()`
- `generateObject()`
- `generateImage()`

Feature code calls agents, and agents call `AIService`. Providers are isolated in `src/ai/provider` so future multi-model support does not leak into features.

Initial agents:

- `RecipeAgent`
- `VisionAgent`
- `PhotoshootAgent`
- `CarouselAgent`

Each agent exposes `execute(input)` and owns its prompt slug, schema, model settings, and tool configuration.

### Prompt System

Prompts are not hardcoded inside feature services or bot handlers.

The database `Prompt` entity stores:

- `id`
- `slug`
- `feature`
- `systemPrompt`
- `userTemplate`
- `model`
- `temperature`
- `active`
- `version`

A prompt loader in `src/ai/prompts` resolves active prompts by feature and slug. Seed or fallback prompts may exist as typed constants during the foundation phase, but runtime code should be shaped around the database-backed loader.

### Database

Prisma is the ORM for Supabase Postgres. The schema should include:

- `User`
- `Conversation`
- `Message`
- `Prompt`
- `PhotoStyle`
- `CarouselTemplate`
- `Usage`
- `Subscription`

Repositories provide the access layer for services. The initial foundation should include Prisma client setup, schema models, and representative repositories where service code needs them.

### Supabase

Supabase is used for Postgres, Storage, and future Auth.

The foundation should include:

- browser/server Supabase clients in `src/lib/supabase`
- environment validation for Supabase URLs and keys
- storage-ready structure for uploaded dessert photos and generated product images

Full auth flows can remain placeholder routes in the first foundation slice.

### Admin Dashboard

The admin area uses Next.js App Router pages under `src/app/admin`.

Initial pages:

- Dashboard
- Users
- Prompts
- Photo Styles
- Carousel Templates
- History
- Usage
- Settings

The foundation should include an admin layout, navigation, dashboard cards, and placeholder data wiring. The UI should be functional enough to establish structure without pretending full CRUD is done.

### UI Stack

Use Tailwind CSS and shadcn/ui-style primitives. If the latest shadcn installer cannot be used because network access is unavailable, create compatible local components for the foundation and document that the formal shadcn install remains a follow-up.

React Hook Form and Zod should be installed and used where forms are introduced, especially prompt/style/template admin forms in later slices.

## Environment

Create `.env.example` with:

```text
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
```

Runtime env access should go through typed validation instead of direct scattered `process.env` reads.

## Testing and Verification

Use TypeScript strictness and automated verification as the first safety net.

Initial tests should focus on architecture-critical behavior:

- AI agents call `AIService`, not providers directly
- prompt loader resolves active prompts and rejects missing prompts predictably
- Telegram handlers delegate to services
- webhook route validates the Telegram secret
- service schemas validate MVP inputs and outputs

The foundation is complete when `npm run build` and the chosen test/lint commands pass from `pastry-ai`.

## Error Handling

Errors should be normalized at boundaries:

- Telegram middleware catches and logs handler failures, then sends a friendly user-safe reply
- route handlers return structured JSON or appropriate status codes
- feature services throw typed domain errors where useful
- AI provider errors are wrapped by `AIService`

Usage tracking should record latency, token counts, model names, cost fields, and feature names when the data is available.

## Implementation Notes

The first implementation plan should:

1. Normalize dependencies and scripts inside `pastry-ai`.
2. Move App Router files into `src/app`.
3. Add Prisma schema, client, and env validation.
4. Add AI service, prompt loader, schemas, and agent skeletons.
5. Add feature service skeletons for recipes, vision, photoshoot, carousel, and users.
6. Add grammY bot bootstrap, middleware, commands, and webhook route.
7. Add Supabase clients.
8. Add admin layout and placeholder pages.
9. Add focused tests and run build/lint/test verification.

## Out of Scope for Foundation

- Complete AI prompt tuning
- Full admin CRUD
- Subscription billing integration
- Production Supabase policies
- Complete Telegram conversation flows
- End-user localization
- Real image generation workflow beyond the typed service boundary

