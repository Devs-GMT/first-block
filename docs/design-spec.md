# First Block — Design Spec

Structure, spacing, type and motion studied from a reference product site (one visit, desktop 1440 px, values read from computed styles). Nothing here copies its images, copy, logo or name. First Block adapts the *patterns*; identity (logo, block motif, accent) is our own.

## 1. What was measured

| Token | Reference value | First Block value (adapted) |
|---|---|---|
| Page background | `#fff` | `#FAFAF7` warm off-white (PRD) |
| Soft surface (cards, chips) | `#f7f6f3` (stone-100) | `#F3F2EC` |
| Ink | `#1e1d1c` (warm near-black, not pure black) | `#15171A` → use warm `#1B1A17` |
| Muted text | `#78756f` (stone-500) | `#6B6962` |
| Hairline border | `#1e1d1c0f` (ink at 6%) | `rgba(21,23,26,.07)` |
| Primary button | ink bg, `#f7f6f3` text, pill | same |
| Secondary button | `lab(95.94)` grey bg, grey text, pill | same, ink-6% bg |
| Accent | none (monochrome product) | block green `#1FA971`, amber `#F5B83D` for XP/Graduate |

Where the PRD guess differs: the reference is not pure white/cool grey but **warm stone** (ink, muted and surface all lean warm). PRD's `#6B7078` muted is cool; switch to the warm `#6B6962`. Borders are alpha-ink hairlines, not solid `#E7E7E2`.

## 2. Type

- Family: Inter (variable 100–900) everywhere. PRD wants Inter Tight for headlines: acceptable since the reference uses a single grotesk with **tight tracking**, not weight, for hierarchy.
- **Weight is 400 for H1/H2/H3**. Hierarchy comes from size and negative tracking, not bold. (The "2x" stat is 300.) This is the most recognisable trait. Use 400–500 for headlines, never 700.

| Role | Size / line-height | Tracking |
|---|---|---|
| H1 | 48 / 60 (36 on mobile, lh 1.25) | −1.44px (−3%) |
| H2 | 28 / 36.4–37.8 (lh 1.3–1.35) | −0.56px (−2%) |
| H3 (feature title) | 26 / 33.8 | −0.52px |
| Big stat | 48 / 48, weight 300 | −0.96px |
| Body | 16 / 24, muted for supporting copy | normal |
| Nav / buttons | 13–15, weight 500 | normal |
| Eyebrow | 13, weight 500, muted `#78756f`, no caps, no pill | normal |

Eyebrows here are plain small muted text above the heading (not uppercase, not boxed). Footer column titles are the only uppercase labels.

## 3. Shape, spacing, depth

- Container: content column ~1200 px centred; navbar side padding 64 px desktop. Text blocks cap at ~620 px.
- Section padding: `80px 0` (feature sections), `112px 0` (the problem, comparison), hero `80px 0 24px`. Section heights 380–1350 px; only the feature section is long (3.5k px).
- Radii: pills (`9999px`) for buttons, nav items, tab bars; 12–14 px for small list rows/menu items; 18–20 px for content cards; 24 px for large cards; 44 px for the phone mock.
- Shadow: one soft style `0 2px 12px rgba(0,0,0,.06)` on white cards; surface cards (`#f7f6f3`) have no shadow and no border.
- Button sizes: nav CTA h34 / 13px / `0 16px`; hero CTA h46 / 15px / `0 28px`; secondary h45 / 14px / `12px 20px`. All pill, 0.8px ink border on primary.
- Header: sticky, white (no blur, no border at rest), 61 px high.

## 4. Motion

All easing is the Tailwind default `cubic-bezier(.4,0,.2,1)` at 150 ms for colour/hover; entrances use out-expo `cubic-bezier(.22,1,.36,1)`.

| Pattern | Spec |
|---|---|
| Hero intro | staggered fade: nav/tag 0.45s, title 0.5s @ 0.18s, copy 0.6s @ 0.4s with `translateY(12px)` and a slight overshoot ease `(.22,1.15,.36,1)`, hero art 1.1s @ 0.45s |
| Section titles | **per-character colour sweep**: every character is a span, `animation-delay` stepping 25 ms, `0.6s ease-out forwards`, triggered when the title enters the viewport (`data-triggered`). Each char starts at ink 12% and passes through **blue `#498FFF` (20%) → coral `#FF7A7A` (50%) → amber `#FFBC74` (80%)** before settling on ink `#0E0E10` (muted variant settles on `#A8A29E`). So the wave is a short rainbow that leaves ink behind. |
| Tile press | `trainedTileBounce` 1 → .972 (38%) → 1.014 (68%) → 1, a tiny squash-and-settle |
| Hero card enter | `opacity 0, translateY(16px)` → `1, 0` |
| Marquee | track `translateX(0 → -50%)` linear, paused until the row is visible; edges masked with a 48 px fade |
| Scroll reveal | sections appear blank until scrolled into view, then fade/slide up |
| Cards | hover shimmer sweep, tile bounce, soft glows (decorative; we only keep the sweep) |
| Marquee | logo/integration row scrolls on a slow linear loop |

