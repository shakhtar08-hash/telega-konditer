# Recipe Follow-Up Context And Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve selected recipe context in `ask-chef` and `recipe-recalculation` follow-ups, and make recipe generation target `2-4` results while allowing `1` as a valid fallback.

**Architecture:** Fix the root cause where `recipeContext` reaches the agents but is dropped because prompt templates do not render it. Keep the callback/session flow minimal, strengthen the runtime recipe output contract, and cover both behaviors with focused regression tests.

**Tech Stack:** Next.js 16, TypeScript, grammY, Vitest, Zod

## Global Constraints

- Keep Telegram bot behavior in `src/bot`, feature orchestration in `src/features`, AI calls in `src/ai`.
- User-facing bot/admin text should be Russian and valid UTF-8.
- Do not change unrelated scenario behavior while fixing `ask-chef` and recipe count.
- Use TDD: write failing tests before production edits.

---

### Task 1: Cover Missing Follow-Up Context In Agents

**Files:**
- Modify: `src/ai/agents/ask-chef-agent.ts`
- Modify: `src/ai/agents/text-prompt-agent.ts`
- Create or modify: `src/ai/agents/ask-chef-agent.test.ts`
- Create or modify: `src/ai/agents/text-prompt-agent.test.ts`

**Interfaces:**
- Consumes: `recipeContext?: string`
- Produces: prompt rendering that includes `recipeContext` even when the stored prompt template lacks `{{recipeContext}}`

- [ ] Write failing tests that prove rendered prompts include recipe context for both agents.
- [ ] Run those tests and confirm they fail for the current implementation.
- [ ] Add minimal prompt-rendering fallback logic in both agents.
- [ ] Re-run the targeted tests and confirm they pass.

### Task 2: Relax And Strengthen Recipe Count Contract

**Files:**
- Modify: `src/ai/agents/recipe-agent.ts`
- Modify: `src/ai/agents/recipe-agent.test.ts`

**Interfaces:**
- Consumes: AI structured output for `RecipeOutput`
- Produces: runtime contract with `recipes.length` in `1..4`, while preferring `2-4` and explicitly encouraging `3-4` when viable

- [ ] Write failing tests for the new runtime contract wording and schema acceptance of one recipe.
- [ ] Run the targeted recipe agent tests and confirm failure.
- [ ] Update the schema/contract with the minimal code needed to allow `1` as fallback and bias toward `2-4`.
- [ ] Re-run the targeted tests and confirm they pass.

### Task 3: Update Durable Docs

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/prompts.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: implemented behavior
- Produces: repo docs aligned with the new follow-up-context fallback and recipe count rule

- [ ] Update docs so they say recipe follow-ups inject saved recipe context even if the editable prompt template omits the placeholder.
- [ ] Update docs so recipe generation targets `2-4` recipes and accepts `1` as a fallback.
- [ ] Re-read the changed docs for consistency with the code.
