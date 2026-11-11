# Repository assistant instructions · 《熙蒙的手机》

Treat `main` as production; D01=2025-05-19, D55=2025-07-12. Older 90-day DEMO artifacts are legacy sources, not new Story55 events.

## Mandatory when changing authored story, any day or App

1. **Read `.agents/skills/ximeng-story-fill/SKILL.md` first**, then `references/app-capabilities.json`, `references/cross-app-contract.md`, `references/system-map.md` and the target App's actual code.
2. A new v2 event packet must use a real app `surface` + `capability` and a single `owner`. **A visible App is not proof of story-writing support**. `adapter-required` is a blocker for strict acceptance. No data-only packet runs itself; do not treat `stage:approved` as authorization.
3. If user says **“先讨论、不写代码”**, do not edit files. Provide concrete dialogue, triggers, branches, assets, dates and missing adapter assessment.
4. Create isolated branches. Preserve D01-before WeChat/SMS/Moments, previously approved UI, phone battery/time/charging and Xi Tai AI. Do not duplicate messages, bank, reminders, story clock or Ghost runners.
5. Run `node scripts/audit-story-skill.mjs`, `npm run story:check -- --strict <packet.json>`, `npm test`, `npm run build:pages`, and click-test the genuine cross-App journey on a mobile-sized browser. Older v1 author packets and the legacy 90-day schema are **not** valid new strict release artifacts.
6. **No merge without explicit user authorization** and passing tests; a request to repair/check a skill is not permission to merge `main`. Verify Pages after merging.
7. Report separately what is designed, what's supported by existing day-specific code, what still needs adapters, what ran in a browser, and what actually shipped.

For general feature code not related to story data, keep the existing architecture and tests.

## Browser websites and search content

Treat each site as an independent website with its own purpose, sources, images and mobile layout. Inspect real references and licensed open-source examples before implementation. Broad searches must mix unrelated same-name results with relevant pages; do not fill the list with portals. Keep fictional reports and disputed attribution separate from real encyclopedia facts. Preserve approved copy and existing story gates. Click every result and inspect rendered mobile screenshots, images, scrolling and state after shell redraws; passing unit tests alone is not acceptance.

For approved webpage handoffs, preserve exact result order, source ratio and all正文/comments; replace rejected pages rather than appending. Organization knowledge must match each narrator: clues may appear only in a few replies or a limited personal recollection. Never turn unrelated music/game/art pages into organization reports or cross-link them to hidden lore. Allow normal game-guide terms in a fictional game website; ban only meta prompts about the phone story.
