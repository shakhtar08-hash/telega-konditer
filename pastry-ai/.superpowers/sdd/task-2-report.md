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
