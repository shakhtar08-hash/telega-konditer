# Task 3 Report: Create per-template render functions

## What I implemented

Created 4 template render functions in `src/components/recipe-card/templates/`:

- **minimal.ts** — `renderMinimalHtml(data, imageUrl, size)` — minimal white card with neutral colors
- **pinterest.ts** — `renderPinterestHtml(data, imageUrl, size)` — full-width hero image + card-content split
- **luxury.ts** — `renderLuxuryHtml(data, imageUrl, size)` — serif fonts, gold accents, dual border
- **dark.ts** — `renderDarkHtml(data, imageUrl, size)` — dark backgrounds, gold accents

Each function:
- Returns a complete HTML document string (DOCTYPE + html + head + style + body)
- Uses `sizeCssVars(size)` for size-based CSS custom properties
- Omits hero block entirely when `imageUrl` is undefined/empty (no placeholder)
- Uses `renderTipItems(data.tips, cfg.maxTips)` for tips section (absent in pinterest and dark)
- Includes Google Fonts (Inter for all, Playfair Display for luxury)
- All text in Russian

Additionally fixed `utils.ts` to re-export `sizeConfig` (template files import it from `"./utils"` but it wasn't exported).

## What I tested and test results

Ran `npm run typecheck` — **PASS** (no TS errors)

## Files changed

| File | Action |
|------|--------|
| `src/components/recipe-card/templates/minimal.ts` | Created |
| `src/components/recipe-card/templates/pinterest.ts` | Created |
| `src/components/recipe-card/templates/luxury.ts` | Created |
| `src/components/recipe-card/templates/dark.ts` | Created |
| `src/components/recipe-card/templates/utils.ts` | Modified (added `export { sizeConfig }`) |

## Self-review findings

- **Plan inconsistency**: The plan's `utils.ts` code does not export `sizeConfig`, but all 4 template files import `{ sizeConfig }` from `"./utils"`. I added `export { sizeConfig }` to `utils.ts` to resolve the TS error. This is a minor omission in the plan, not a code issue.

## Commit

`a30b1ce` — `feat(recipe-card): add per-template render functions`

## Concerns

None. Typecheck passes cleanly. All 4 templates follow the block ordering and image rules specified in the brief.