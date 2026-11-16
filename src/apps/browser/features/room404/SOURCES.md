# room.404 Instagram webpage

## Visual references

- Instagram / Adam Mosseri profile grid explanation, January 19, 2025: https://www.threads.com/@mosseri/post/DFBmsT0SKO6 . Three-column portrait grid fits the story's 2025 setting; no later grid-reordering features were added.
- Williano/Instagram-UI (MIT): https://github.com/Williano/Instagram-UI . Inspected its public feed screenshot for post header, image, outline action icons, likes and caption hierarchy.
- Doha26/Instagram-clone: https://github.com/Doha26/Instagram-clone . Inspected `src/screenshots/Demo2.png` for mobile avatar, counts, profile controls and grid proportions. Its 2019 navigation is not copied into the 2025 web page.
- leocosta1/instagram-clone (MIT): https://github.com/leocosta1/instagram-clone . Responsive web structure reference only.

No upstream application code, screenshot, font or brand artwork is bundled. The page and outline icons are implemented locally inside the existing browser App. The Instagram label identifies the in-story service.

## User-owned content

All photographs are supplied by the user; originals were not retouched. WebP encoding reduces transfer size. Full original framing is retained in post detail/lightbox; the three-column grid uses CSS cropping.

| Asset | User source | Approved caption |
| --- | --- | --- |
| avatar.webp | IMG_4983.jpeg | Black-and-white masked portrait |
| selfie.webp | IMG_4981.jpeg | Sem desculpas. |
| faro.webp | IMG_4994.jpeg | O de sempre. |
| afterparty.webp | IMG_4998.jpeg | Afterparty. The undisputed champion. |
| coffee.webp | IMG_4995.jpeg | Como antes. |
| heart.webp | IMG_4996.jpeg | Frágil. |
| jetlag.webp | IMG_4997.jpeg | Jet lag… |
| autumn.webp | IMG_4993.jpeg | Mais um outono. |

Dates and reverse chronology use the preceding approved seven-post handoff. The account has display name `T.`, an empty biography, zero followers, zero following, one or two likes per post and no comments, tags or locations. No real name is shown.

The live phone uses its existing Story55 `ig` gate, browser navigation and `readEvidence55` persistence. Opening the portrait post records the existing page evidence once; search results and the profile grid do not. The standalone preview reuses the exact same renderer and handler, with no phone save or story mutation.