Our version: keep the character-by-character title fill (it is the signature) but use it only on H1 + section H2s, respect `prefers-reduced-motion`, and add our own signature: blocks that **click together** when a lesson passes.

## 5. Components to build

- **Pill tab bar** (white, 0.8px 6% border, 4px padding, icons + labels): reuse as the lesson switcher in section 3.
- **Feature block**: eyebrow → H3 → muted paragraph → 2 icon rows (title 500 + muted line) on the left; big mock UI panel on the right; alternate nothing, keep left/right fixed.
- **Numbered problem list**: large number, title, muted line, small "Handled by …" chip.
- **Comparison section**: H2 + short paragraph + table of ✓/✗ rows.
- **Live demo block**: eyebrow "LIVE DEMO" (flex with a dot) + two-line H2 + dark pill "Try it live".
- **Integrations**: marquee row of tiles.
- **Customer stats**: big count H2 + horizontally scrolling cards.
- **FAQ**: accordion, 20 px padding rows, 16px question, no border at rest, "Get started" pill beside the H2.
- **Floating helper**: `fixed` bottom bar, `z-80`, `pointer-events-none` container, suggested-question chips (e.g. two questions) plus an input; panel opens above it.
- **Footer**: four uppercase-label columns (Products / Industries / Resources / Company), `© year`, X + LinkedIn text links, and an "AI-readable" link at the end. Padding `0 0 80px`, transparent background.

## 6. PRD section → reference section map

| PRD home section | Reference section | Notes |
|---|---|---|
| Navbar | Sticky white header with dropdown groups + "Log in" + dark pill CTA | PRD adds wallet button |
| 1 Hero | Hero: tag pill, H1, subhead, pill search field + secondary pill, "search instead" link, decorative dial | Search field → "Paste a wallet" |
| 2 The problem | "Three jobs…" numbered list + stat/testimonial card | testimonial → real graduate notes |
| 3 The 5 lessons | Feature blocks with eyebrow, H3, icon rows, mock panel + pill tab bar | one tab per lesson |
| 4 Who it's for | Industry cards row | needs our own drawn art |
| 5 It checks, then unlocks | "It asks first, then earns the keys" with 3 mock panels | |
| 6 Everything you'll touch | "And it's all one system" grid | 12 flip tiles |
| 7 Why First Block | "Other tools give you a dashboard…" comparison | ✓/✗ table |
| 8 Live demo | "Don't take our word for it" | live hello wall |
| 9 Works with | "Integrates with your tools" marquee | |
| 10 Graduates | "21,000+ paying businesses…" stats cards | real contract count only |
| 11 FAQ | "Your questions, covered" accordion | |
| Floating helper | Fixed bottom chat bar | |
| Footer | 4-column footer | replaced by "Lesson ∞" block card (PRD §12) |

## 7. Mobile (measured at 375 px)

| Item | Value |
|---|---|
| H1 | 36 / 45, −1.08px (−3%), centred |
| H2 | 24 / 31.2, −0.48px (−2%) |
| H3 | 22 / 28.6 |
| Header | 58 px high; logo left, dark pill "Get started" (h34, 13px) + hamburger right; side padding 24 px |
| Hero | centred; small tag pill with icon; 3-line H1; muted subhead; search pill with inner grey "Run free audit" button; location chip; underlined text link below. Padding `32px 0 64px` |
| Section padding | `80px 0` (same as desktop) |
| Layout | single column; mock UI images stack full-width with a small muted caption beneath each |
| Page height | 20.5k px vs 13k desktop (everything stacks) |
| Overflow | none (scrollWidth = 375) |
| Menu | hamburger → full-screen white sheet; the X replaces the hamburger in place; groups are **always expanded**: group label 16px ink, children 14px muted, indented with a thin left rule; "Log in", "Integrations", "Pricing" as plain rows |
| Helper widget | fixed bottom, full width, `px-16`, bottom padding `max(20px, safe-area-inset)`; `z-80`; container `pointer-events-none`, only the chips/input take clicks |

## 8. Desktop details (measured)

