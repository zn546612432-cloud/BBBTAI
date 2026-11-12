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

## 2026-11-03 / Arcade 2.0 upgrade

Fresh EXTRACT, VEIL and STRIKE attempts now create an additional serializable `board.arcade` object in `games/arcade.js` and render the redesigned mobile controls from `games/arcade-ui.js`. Original route-network integration remains unchanged.

- CIPHER: reverted to the original 3×3 circuit swap puzzle. New puzzles require only two pair-swaps and use visible numbered hints; an active Lights Out save can be converted with the in-game easy-reset button.
- EXTRACT: five matching pairs, flip two cards per turn. Failed pairs close after 720 ms.
- VEIL: 5×5 turn-based stealth maze with wall obstacles, cyclical scanners and touch D-pad.
- STRIKE: 4×4 reactive target challenge, 6 hits and fewer than 3 misses, with a 30-second-or-configured timer. The old auto-win strike is retained only for persisted legacy boards.
- Previous saved running games render their legacy boards instead of being reset.
- Old contract handlers, D01 pipe previews, Flow D03, and historic email/settlement flows have not been replaced.
- Module and integration tests: `tests/ghost-arcade.test.mjs`.

See `src/apps/ghost/games/OPEN_SOURCE_CREDITS.md` for research references and provenance.

## November 2026 / Source-ported Arcade 3

For new D15–D55 market contracts, CIPHER retains the original 3×3 circuit
exchange and randomizes 2–4 independent tile swaps by SABC grade; EXTRACT
(variable memory deck), VEIL (DFS-carved labyrinth with scanner-aware
solvability) and STRIKE (real-time random moving targets) execute through
the existing Ghost order and its single timer. MIT source ports live in
`src/apps/ghost/games/vendor`; the complete licenses are retained there.
The original route/pipe puzzle was not changed. The `arcadeV3` setting
is bound when a new eligible Ghost stage begins, so existing active boards,
legacy attempts, Story55 D01–D14 and their saved results are left untouched.
Daily commissions continue through KIRA attachment, Ghost, manual submission,
and the original one-time banking ledger. See
`tests/ghost-upstream-arcade.test.mjs` for the actual mounted UI flow.
