# Task 2 Report: AI Sanitization And Shared Transport

- **Status**: DONE
- **Date**: 2026-07-16
- **Scope honored**:
  - Limited provider code changes to the 8 requested AI provider files.
  - Did not touch Telegram internal routes, admin settings, env schema files, or deploy artifacts.
  - Kept current direct-mode behavior intact by falling back to the injected direct image generator whenever transition gateway config is absent.

## Implemented changes

- Added `src/ai/provider/ai-request-sanitizer.ts`
  - Introduced `sanitizeOutboundPrompt(prompt: string): string`.
  - Normalizes outbound prompt whitespace deterministically with `replace(/\s+/g, " ").trim()`.

- Added `src/ai/provider/ai-transport.ts`
  - Introduced `createAITransport(...)` as the shared outbound image transport boundary.
  - Sanitizes prompts before any outbound image request.
  - Uses the current safe runtime contract via `loadEnv(process.env)` only when explicit transport config is not supplied.
  - Sends gateway requests only when both `INTERNAL_AI_GATEWAY_URL` and `INTERNAL_API_SHARED_SECRET` are available; otherwise preserves existing direct execution.

- Updated `src/ai/provider/openai-provider.ts`
  - Routed image generation through `createAITransport(...)`.
  - Preserved previous direct image behavior inside the injected `directGenerateImage` function:
    - OpenRouter FLUX direct image generation still works.
    - KIE direct image generation still works.
    - OpenAI image edits still work.
    - Native OpenAI image generation still works.
  - Left text and object generation behavior unchanged.

- Updated `src/ai/provider/kie-provider.ts`
  - Sanitizes prompts before KIE submission so direct calls also benefit from deterministic normalization.

## TDD evidence

### RED

- Added failing tests first:
  - `src/ai/provider/ai-request-sanitizer.test.ts`
  - `src/ai/provider/ai-transport.test.ts`
  - `src/ai/provider/openai-provider.test.ts`
  - `src/ai/provider/kie-provider.test.ts`

- Ran:

```text
npm test -- src/ai/provider/ai-request-sanitizer.test.ts src/ai/provider/ai-transport.test.ts src/ai/provider/openai-provider.test.ts src/ai/provider/kie-provider.test.ts
```

- Result before implementation: **FAIL**
  - `Cannot find module './ai-request-sanitizer'`
  - `Cannot find module './ai-transport'`
  - KIE prompt sanitization assertion failed because prompt was still unsanitized
  - OpenAI provider routing assertions failed because image generation was still bypassing the shared transport

### GREEN

- Implemented the minimal production changes required to satisfy the new tests.

- Re-ran:

```text
npm test -- src/ai/provider/ai-request-sanitizer.test.ts src/ai/provider/ai-transport.test.ts src/ai/provider/openai-provider.test.ts src/ai/provider/kie-provider.test.ts
```

- Result after implementation: **PASS**

```text
Test Files  4 passed (4)
Tests  11 passed (11)
```

## Files changed

- `src/ai/provider/ai-request-sanitizer.ts`
- `src/ai/provider/ai-request-sanitizer.test.ts`
- `src/ai/provider/ai-transport.ts`
- `src/ai/provider/ai-transport.test.ts`
- `src/ai/provider/openai-provider.ts`
- `src/ai/provider/openai-provider.test.ts`
- `src/ai/provider/kie-provider.ts`
- `src/ai/provider/kie-provider.test.ts`

## Commit

- Planned commit message: `refactor: add ai transport boundary`

## Concerns

- None in scoped behavior.
- Verification was limited to the focused test suite required by the brief; no full-suite run was performed for this task.

---

## Follow-up fix: direct-mode env regression

### Reviewer finding

- `createAITransport()` must not require the full application env contract just to decide whether gateway mode is enabled.
- Direct-mode image generation must remain reachable even when unrelated app env keys such as `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, and `CRON_SECRET` are absent.

### Root cause

- The first Task 2 implementation called `loadEnv(process.env)` inside `src/ai/provider/ai-transport.ts` when explicit gateway config was not passed.
- `loadEnv(process.env)` validates the full app env schema, so direct-mode transport could throw before checking whether gateway mode was actually configured.
- This violated the Task 1 design resolution to use the current safe runtime contract for transition config without widening unrelated legacy behavior.

### Fix applied

- Updated `src/ai/provider/ai-transport.ts`
  - Removed the full env parse from gateway detection.
  - Gateway detection now reads only:
    - `process.env.INTERNAL_AI_GATEWAY_URL`
    - `process.env.INTERNAL_API_SHARED_SECRET`
  - Direct mode remains available whenever those transition keys are not both present.

- Updated `src/ai/provider/ai-transport.test.ts`
  - Added a regression test proving direct-mode image generation still resolves when unrelated app env variables are missing.
  - This test would fail with the previous `loadEnv(process.env)` implementation and now protects the intended behavior.

### RED evidence for follow-up fix

- Added failing regression test:
  - `src/ai/provider/ai-transport.test.ts`

- Ran:

```text
npm test -- src/ai/provider/ai-request-sanitizer.test.ts src/ai/provider/ai-transport.test.ts src/ai/provider/openai-provider.test.ts src/ai/provider/kie-provider.test.ts
```

- Output:

```text
RUN  v4.1.9 C:/Users/Roof/Documents/Телега/pastry-ai

❯ src/ai/provider/ai-transport.test.ts (3 tests | 1 failed) 67ms
    × keeps direct mode reachable without validating unrelated app env 19ms

Test Files  1 failed | 3 passed (4)
Tests  1 failed | 11 passed (12)

Caused by: Error: Invalid environment: [
  {
    "expected": "string",
    "code": "invalid_type",
    "path": ["OPENAI_API_KEY"]
  },
  {
    "expected": "string",
    "code": "invalid_type",
    "path": ["DATABASE_URL"]
  },
  {
    "expected": "string",
    "code": "invalid_type",
    "path": ["TELEGRAM_BOT_TOKEN"]
  },
  {
    "expected": "string",
    "code": "invalid_type",
    "path": ["TELEGRAM_WEBHOOK_SECRET"]
  },
  {
    "expected": "string",
    "code": "invalid_type",
    "path": ["CRON_SECRET"]
  }
]
```

### GREEN evidence for follow-up fix

- Re-ran:

```text
npm test -- src/ai/provider/ai-request-sanitizer.test.ts src/ai/provider/ai-transport.test.ts src/ai/provider/openai-provider.test.ts src/ai/provider/kie-provider.test.ts
```

- Output:

```text
> pastry-ai@0.1.0 test
> vitest run src/ai/provider/ai-request-sanitizer.test.ts src/ai/provider/ai-transport.test.ts src/ai/provider/openai-provider.test.ts src/ai/provider/kie-provider.test.ts

RUN  v4.1.9 C:/Users/Roof/Documents/Телега/pastry-ai

Test Files  4 passed (4)
Tests  12 passed (12)
```

### Typecheck verification

- Ran:

```text
npm run typecheck
```

- Output:

```text
> pastry-ai@0.1.0 typecheck
> tsc --noEmit
```

### Files changed in follow-up fix

- `src/ai/provider/ai-transport.ts`
- `src/ai/provider/ai-transport.test.ts`
