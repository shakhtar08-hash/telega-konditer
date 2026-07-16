# Trigger Test Send and HTML Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Telegram HTML formatting tools and a test-send action to the trigger admin form so admins can validate real trigger output against the `Админы` group before saving.

**Architecture:** Extend the existing trigger admin form with client-side textarea formatting helpers and a second form action dedicated to test sending. Add server-side parsing, HTML validation, recipient resolution, and Telegram Bot API delivery in the existing trigger actions module, while keeping trigger persistence unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, Vitest, Telegram Bot API

## Global Constraints

- Use Telegram `parse_mode: "HTML"` for trigger test sends.
- Support only the approved formatting subset: `b`, `i`, `s`, `code`, `pre`, `blockquote`, `a[href]`.
- Test send must use the current unsaved form state and must not create or update trigger records.
- Test recipients are users in the exact user group named `Админы`.
- Reuse existing trigger button parsing helpers and image handling semantics where practical.

---

### Task 1: Add red tests for formatting helpers and trigger form rendering

**Files:**
- Create: `pastry-ai/src/app/admin/triggers/trigger-message-format.ts`
- Create: `pastry-ai/src/app/admin/triggers/trigger-message-format.test.ts`
- Modify: `pastry-ai/src/app/admin/triggers/trigger-form.test.tsx`

**Interfaces:**
- Produces: `applyTelegramHtmlFormat(input: { text: string; selectionStart: number; selectionEnd: number; format: "bold" | "italic" | "strikethrough" | "code" | "pre" | "blockquote" | "link"; }): { nextText: string; nextSelectionStart: number; nextSelectionEnd: number }`

- [ ] **Step 1: Write failing helper tests**
- [ ] **Step 2: Run targeted helper tests and verify failure**
- [ ] **Step 3: Add failing trigger form render assertions for toolbar and test-send controls**
- [ ] **Step 4: Run trigger form tests and verify failure**

### Task 2: Add red tests for trigger test-send server action

**Files:**
- Modify: `pastry-ai/src/app/admin/triggers/page.actions.test.ts`

**Interfaces:**
- Produces: `sendTriggerTestMessage(formData: FormData): Promise<{ ok: boolean; message: string }>`

- [ ] **Step 1: Add failing tests for admin group resolution and Telegram payload sending**
- [ ] **Step 2: Add failing tests for missing group, no recipients, and invalid HTML**
- [ ] **Step 3: Run targeted action tests and verify failure**

### Task 3: Implement minimal formatting helper and trigger form UI

**Files:**
- Modify: `pastry-ai/src/app/admin/triggers/trigger-form.tsx`
- Create: `pastry-ai/src/app/admin/triggers/trigger-message-format.ts`

**Interfaces:**
- Consumes: `applyTelegramHtmlFormat(...)`
- Produces: toolbar button wiring, second form action payload, inline test-send status area

- [ ] **Step 1: Implement minimal formatting helper to satisfy helper tests**
- [ ] **Step 2: Implement toolbar UI and test-send controls in trigger form**
- [ ] **Step 3: Run helper and trigger form tests and verify pass**

### Task 4: Implement test-send action, validation, and Telegram delivery

**Files:**
- Modify: `pastry-ai/src/app/admin/triggers/actions.ts`

**Interfaces:**
- Consumes: `parseTriggerButtonsFromFormData(formData)`
- Produces: `sendTriggerTestMessage(formData): Promise<{ ok: boolean; message: string }>`

- [ ] **Step 1: Implement minimal HTML subset validator for trigger text**
- [ ] **Step 2: Implement admin recipient lookup via Prisma user groups**
- [ ] **Step 3: Implement Telegram Bot API send helpers for message and photo flows**
- [ ] **Step 4: Implement server action return object without persistence**
- [ ] **Step 5: Run action tests and verify pass**

### Task 5: Final verification

**Files:**
- Verify only

**Interfaces:**
- Consumes: all prior tasks

- [ ] **Step 1: Run trigger-related Vitest suites**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Re-check `git diff` for scope correctness**