- **Dropdowns**: white panel, radius 16, padding 6, ring `0 0 0 1px rgba(0,0,0,.06)` + `0 2px 12px rgba(0,0,0,.06)`. Items: 14px, `8px 12px`, radius 12. Opening a menu gives its trigger a `#f7f6f3` pill background. Transition on opacity/transform.
- **FAQ**: each row is its own `#f7f6f3` card, radius 16, row padding 20, question 16px, no border; open state shows the answer inside the same card; 16 px chevron rotates over 0.2 s `(.4,0,.2,1)`.
- **Helper widget**: assistant label 14px ink, "Ask anything" 11px muted, greeting 14px; suggested-question chips are white pills, 13px, `0 16px`, border `0.8px rgba(0,0,0,.1)`, shadow `0 2px 12px rgba(0,0,0,.07)`; input row max-width 680, grey circle button + ink circle send button; disclaimer 11px muted ("Answers may be incomplete").
- **Pill tab bar**: buttons 13px / 500, `0 14px`, muted text; selected tab is ink text on white inside the bordered pill.
- **Footer** uses **monospace** for the labels: `ui-monospace, SF Mono, Menlo, Consolas`, 12px uppercase, tracking 0.72px, muted; the copyright row is the same mono at 14px uppercase (`© 2026 …  X  LINKEDIN  HEY AI, LEARN ABOUT US`). This is why the PRD's JetBrains Mono suits First Block: use mono for footer labels, addresses and hashes.
- **Cards**: white card radius 20, padding 20, `0 2px 12px rgba(0,0,0,.06)`; soft card `#f7f6f3` radius 20, padding `40px 20px`; image tiles `#f1f0ef` radius 18; phone mock radius 44 with `0 0 0 3px rgba(0,0,0,.04)` + `0 4px 40px rgba(0,0,0,.08)`.

## 9. Remaining gaps (honest)

- Claude in Chrome never connected in this session, and the site resets connections from automated desktop Chrome (puppeteer). Everything above came from the in-app browser: computed styles plus a handful of small screenshots (375 and 1440 px).
- Not recorded: video or GIF of scroll and hover motion. Motion is documented from the site's own CSS keyframes and timings (section 4), read from the stylesheet, not from watching frames.
- Hover rules (read from class names): list rows and nav items get `bg-stone-100/60` (#f7f6f3 at 60%) on hover, dropdown items get a grouped-grey background, all with the 150 ms default transition. Cards have no lift or shadow change on hover; feedback is a background tint only.
- No screenshots are stored in this repo.

## 10. Second study pass (structure of the whole landing, measured at 1440 px)

Measured from the reference's layout classes and computed styles; implemented in First Block with copy from the PRD.

| Pattern | Reference | First Block |
|---|---|---|
| Container | content 1272 px wide (page padding ~84 px) | `.wrap` max 1400 with 64 px padding, so 1272 px content at 1440 |
| Section header | centered H2 24/28 px + 15/16 px paragraph, max 640 px, `mb-10` | same |
| "Problem" | 2 columns 604/604, gap 64; left column `sticky top-32` | same, left column sticky at 112 px |
| Features | tab bar `sticky top-16 z-30` with the active tab outlined 1.5 px in ink; grid 408/816, gap 48; left holds **all** feature blocks stacked, each `min-height 70vh` and vertically centered; right mock is `sticky`, `aspect-ratio 1152/772`, top `max(7.5rem, 50vh - min(18.5vw, 273px))`, caption below (13 px, stone-500) | same; the mock's scene, rail icon, tab and left block stay in sync with scroll. On mobile only the active block shows and tabs drive it |
| Feature mock content | one app shell (icon rail, chat column, wide main column) whose **main panel changes per feature** (chat draft, website preview, phone, calendar, customers) and animates | one shell, six scenes: network setup, first transaction, hello wall, Counter code + deploy, increment x3, graduation card with confetti |
| Section titles | per-character colour sweep when they enter the viewport; no dimming of inactive blocks (the pale look is the sweep before it triggers) | same, via `sweepify` |
| "It asks first, then earns the keys" | H2 + muted second line + three steps, each with title, sentence and mini UI | "It checks first…" + muted "No self-reported progress." + three steps with PRD mock panels |
| Comparison | 2 columns: heading + paragraph left, table right with short text per cell | same, with ✓/✗ icons and short text per cell |
| Integrations | 3 x 2 grid of link tiles (name + domain, 82 px high, radius 20) | same, tiles link to the real BOT Chain resources |
| Customer stories | 12-col grid, 4 left (heading, paragraph, button) / 8 right (scrolling cards) | 1fr / 2fr; right shows an honest empty state until there are graduates |
| FAQ | grid 2fr / 3fr, left `sticky top-28`, accordion rows on the right | same |
| Floating helper | fixed bottom, `z-80` | bottom-right bubble with panel |

Not carried over, on purpose: the phone-mockup section (not in the PRD), the live phone-call demo (we show a hello wall instead), and any rating or customer numbers.

Still not recorded: video of the reference's motion. Frame sampling was limited by the small browser pane, so timings come from its CSS keyframes and transitions, and the scripted scenes were designed by hand.
