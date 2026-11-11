# D17 website media

The six assets in the earlier revision below are bundled WebP files. The user-v3 additions are recorded at the end of this file. No remote image request or additional image service is used at runtime. Total payload is approximately 345 KiB before HTTP compression and browser caching.

| File | Origin | Use |
| --- | --- | --- |
| azathoth-cover.webp | Original image generated for this project on 2026-11-11 | Encyclopedia cover, illustration and gallery |
| community-cover.webp | Unsplash photo-1507525428034-b723cf961d3e | Forum board cover and search thumbnail |
| avatar-island.webp | Unsplash photo-1514888286974-6c03e2ca1dba | Fictional anonymous forum poster's cat avatar |
| server-room.webp | Unsplash photo-1558494949-ef010cbdcc31 | Software and technical reporting illustration, not an incident photograph |
| record-desk.webp | Unsplash photo-1539375665275-f9de415ef9ac | Music journal record-player illustration |
| avatar-fish.webp | Unsplash photo-1535591273668-578e31182c4f | Fictional anonymous commenter's ocean avatar |

Unsplash license, checked 2026-11-11: https://unsplash.com/license . The original three photography URLs are https://images.unsplash.com/ followed by the listed photo IDs. Photography is not used to portray any story character or real person's identity. Images were resized and encoded as WebP for the phone viewport.

Original illustration prompt: A polished 3:2 landscape editorial illustration for an Azathoth encyclopedia entry; deep violet and midnight blue nebula, an unfathomable swirling organic cosmic entity with a small luminous amber core, interstellar-gas tendrils and scattered stars, subtle etched painterly textures. Contemplative cosmic horror, no gore, human figure, literal eye or skull; no text, logo, frame, watermark or UI. Generated with the built-in image tool; original source retained outside the production package, selected asset saved here.

Visual references were inspected, not copied into the product:

- Baidu Baike mobile entry layout: https://vctnewsmedia.s3-ap-northeast-1.amazonaws.com/uploads/20240513170552/5154b3c6151c8a29799ce47bd6622a6c4cc37a4375b71eb5027e001baf37bd57.png
- Discuz!Q phone community layout: https://libs.websoft9.com/Websoft9/DocsPicture/zh/discuzq/discuzq-guim-websoft9.webp
- Discuz source architecture reference: https://github.com/Discuz-X/DiscuzX

Encyclopedia copy is newly paraphrased from H. P. Lovecraft's original writings, not copied from Baidu:

- https://www.hplovecraft.com/writings/texts/fiction/az.aspx
- https://www.hplovecraft.com/writings/texts/poetry/p289.aspx , XXII Azathoth

The in-phone encyclopedia only describes literary mythology. The fictional organization and the commenter's phishing claim remain in the forum dialogue and are not presented as public encyclopedia facts. Community portal hostnames are narrative URLs rendered locally; the app never sends credentials or requests to them.

Public-world expansion references (checked 2026-11-11):

- https://miragejs.com/docs/getting-started/introduction/ and https://miragejs.com/docs/getting-started/overview/ : newly paraphrased background on API simulation; no current version claims.
- https://mirageos.org/ and https://mirageos.org/docs/faq : newly paraphrased long-established library-OS concept.
- https://attack.mitre.org/resources/updates/updates-april-2019/index.html : attribution uncertainty and overlapping names as reporting methodology, not evidence of an actual Azathoth organization.
- https://www.microsoft.com/en-us/security/blog/2019/07/08/dismantling-a-fileless-campaign-microsoft-defender-atp-next-gen-protection-exposes-astaroth-attack/ : Astaroth spelling distinction only; no attack instructions or invented Azathoth attribution.

Glass Hours, HALFSTEP, Slow Route, Digital Margin, Northline, Outside Stack, Packet Cafe and Northbridge are authored fictional publications/subjects. The Silent Bell incident and forum debate are invented story-world writing. They are not claims that real companies were attacked or that real journalists published these stories. Copy keeps public projects separate from private member material and does not reveal the hidden administrator. All dates precede D17 (2025-06-04).

## User handoff v3 replacement

The prior Azathoth feature/news/debate copy is superseded by the supplied six-site handoff (2026-11-11). Exact display copy is frozen in tests/fixtures/d17-azathoth-v3.json. Previous pages and image mappings are backed up in docs/d17-azathoth-before-v3.json; prior Git revisions preserve rollback. Internal page IDs stay stable; displayed URLs now use .example and no longer impersonate real publishers. Mirage search is untouched.

New assets: nocturne-cover.webp and abyss-boss.webp are original generated illustrations for the fictional record and game. sleeper-art.webp is an original artist-portfolio painting. tutorial-scan.svg is an authored benign document prop, not a real recovered document; it contains no executable code. old-keyboard.webp is Unsplash photo-1587829741301-dc798b83add3 under the previously linked Unsplash license, used as a generic keyboard illustration, not a person or incident photograph.
