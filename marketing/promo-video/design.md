# NETbudget Promo Video — Design System

Brand: NETbudget — privacy-first personal budgeting app.
Tone: premium, calm, trustworthy, confident. Not flashy. Not corporate.

## Palette

Sourced from netbudget.app website (Tailwind tokens).

| Token             | Hex       | Use                                         |
| ----------------- | --------- | ------------------------------------------- |
| `midnight-900`    | `#0A1224` | Deepest background (lockups, fade-to-black) |
| `midnight-800`    | `#0F1E3D` | Primary scene background                    |
| `midnight-700`    | `#162B53` | Card / surface elevated                     |
| `midnight-600`    | `#1E3A6B` | Borders, dividers, subtle accents           |
| `mint-300`        | `#6EE7B7` | Primary accent — numbers, donuts, CTAs      |
| `mint-400`        | `#34D399` | Secondary mint, deeper                      |
| `mint-500`        | `#10B981` | Used for filled buttons / focal hits        |
| `cyan-300`        | `#67E8F9` | Secondary accent — info, "live" indicators  |
| `text-1`          | `#FAFAFA` | Primary text                                |
| `text-2`          | `#A1A1AA` | Muted text (labels, captions)               |
| `text-3`          | `#71717A` | Subtle text (meta, fine print)              |

No neon. No gradients on text. Solid colors, soft glows.

## Typography

- Family: `Inter` (loaded from Google Fonts)
- Weights: 300 (rare), 400 (body), 500 (labels), 600 (subheads), 800 (hero)
- Scale (video, 1080×1920 vertical):
  - Hero: 110px / 800
  - Subhead: 56px / 600
  - Body: 36px / 400
  - Label / meta: 24px / 500
  - Fine print: 20px / 400

No serif. No italic. Generous line-height (1.15 for hero, 1.4 for body).

## Motion Language

- Eases: `power3.out` for entrances, `power2.inOut` for ambient, `expo.out` for emphatic hits.
- Entrance duration: 0.5–0.8s typical. Hero text: 0.7s. Cards: 0.5s with 80–120ms stagger.
- Ambient: subtle breathing scale (`1.0 → 1.03 → 1.0` over 4s), drifting glows.
- No bouncing. No elastic. No flashy rotations.

## Visual Vocabulary

- **iPhone mockup**: rounded corners (radius 60px), thin border (`#1E3A6B` 4px), soft mint glow under it. App screen is the visual hero.
- **Donut chart**: 50/30/20 split (mint-300 needs, cyan-300 wants, text-2 savings). 24px stroke, animated `stroke-dashoffset`.
- **Cards**: `midnight-700` fill, `midnight-600` 2px border, 28px radius, 40px padding. Mint left-edge accent (4px wide) on featured cards.
- **App Store / Play Store badges**: official outlines, mint-300 fill on App Store, midnight-600 outline + text-2 on Google Play with "Coming Soon" caption.

## Frame Composition (9:16 / 1080×1920)

- Safe zone: top 240px (status bar area on phones), bottom 280px (CTA / caption area).
- Hero element: anchored 35–55% from top.
- Captions / supporting text: bottom 320–420px from top of bottom safe zone.
- Decoratives: radial glow centered behind hero (40% scene height), thin 2px hairline across top or bottom for structure.

## Don'ts

- No emojis anywhere.
- No mentions of competitor apps (Finary, Mint, YNAB, etc.).
- No purple-to-blue gradients (lazy AI tell).
- No centered-floating layouts. Anchor to edges or 35–55% vertical line.
- No `#000` pure black. Use `#0A1224` (midnight-900).
- No `#fff` pure white. Use `#FAFAFA` (text-1).
- No exit animations between scenes — let the transition handle that.
