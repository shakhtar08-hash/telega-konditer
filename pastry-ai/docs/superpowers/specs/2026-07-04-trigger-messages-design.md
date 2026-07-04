# Дожим (Trigger Messages)

Отложенные триггерные сообщения, которые бот отправляет пользователю через заданное количество минут после события.

---

## Модели данных

```prisma
model TriggerMessage {
  id           String   @id @default(cuid())
  slug         String   @unique     // "after-start", "after-payment"
  title        String               // "После /start"
  text         String               // Текст сообщения (может содержать Markdown)
  delayMinutes Int                  // 15
  targetPlans  Json                 // ["FREE", "PRO", "TEAM"]
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model ScheduledMessage {
  id          String    @id @default(cuid())
  triggerSlug String
  chatId      String               // Telegram chat_id получателя
  text        String               // Текст, замороженный на момент создания
  sendAt      DateTime             // Когда отправлять
  sentAt      DateTime?            // Когда реально отправили (null = не отправлено)
  createdAt   DateTime  @default(now())
}
```

### TriggerMessage

Определяет правило триггера. Создаётся и редактируется в админке.

- `slug` — уникальный идентификатор, ссылается на событие в коде
- `targetPlans` — JSON-массив планов, например `["FREE", "PRO"]`. При создании `ScheduledMessage` проверяется, что plan пользователя входит в этот массив.
- `text` — произвольный текст, который бот отправит пользователю

### ScheduledMessage

Конкретная задача на отправку. Создаётся программно при наступлении события.

- `chatId` — Telegram chat_id (у User в поле telegramId)
- `text` — копируется из TriggerMessage.text в момент создания (на случай, если админ потом изменит текст триггера — уже запланированные сообщения не меняются)
- `sendAt` — `new Date(Date.now() + delayMinutes * 60 * 1000)`
- `sentAt` — заполняется после успешной отправки; `NULL` = ждёт отправки

---

## Потоки

### 1. Событие "/start"

Файл: `src/bot/commands/start.ts`

В конце функции `sendAccessAwareEntryPoint`, после проверки доступа:

```typescript
await scheduleTrigger("after-start", telegramId, user);
```

Логика `scheduleTrigger`:
1. Найти активный `TriggerMessage` по slug
2. Проверить: `targetPlans` включает plan пользователя
3. Если нет — выйти
4. Проверить: нет ли уже `ScheduledMessage` с таким же `triggerSlug` и `chatId` и `sentAt IS NULL` (чтобы не дублировать)
5. Создать `ScheduledMessage` с `sendAt = now + delayMinutes`

### 2. Событие "Оплата прошла"

Файл: `src/app/api/payments/cloudpayments/route.ts`

После успешной обработки платежа:

```typescript
await scheduleTrigger("after-payment", telegramId, user);
```

Та же логика, что и для `/start`.

### 3. Cron-обработчик

Файл: `src/app/api/cron/process-triggers/route.ts`

```
GET /api/cron/process-triggers?token=<CRON_SECRET>
```

1. Проверить `token` через `env.CRON_SECRET`
2. Найти все `ScheduledMessage` где `sentAt IS NULL AND sendAt <= now`, не более 50 за раз
3. Для каждой:
   - Вызвать `bot.api.sendMessage(chatId, text)`
   - Если успех → `sentAt = new Date()`
   - Если ошибка (пользователь заблокировал бота, чат не найден) → залогировать, пометить `sentAt = new Date()` или удалить запись (повторная отправка бессмысленна)

Требуется `TELEGRAM_BOT_TOKEN` в env и `CRON_SECRET` в env.

---

## Admin UI

Вкладка "Триггеры" в `/admin/chat-bot` (уже существует как `<span>Триггеры</span>` на `src/app/admin/chat-bot/page.tsx`).

**Функциональность:**
- Список триггеров: slug, title, text (обрезанный), delayMinutes, targetPlans, active
- Кнопка "Создать триггер" — форма с полями:
  - slug (readonly после создания, или авто-генерация)
  - title — текстовое поле
  - text — textarea для сообщения
  - delayMinutes — число (инпут type="number")
  - targetPlans — чекбоксы (FREE, PRO, TEAM)
  - active — toggle
- Кнопки "Сохранить" / "Удалить" у каждого триггера

**Куда добавить:**
- Либо вынести в отдельную страницу `/admin/triggers`
- Либо оставить как вкладку на `/admin/chat-bot` (уже есть таб-навигация:

Сделаю отдельную страницу `/admin/triggers` — будет чище, чем вкладка внутри chat-bot.

---

## Расположение кода

```
src/
  app/
    api/
      cron/
        process-triggers/
          route.ts         — GET: обработчик cron
    admin/
      triggers/
        page.tsx           — CRUD для TriggerMessage
  features/
    triggers/
      trigger-service.ts   — scheduleTrigger(), processPendingTriggers()
  bot/
    triggers.ts            — функция для вызова из start.ts / cloudpayments
```

---

## Переменные окружения

- `CRON_SECRET` — токен в query-параметре для защиты cron-ручки

---

## Безопасность

- Cron-ручка защищена query-параметром `?token=<CRON_SECRET>`
- ScheduledMessage.text не экранируется — Telegram сам обрабатывает HTML/Markdown
- Ошибки отправки не роняют весь батч

---

## Тестирование

- unit-тесты на `trigger-service.ts`:
  - `scheduleTrigger` создаёт запись при совпадении плана
  - `scheduleTrigger` не создаёт дубликат
  - `scheduleTrigger` пропускает, если plan не в targetPlans
  - `processPendingTriggers` отправляет и помечает sentAt