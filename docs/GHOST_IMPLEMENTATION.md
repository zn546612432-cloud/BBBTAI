# GHOST — five local programs

The existing single-entry phone registers `src/apps/ghost/index.js`. Its four games and one animated operation share a monochrome SVG/CSS shell. No external targets, network commands or third-party runtime libraries are used.

- CIPHER: 3×3 image puzzle, tap two pieces or drag between them.
- ROUTE: 3×3 rotating circuit, N/E/S/W bitmask ports, flood-fill connectivity.
- EXTRACT: select the exact six-digit fingerprint, three rounds by default.
- VEIL: type short displayed sequences with touch keypad or physical keyboard.
- STRIKE: time-based streamed operation, no interactive challenge.

Kira authorizes the accepted existing hacker order after its previous steps. Plain tool browsing requires a key and cannot start an operation. Authorization snapshots each tool's configuration, so editing defaults cannot change an active order. Failed attempts are retained and limited. Exiting a running game keeps its original deadline; returning resumes that attempt. Reports return to the original email. Successful orders require explicit submission. Settlement is based on `Date.now()`, survives closing, and credits once to `content.mirage.digitalBalance`. No digital-currency name, exchange rate or reward amount is invented; reward defaults to null and must be configured before authorization. The existing bank and historical USD demo ledgers are outside this change.

Developer editor → GHOST configures timings, retries, rounds, code length, animation duration, reward, and the existing order's program. This is the current app's local content editing model, not server access control.

`/ghost-preview.html` is an isolated interactive preview. Selecting a tool there creates an explicitly named PREVIEW order and preloads authorization, so all five programs can be reviewed without progressing the story. Its storage key is `ghost-preview-v1`, separate from phone saves. The small parameter editor changes preview defaults.

All artwork and game implementation are original. The reviewed MIT pipe and puzzle repositories informed the design, but no third-party code or assets were incorporated.

Checks: `npm test`; `npm run build`. New tests cover route solvability and traversal, exact fingerprint matching, puzzle reconstruction, authorization, retry isolation, idempotent reports and settlement, and absent reward configuration.
