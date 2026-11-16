Control Center references and attribution

- SVG glyphs: https://github.com/framework7io/framework7-icons (MIT, copyright 2016 Vladimir Kharlampidi). The selected `src/sf` SVG path data is embedded in ../native-icons.js with `currentColor`; the original license is preserved in LICENSE.
- Layout / state reference: Apple's Control Center documentation, https://support.apple.com/guide/iphone/use-and-customize-control-center-iph59095ec58/ios . No Apple screenshot is shipped as a UI asset.
- Studied HTML/CSS implementation: https://github.com/Mindenry/iosSimulator/blob/main/simulator.css . Used for comparison only; no code copied.
- Product-specific behavior: the bell mutes all BBBTAI audio; Do Not Disturb suppresses message presentations while retaining delivery, badges and the notification center. Existing Settings flags and the existing music player remain the sources of truth.
