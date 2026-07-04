# Task 3 Report: Trigger Service + Unit Tests

**Status:** DONE

## Что сделано

- Создан `src/features/triggers/trigger-service.ts` с функцией `createTriggerService`, экспортирующей два метода:
  - `scheduleTrigger(slug, chatId, plan)` — находит активное триггерное сообщение по slug, проверяет соответствие плану, проверяет отсутствие дубликата, создаёт запланированное сообщение с задержкой `delayMinutes`.
  - `processPendingTriggers(sendMessage)` — забирает до 50 ожидающих сообщений, отправляет каждое через `sendMessage`, помечает отправленным (включая ошибки).
- Создан `src/features/triggers/trigger-service.test.ts` с 4 тестами на `scheduleTrigger`.

## Результаты тестов

```bash
> npx vitest run src/features/triggers/trigger-service.test.ts
✓ src/features/triggers/trigger-service.test.ts (4 tests)
  Test Files  1 passed (1)
       Tests  4 passed (4)

> npm run typecheck  # passed (no output)
> npm run lint       # passed (no output)
```

## Коммит

```
eebada9 Task 3: implement trigger service (scheduleTrigger + processPendingTriggers)
```

## Замечания

- Тесты используют `vi.clearAllMocks()` в `beforeEach` для изоляции между тестами.
- `processPendingTriggers` не покрыт тестами — можно добавить в отдельной задаче при необходимости.
