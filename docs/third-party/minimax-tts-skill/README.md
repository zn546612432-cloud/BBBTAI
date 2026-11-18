# MiniMax TTS skill provenance

Source: https://github.com/MorphieEndless/minimax-tts-skill/tree/4a9db4ffc237f2aa9c8d6493476b20943f5173b7 (MIT).

The original skill and reference documents are preserved here. Its lightweight dialogue rules are ported to `src/services/voice/voice-regex.js` and the character voice direction. The browser uses the existing MiniMax request gateway rather than the upstream batch Python converter. Only the user-approved round-15 cues, pauses and neutral-tone `le5` enter generated Xitai dialogue; Markdown/LaTeX conversion is unnecessary for this structured conversational input. Manual authoring is unchanged.

