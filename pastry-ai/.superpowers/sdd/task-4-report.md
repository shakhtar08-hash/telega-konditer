# Task 4: UserTariff Repository — Done

## Steps completed

1. **Wrote failing tests** — `src/db/repositories/user-tariff-repository.test.ts` with 3 tests:
   - `finds user tariff by userId`
   - `returns null when no tariff found`
   - `upserts a user tariff (full replace)`

2. **Ran test → FAIL** (module not found — expected)

3. **Wrote minimal implementation** — `src/db/repositories/user-tariff-repository.ts` with `createUserTariffRepository` exposing:
   - `findByUserId`
   - `upsert`
   - `updateRemainingTokens`

4. **Ran test → PASS** (3/3)

5. **Committed** — `d8c33ac` feat: add UserTariffRepository