# Task 3 Report: Admin SSOT Migration for Chat Bot, Photo Styles, and Prompts

Date: 2026-07-17
Workspace: `C:\Users\Roof\Documents\Телега\pastry-ai`

## Scope Completed

Task 3 migrated the `chat-bot`, `photo-styles`, and `prompts` admin domains to the RU-backed internal admin bridge for ingress runtime reads and writes.

Implemented domains:
- `chat-bot`
- `photo-styles`
- `prompts`

## What Changed

### 1. Added domain services

Created service modules to centralize local Prisma-backed read/write behavior:
- `src/features/admin/chat-bot/service.ts`
- `src/features/admin/photo-styles/service.ts`
- `src/features/admin/prompts/service.ts`

Produced the required service entry points:
- `loadAdminChatBotPageData()`
- `performCreateBotMenuButton()`
- `performUpdateBotMenuButton()`
- `performDeleteBotMenuButton()`
- `performUpdateMenuIntro()`
- `loadAdminPhotoStylesPageData()`
- `performCreatePhotoStyle()`
- `performUpdatePhotoStyle()`
- `performDeletePhotoStyle()`
- `loadAdminPromptsPageData()`
- `performUpdatePrompt()`

### 2. Added internal admin bridge clients

Created ingress-facing bridge clients:
- `src/features/admin/chat-bot/internal-admin-client.ts`
- `src/features/admin/photo-styles/internal-admin-client.ts`
- `src/features/admin/prompts/internal-admin-client.ts`

Behavior:
- ingress page loads fetch RU page data via internal authenticated routes
- ingress writes post actions to RU instead of touching local Prisma
- `chat-bot` and `photo-styles` writes preserve RU authority for image-backed fields by forwarding `FormData` and performing `saveAdminImage()` on RU routes

### 3. Added authenticated RU internal routes

Created internal admin routes:
- `src/app/api/internal/admin/chat-bot/route.ts`
- `src/app/api/internal/admin/chat-bot/actions/route.ts`
- `src/app/api/internal/admin/photo-styles/route.ts`
- `src/app/api/internal/admin/photo-styles/actions/route.ts`
- `src/app/api/internal/admin/prompts/route.ts`
- `src/app/api/internal/admin/prompts/actions/route.ts`

Route behavior:
- validates `INTERNAL_API_SHARED_SECRET`
- rejects unauthorized calls with `401`
- serves RU as the source of truth for migrated admin reads/writes
- handles multipart form ingress for image-backed mutations in `chat-bot` and `photo-styles`

### 4. Switched admin pages/actions to ingress-aware routing

Modified pages:
- `src/app/admin/chat-bot/page.tsx`
- `src/app/admin/photo-styles/page.tsx`
- `src/app/admin/prompts/page.tsx`

Behavior after migration:
- when `APP_ROLE === "ingress"`, pages read through RU bridge
- when `APP_ROLE === "ingress"`, writes post to RU bridge
- otherwise local runtime continues using local services
- no silent ingress fallback to local Prisma for migrated domains

Note on fail-closed behavior:
- page/action routing now keys off `APP_ROLE === "ingress"` directly
- if ingress lacks bridge configuration, the shared bridge client throws instead of falling back locally

## Test Coverage Added/Updated

Updated or added tests:
- `src/app/admin/chat-bot/page.test.tsx`
- `src/app/admin/photo-styles/page.test.tsx`
- `src/app/admin/prompts/page.test.tsx`
- `src/app/admin/delete-actions.test.ts`

Coverage added:
- ingress reads `chat-bot` data from RU
- ingress reads `photo-styles` data from RU
- ingress reads `prompts` data from RU
- ingress prompt updates post to RU
- ingress bot menu deletes post to RU
- ingress photo style deletes post to RU

## Verification

Red phase:
- ran the requested focused admin tests before implementation
- observed expected failures showing ingress paths still used local Prisma

Green phase:
- reran focused tests after implementation
- added one nearby regression check because photo styles page data moved behind a service

Passing command:

```bash
npm run test -- src/app/admin/chat-bot/page.test.tsx src/app/admin/photo-styles/page.test.tsx src/app/admin/prompts/page.test.tsx src/app/admin/delete-actions.test.ts src/app/admin/admin-data-pages.test.tsx
```

Result:
- 5 test files passed
- 20 tests passed
- 0 failures

## Notes / Concerns

- I did not run the full repository test suite, only the focused Task 3 admin slice plus the nearby admin data page regression.
- The working tree already contained unrelated edits before Task 3 work began; those were left untouched.
