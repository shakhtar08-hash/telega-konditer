Status: DONE

What I changed
- Updated `src/features/triggers/trigger-service.ts` so queued sends pass the stored payload snapshot (`imageUrl`, `buttons`) into the sender callback.
- Added a regression test in `src/features/triggers/trigger-service.test.ts` that verifies the queued snapshot is forwarded unchanged.
- Updated `src/app/api/cron/process-triggers/route.ts` to send photo+caption when `imageUrl` exists, otherwise send text, and to attach URL buttons as Telegram inline buttons when present.
- Expanded `src/app/api/cron/process-triggers/route.test.ts` to cover both text-only and photo snapshot delivery.
- Refreshed `docs/roadmap.md` to document the event-based trigger redesign, the `Воронка` tab label, and snapshot-based queue delivery.

Verification
- `npm test -- src/features/triggers/trigger-service.test.ts src/app/api/cron/process-triggers/route.test.ts src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts`
  - PASS: 4 files, 22 tests
- `npm test -- src/components/admin/chat-bot-subnav.test.ts`
  - PASS: 1 file, 4 tests
- `npm run typecheck`
  - PASS

Concerns
- No blocker. Trigger buttons are currently rendered only for URL-type buttons in the cron sender, which matches the current stored trigger-button shape used in this feature.
