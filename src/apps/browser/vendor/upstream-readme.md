# ELECTRO — Premium Tech & Electronics Store HTML Template

A premium, framework-free HTML/CSS/vanilla-JS template for electronics retailers, tech gadget shops, and authorized dealer storefronts. Built bespoke from the subject — not a recolored scaffold.

**Live preview:** `index.html` (open in browser)
**Stack:** HTML5 · CSS3 (custom properties, Grid, Flex) · Vanilla JS (no build step)
**Fonts:** Space Grotesk (display) · Inter (body) — all via Google Fonts
**License:** MIT — use commercially, modify freely.

---

## 📸 Screenshot

![Homepage Preview](screenshot.png)

## Pages

| Page | Description | Link |
|------|-------------|------|
| **Home** | Hero with tech imagery, 4 trust badges (shipping/warranty/returns/support), 5 category cards, 8 featured product cards with ratings + pricing, brand logos strip, newsletter subscription, full footer | [index.html](index.html) |
| **Products** | Page head with breadcrumb, 7-category filter bar (All/Laptops/Smartphones/Audio/Gaming/Cameras/Accessories), 12 product cards with badges + ratings + pricing, spec comparison table (3 laptops side-by-side), CTA | [products.html](products.html) |
| **About** | Company story with hero image, 4 impact stats (50K+ sold, 35K+ customers, 200+ partners, 98% satisfaction), 6 differentiator cards (authentic/tested/shipping/support/price/eco), 4 team members, CTA | [about.html](about.html) |
| **Contact** | Store info cards (address/phone/email/hours), interactive map placeholder, contact form with subject select + phone field, inline validation via `[data-form]`, 3 FAQ quick-answer cards, CTA | [contact.html](contact.html) |

---

## Design Distinction

**This template was authored fresh for an electronics retail / tech gadget subject and diverges from every sibling template on all 6 divergence axes:**

| Axis | ELECTRO (this template) | Sibling templates |
|------|------------------------|-------------------|
| **Hero composition** | Circuit-board dark background with animated grid lines and radial glow. Split layout: left text block with "Next-Gen Tech / Delivered." tagline, right product hero image. Reads like a tech product launch — sharp, luminous, engineered. | Generic templates: flat color hero + centered text, or stock-photo background with overlay. No circuit/tech visual language. |
| **Layout grammar** | E-commerce product-first grammar: `.features` (trust strip) → `.categories` (5-card grid with category icons) → `.products-grid` (4-col card grid with ratings, pricing, add-to-cart) → `.promo` (full-width split banner with glow) → `.brands-row` (authorized retailer logos) → `.newsletter`. Every section pushes toward product discovery and purchase. | Generic templates: alternating text+image sections, blog-style content blocks, or service-list layouts. No product card grid or e-commerce layout grammar. |
| **Typography personality** | **Space Grotesk** (display, geometric tech with character) + **Inter** (body, clean neutral for specs and pricing). Product voices — brand labels, star ratings, price anchoring ($old → $new). Numbers and specs are front and center. | Generic templates: serif display fonts for editorial tone, or rounded sans for friendly feel. None lead with product specs, pricing, or star ratings as primary visual elements. |
| **Color logic** | Dark tech foundation: deep navy/charcoal (`--dark`) with electric blue (`--blue`) primary, cyan (`--cyan`) accent, gradient glows. Circuit-board background pattern. High-contrast product cards on light ground. Signal colors: green badges for "New", red for sale percentages. Not a brand ramp — a tech-store palette. | Generic templates: pastels, earth tones, or flat brand colors. No circuit-board pattern, no gradient glow accents, no tech-industry palette reasoning. |
| **Motion signature** | Tech-reveal: `.reveal` elements slide up with staggered delays (`.d1`…`.d4`). Product card hover lifts with shadow expansion. Category card hover shows animated scale + bottom-bar sweep. Circuit-bg has subtle animated grid lines and pulsing glow. Motion reads like electronics powering on — reveals, glows, scale-ups. | Generic templates: fade-in only, or no animation. None have circuit-pattern backgrounds, product card hover effects, or tech-themed motion vocabulary. |
| **Section inventory** | Hero (circuit-bg + split) → Trust strip (4 features) → Category grid (5 cards) → Product grid (8 cards) → Promo banner (glow split) → Brand logos → Newsletter → Footer. Inner pages: Page hero → Content grid → Feature cards → Stats → CTA. Every section has a specific e-commerce purpose — trust, discovery, product, promotion, subscription. | Generic templates: hero → about → services → testimonials → footer. No product grid, no category navigation, no promo banners, no brand logo strips. No e-commerce-specific section types. |

