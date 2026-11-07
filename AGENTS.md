# Repository instructions for code assistants (BBBTAI)

This repository is the interactive iPhone narrative **《熙蒙的手机》**. Treat `main` as the production version, `D01=2025-05-19`, `D55=2025-07-12`. Never assume the older 90-day / DEMO wording in README is the current active story.

## Mandatory workflow for authored story content
If a task involves D01–D55 story, group chat, fictional commissions, Ghost task steps, photos, gift wishes, calendar, phone calls, notifications, bank rewards or multi-App scenes:

1. **Read** [`.agents/skills/ximeng-story-fill/SKILL.md`](.agents/skills/ximeng-story-fill/SKILL.md).
2. Follow its system map, event-packet drafting, single source of truth, state transitions, idempotence and acceptance matrix.
3. When user says **“先讨论 / 暂时不写代码”**, write only the design, content and event chain; don't edit files.
4. Only implement on an isolated branch. Preserve D01-before historical WeChat, SMS, Moments, media, production PhoneStore and existing native iPhone UIs.
5. Don't introduce duplicate Bank, Reminders, clock, notifications, player-send or Ghost deployment systems to solve a daily content request. Use existing services.
6. Run `node scripts/validate-story-packet.mjs <packet.json>`, `npm test`, `npm run build:pages` and a mobile browser acceptance path; report anything not actually tested.
7. **No merge without explicit user authorization**, a green feature branch and a production deployment check.

For normal code not touching story content, this instruction is informational; follow established architecture and tests.
