# Task 10 Report: Recipe handler — photo generation + token charging

## Files modified

### `src/bot/handlers/recipes.ts`

- Replaced `RecipeOutput` import with inline `RecipeService` type returning `{ text; dishes[] }`
- Added `TokenGuardService` and `ImageService` types
- Updated `registerRecipeTextHandler` to accept `tokenGuard` and `imageService`
- Extracted `generateDishPhotos()` helper: checks available photo slots, generates images per dish, charges tokens
- Both `handleIngredientRecipe` and `handleSimpleRecipe` call `generateDishPhotos` after sending text
- If zero slots available, sends "недостаточно токенов" message

### `src/app/api/telegram/webhook/route.ts`

- Added imports for `user-tariff-repository`, `token-usage-repository`, `token-guard-service`
- Creates `userTariffRepository` and `tokenUsageRepository` from Prisma delegates (cast as `never` for type compat)
- Creates `tokenGuard` and passes it + `aiService` to `createPastryBot`

### `src/bot/create-bot.ts`

- Added `tokenGuard` and `aiService` to `BotDependencies` type
- Passes both to `registerRecipeTextHandler` when `recipeService` is present

## Verification

- `npm run typecheck`: only pre-existing errors in `single-style-photoshoot.ts`
- `npm run test -- src/bot/handlers/recipes.test.ts`: 10/10 passing