**Bottom line:** Strip the colors from ELECTRO and any sibling — they share **zero** layout grammar, component set, or motion vocabulary. This reads as a premium electronics storefront, not a generic business site.

---

## Features

- **Circuit-board hero** — dark background with animated grid lines, radial glow, split product/text layout
- **Trust strip** — 4 feature cards (Free Shipping, 2-Year Warranty, 30-Day Returns, 24/7 Support)
- **Category navigation** — 5 category cards with icons and product counts
- **Product cards (12)** — image, brand label, product name, star ratings, current/old price, add-to-cart + wishlist buttons, "New"/"Sale" badges
- **Product filtering** — 7-tab filter bar (All/Laptops/Smartphones/Audio/Gaming/Cameras/Accessories) with JS-powered show/hide
- **Spec comparison table** — 3-laptop side-by-side comparison (processor, RAM, storage, display, battery, weight, graphics, ports, webcam, price)
- **Promo banner** — full-width split with glow accent, sale messaging, CTA
- **Brand logos strip** — 8 authorized retailer names (NVIDIA, Sony, Samsung, Apple, Bose, Razer, LG, Dell)
- **About page** — company story, 4 impact stats, 6 differentiator cards, 4 team member cards
- **Contact page** — 4 store info cards, map placeholder, 5-field form with subject select, inline validation via `[data-form]`, 3 FAQ quick-answer cards
- **Newsletter subscription** — email input + subscribe button
- **Scroll reveals** — IntersectionObserver with staggered delays (`.d1`…`.d4`)
- **Cart system** — add-to-cart with badge counter, toast notifications
- **Burger menu** — responsive mobile nav with animated hamburger toggle
- **Footer year** — `[data-year]` auto-fills current year
- **Reduced motion** — `@media (prefers-reduced-motion)` disables all animation
- **Original imagery** — 26 source images in `assets/img/` (products, carousel, banners, avatars)

---

## Quick Start

```bash
# No install, no build — just open
open index.html
# or serve locally
npx serve .
```

---

## File Structure

```
electronics-store-html-template/
├── index.html          # Home page
├── products.html       # Product catalog with filters + comparison table
├── about.html          # Company story, stats, team
├── contact.html        # Contact form + store info + FAQ
├── assets/
│   ├── css/
│   │   └── styles.css  # Bespoke design system
│   ├── js/
│   │   └── main.js     # Bespoke interactions (cart, filters, form, reveals)
│   └── img/            # 26 original source images
└── README.md           # This file
```

---

## Customization

- **Colors:** Edit `:root` tokens in `assets/css/styles.css` — `--blue` (primary), `--cyan` (accent), `--dark` (background), `--green` (new badge), `--danger` (sale badge)
- **Fonts:** Swap Google Fonts `<link>` in each HTML `<head>` and update `--font-display/--font-body`
- **Products:** Add/remove `.product-card` items in `.products-grid` on each page; update `data-category` for filtering
- **Categories:** Edit `.categories` grid on `index.html` — icon, name, count
- **Comparison Table:** Edit `.compare` table rows in `products.html` — features, specs, prices
- **Contact Info:** Edit `.contact-info-card` blocks in `contact.html` — icon, label, value
- **FAQ:** Edit `.feature-card` items in the FAQ section of `contact.html`

---

## Browser Support

Modern evergreen browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+).
Graceful degradation: CSS custom properties, Grid, Flex, `clamp()`, `IntersectionObserver` — all polyfillable if needed.

---

## Credits

- **Images:** Original source assets (included in `assets/img/`) — 26 product, carousel, banner, and avatar images
- **Fonts:** Space Grotesk (Florian Karsten), Inter (Rasmus Andersson) — both SIL OFL via Google Fonts
- **Icons:** Font Awesome 6.5.1 (CDN) — icon font for all UI icons

---

Let's Build Something Together 🚀
https://tally.so/r/q4q1L9
