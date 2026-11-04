# Messages source

- Repository: https://github.com/keoyyo85/FoundPhone-Studio
- Revision: `73a5dc257ae93096d394816732ec8b2a10d814fa`
- Original: `src/skins/MessagingSkins.tsx` (`MessagesSkin`, `ChatRows`, `Bubbles`, `Composer`); `src/skins/skins.css`, lines 1335–1467.
- Port: `../index.js` retains the list → thread → composer structure, circular avatars, per-thread unread/search, and outgoing/incoming bubble grouping. React callbacks are replaced with the existing phone store/router events. Original CSS rules are scoped in `foundphone-messages.css`.
- Screenshot calibration: `../styles.css` supplies the requested dark iOS appearance, glass header/search, anonymous portrait, two-line previews, and SMS timestamps. Upstream's plain catalog header and tiny font sizes are replaced to match the supplied iPhone screenshots. This is an adapted module, not an unchanged React mount.
- Runtime never loads a remote UI, demo messages, or a second SMS app. Authored history, scheduled delivery, drafts, selection/delete, and the local Aodong browser route stay in the existing store.
