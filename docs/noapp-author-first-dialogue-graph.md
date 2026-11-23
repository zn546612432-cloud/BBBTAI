# NoApp author-first dialogue graph — P3 foundation

Status: only the two previously approved lines are present. No unapproved confession, new memory, or long cinematic dialogue has been shipped.

## Open-source references
- inkle/ink: https://github.com/inkle/ink (conditional dialogue nodes and diverts)
- Yarn Spinner: https://yarnspinner.dev/docs/ (conditional lines, dialogue runner and node variables)

The implementation is original JavaScript. The player types freely; no new dialogue buttons or choice UI.

## Canonical services
- src/services/ai/romance-scene/authored-lines.js: frozen authored lines and edges
- src/services/ai/romance-scene/index.js: deterministic free-text matching
- src/services/ai/relationship-director.js: existing R0–R6 permissions
- src/services/ai/live-chat.js: existing NoApp message, notification and save path
- src/apps/noapp/voice-call.js: existing played MiniMax voice and call path

One tiny scene cursor resides on a delivered NoApp message or played call turn; nothing is written to a second state, game clock or queue. Story55 fixed scripts remain authoritative.

## Handoff limits
An exact approved graph node bypasses DeepSeek. Other live responses retain ordinary DeepSeek as a temporary noncanonical conversational bridge, with declaration permissions disabled during those beats. It cannot decide a first confession or author a lasting emotional milestone.

After an approved line the program waits for another real player message. Free-text affirmative input can select the next approved node; a joke, refusal, silence or change of topic naturally exits. A scene stays open as long as the player keeps discussing the matter, rather than cutting off after three NPC responses.

## Awaiting author-reviewed script
- Complete romantic replies after a serious player confession
- Deep two-character conflict, reconciliation and voluntary confession scenes
- Long cinematic speech and MiniMax direction for those exact lines
