# Task 4: Create Instrumented AI Service

## Status: DONE

## Files Created
- `src/ai/provider/instrumented-ai-service.ts` — decorator wrapping any AIService with usage logging
- `src/ai/provider/instrumented-ai-service.test.ts` — 5 tests covering all scenarios

## Test Results
- **5/5 new tests passing**
- Full suite: 62/65 test files pass, 266/267 tests pass
- 3 pre-existing failures unrelated to this task:
  - `src/test/encoding.test.ts` (mojibake in existing files)
  - `src/bot/handlers/vision.test.ts` (missing env vars)
  - `src/bot/handlers/photoshoot.test.ts` (missing env vars)

## Test Scenarios Covered
1. Records success for `generateText` — verifies `userId`, `feature`, `provider`, `model`, zero tokens/cost, non-negative latency
2. Records error for `generateText` when it throws — verifies `errorMessage` is captured
3. Records success for `generateObject`
4. Records success for `generateImage`
5. Passes `conversationId` when provided in context

## Implementation
`createInstrumentedAIService(base, usageLog, ctx)` wraps each of the three methods (`generateText`, `generateObject`, `generateImage`):
- Measures wall-clock latency via `Date.now()`
- On success: calls `usageLog.recordSuccess` with context fields, provider/model, tokens=0, cost=0, measured latency
- On error: calls `usageLog.recordError` with same data + `errorMessage`, then re-throws the original error
