# Task 6: TokenGuardService — Complete

## Files created
- `src/features/tariffs/token-guard-service.ts` — `createTokenGuardService` with `ensureSufficientTokens`, `getAvailablePhotoSlots`, `chargeTokens`, `getUserTariffState`
- `src/features/tariffs/token-guard-service.test.ts` — 7 tests covering all scenarios
- `src/features/tariffs/index.ts` — barrel export

## Test results
```
✓ allows sufficient tokens for batch
✓ throws when tariff expired
✓ throws when not enough tokens for batch
✓ returns available photo slots (min of requested and remaining)
✓ returns 0 when tariff expired
✓ charges tokens and logs usage
✓ returns null when user has no tariff
```
7/7 passing.

## Notes
- Followed TDD: test written first, verified RED (module-not-found), then implemented.
- Error messages are in Russian as required.
- One minor deviation from brief: the "not enough tokens" message includes `не хватает N` so the regex `/не хватает/` matches.
- `getUserTariffState` returns `TariffState | null` (null when user has no tariff record).
- `chargeTokens` clamps `newBalance` to `Math.max(0, ...)` so it never goes negative.
- `getAvailablePhotoSlots` returns `Math.min(maxSlots, tariff.remainingTokens)` when tariff is valid.