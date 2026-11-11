# D17 website media

All four production images are bundled WebP files. No remote image request or additional image service is used at runtime. Total payload is approximately 220 KiB before HTTP compression and browser caching.

| File | Origin | Use |
| --- | --- | --- |
| azathoth-cover.webp | Original image generated for this project on 2026-11-11 | Encyclopedia cover, illustration and gallery |
| community-cover.webp | Unsplash photo-1507525428034-b723cf961d3e | Forum board cover and search thumbnail |
| avatar-island.webp | Unsplash photo-1514888286974-6c03e2ca1dba | Fictional anonymous forum poster's cat avatar |
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
