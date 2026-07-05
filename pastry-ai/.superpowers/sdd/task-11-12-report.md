# Task 11 & 12 Report

## Task 11: Photoshoot handler token guard

**File**: `src/bot/handlers/photoshoot.ts`

- Added `import { prisma } from "@/db/prisma"` 
- Defined `TokenGuardService` type
- Updated `registerPhotoshootPhotoHandler` signature to accept `tokenGuard`
- After `buildTelegramFileUrl`, added token check using `prisma.photoStyle.count()` and `tokenGuard.ensureSufficientTokens`
- After each `ctx.replyWithPhoto()` in the loop, added `tokenGuard.chargeTokens` call (1 token per photo, feature "photoshoot", prompt slug "product-photo")

## Task 12: Single-style photoshoot handler

**File**: `src/bot/handlers/single-style-photoshoot.ts`

- `UserFacingError` was already imported
- Added `TokenGuardService` type
- Updated `registerSingleStylePhotoshootHandler` signature to accept `tokenGuard`
- Before calling `generateStyledDessertPhoto`, added token check (`ensureSufficientTokens` with 1 required)
- After each `ctx.replyWithPhoto()`, added `tokenGuard.chargeTokens` call

## Supporting changes

- **`src/bot/context.ts`**: Added `"photoshoot-single-style"` to `BotSession.lastFeature` union type and `selectedStyleId` field
- **`src/bot/create-bot.ts`**: Added import for `registerSingleStylePhotoshootHandler`, registers both handlers with `tokenGuard`, widened `BotDependencies` types for `photoshootService` and `tokenGuard`
- **`src/features/photoshoot/photoshoot-service.ts`**: Added `generateStyledDessertPhoto` method and `findById` to repository type
- **`src/app/api/telegram/webhook/route.ts`**: Added `findById` implementation to `photoStyleRepository`
- **`src/features/photoshoot/photoshoot-service.test.ts`**: Added `findById: async () => null` to test fixture

## Verification

- `npm run typecheck`: ✅ passes
- `npm run test`: existing tests pass, 3 pre-existing failures unchanged (env-dependent)
- Committed as `feat: add token guard to photoshoot handlers`
