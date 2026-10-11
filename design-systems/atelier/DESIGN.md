---
name: Atelier
description: Daylight gallery system extracted from gallery.alberyt.xyz. Paper plates on a warm canvas, ink type, the work as the only colour.
colors:
  bg: "#fbf7f0"
  surface: "#ffffff"
  surface-2: "#f1e9da"
  border: "#e6dcc8"
  border-strong: "#cdbfa5"
  control: "#948975"
  text: "#211c16"
  text-2: "#6b5f52"
  muted: "#6b5f52"
  accent: "#211c16"
  accent-hover: "#6b5f52"
  accent-ink: "#fbf7f0"
  sage: "#5f7452"
  focus: "#2f5cff"
  success: "#4f6a40"
  warning: "#8a5a12"
  danger: "#a3352a"
typography:
  display:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "clamp(2.75rem, 1.6rem + 4.6vw, 5rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "clamp(1.75rem, 1.4rem + 1.2vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.1
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  xs: "0.5rem"
  sm: "1.1rem"
  md: "1.25rem"
  lg: "1.75rem"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4rem"
  "9": "6rem"
  "10": "8rem"
  gutter: "clamp(1.5rem, 0.5rem + 4vw, 4rem)"
  section: "clamp(5rem, 3rem + 6vw, 8rem)"
  container: "90rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.5rem"
  plate:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "0.5rem"
  plate-media:
    backgroundColor: "{colors.surface-2}"
    rounded: "1.25rem"
  eyebrow-pill:
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "0.875rem"
    height: "3rem"
---

# Design System: Atelier

## Overview

**Creative North Star: "The Daylight Gallery"**

A gallery wall at midday. The canvas is warm and quiet, each piece of work hangs in a paper frame with a soft shadow, and the only saturated colour on the page comes from the work itself. Typography does the talking a gallery label would: a Fraunces display for titles, set tight and confident, and Plus Jakarta Sans for everything a visitor reads or clicks.

Built for one job: making a non-technical visitor believe the person behind it can build them something beautiful, and then email them. No stacks, no tags, no jargon, no monospace.

**Mode:** Experience (the screenshots lead) and Persuade (one action: get in touch).
**Dials (taste-skill):** DESIGN_VARIANCE 8 · MOTION_INTENSITY 7 · VISUAL_DENSITY 3.
**Source of truth:** `atelier/tokens.css`, extracted from `portfolio-gallery/src/index.css`.

**Key characteristics**
- Concentric "double-bezel" plates: an outer paper shell (28px radius, 8px padding) around an inner image well (20px).
- Pill controls, with the trailing arrow in its own circle ("button-in-button").
- Heavy, settled motion on `cubic-bezier(0.32, 0.72, 0, 1)`; reveals rise 1.5rem out of an 8px blur.
- A 3.5% film grain fixed over the whole page.
- Light-first. The espresso dark theme is new and follows the OS.

## Logo and icons

The alberyt mark: a **peak** (the A of Albert, and the Retezat ridge), cut by a **contour** band where an A's crossbar would be, and ended by a **cursor** block. The peak takes `text`, the cursor takes `accent`, and nothing else about it changes between systems.

In Atelier both parts are Ink (`#211c16`; cream `#f3ebde` in the espresso theme), because `accent` is ink here: the mark stays one colour, as the Work-Is-The-Colour Rule asks.

- **Header.** The small mark before the italic Fraunces wordmark in the island. Don't use the Plex Mono lockup in Atelier: its audience reads monospace as code.
- **Gallery footer.** The small mark can sign the footer prompt beside "alberyt.xyz"; once per page.

**Using the files**

- **Sizes.** From 32px up use `alberyt-mark-*`. Below 32px use `alberyt-mark-small-*`, which drops the contour band so it doesn't clog.
- **Files.** `brand/dist/systems/atelier/` holds this system's files: `-dark` files are for dark grounds, `-light` files for light ones; each is painted in this system's colours. In HTML, inline the SVG instead (`brand/dist/alberyt-mark.svg`, or the snippet in `core/components.css`): the peak is `fill: currentColor`, the cursor `fill: var(--mark-signal)`, which `core/components.css` sets to `accent`, so it follows the theme.
- **Clear space.** Leave at least one cursor width (about a quarter of the mark's height) on every side. Never outline, rotate, stretch or recolour the parts separately.
- **Tile and favicon.** `alberyt-tile-*` is the app icon (field `bg`, peak `text`, cursor `accent`, corners rounded as much as this system rounds its cards); `alberyt-favicon.svg` is the tile in this system's default theme with the small cut.

### Icons
17 interface icons drawn on the mark's 24-unit grid: a 2-unit stroke, square caps, mitred joins, and any solid part (a calendar's header band, a PDF label, the share nodes) drawn as the cursor's flat block. They are painted in `currentColor`, so in a page they take the colour of the text around them. Set them at 16, 20 or 24px; at 16px the stroke is 1.33px. Files: `brand/dist/icons/` (one SVG each, plus `sprite.svg`), and orar.alberyt.xyz uses it. In Atelier keep icons inside controls (the arrow in the island button's circle, a close in a dialog), never as decoration beside copy.

## Colors

Warm monochrome. Ink on canvas, with one muted sage held in reserve.

### Primary
- **Ink** (`#211c16`): headings, body text and every action (primary buttons are ink pills). Hover softens to Ink Soft.
- **Digital Ink** (`#2f5cff`): focus rings only. It is the one cool note on the page and appears only when someone is using a keyboard.

### Secondary
- **Sage** (`#5f7452`): small marks, at most a few per page. Never a fill, never text.

### Neutral
- **Canvas** (`#fbf7f0`): page background. **Canvas Deep** (`#f1e9da`): image wells, empty states.
- **Paper** (`#ffffff`): plate shells, inputs, the island header (at 80% with blur).
- **Line** (`#e6dcc8`): hairlines, pill outlines. **Control** (`#948975`): input borders (3:1).
- **Ink Soft** (`#6b5f52`): secondary text, URLs, captions.

### Dark "espresso" theme (follows the OS)
`--bg #16120e`, `--surface #201b16`, `--surface-2 #2a241d`, `--text #f3ebde`, `--text-2 #c2b4a2`, `--accent #f3ebde` (actions become cream pills), `--sage #a3b593`, `--focus #8aa4ff`. Grain switches to a 5% screen blend.

### Named Rules
**The Work-Is-The-Colour Rule.** Interface colour stays in the ink/canvas range so screenshots and photographs are the only saturated thing on the page.
**The Focus-Only Blue Rule.** `#2f5cff` exists for focus rings. It never fills, never colours text, never decorates.

## Typography

**Display:** Fraunces (opsz 9 to 144, 400 to 600, italic 400 to 500), fallback `ui-serif, Georgia`.
**Body and UI:** Plus Jakarta Sans (400 to 700), fallback `ui-sans-serif, system-ui`.

**Character:** a soft, slightly wonky display serif against a clean geometric sans. Both carry latin-ext, so Romanian diacritics stay in face.

### Hierarchy
- **Display** (500, 44px to 80px, 0.98, -0.015em): the hero line and the footer prompt. One word may go italic 400 for emphasis.
- **Headline** (500, 28px to 36px, 1.1): section openers.
- **Title** (Fraunces 500, 1.5rem, -0.01em): plate titles.
- **Body** (400, 16px / 18px lede, 1.6): plate descriptions, hero subline (max 28rem).
- **Label** (600, 14px, 0.05em): buttons, URLs. **Micro** (500, 10px, 0.2em, uppercase): the eyebrow pill only.

### Named Rules
**The Same-Family Emphasis Rule.** Emphasis is italic Fraunces inside a Fraunces line, never a different family dropped into a heading.

## Layout

A 90rem shell, 12-column thinking, 1.5rem to 4rem side margins. Spacing is deliberately aggressive: 4rem inside a chapter, 8rem between chapters.

- Hero: a split, copy left (eyebrow pill, display, subline, one button), a "showcase" of three offset plates right, each rotated a few degrees and floating on its own slow period. The rotation is removed under 768px.
- Gallery: equal 16:10 plates (matching the 1440×900 capture viewport), 1 column on mobile, 2 at 768px, 3 at 1024px, in array order.
- Header: a floating island pill detached from the top, not an edge-to-edge bar.
- Footer: a centred Fraunces prompt and one button.

## Elevation & Depth

Warm, diffuse, offset shadows; never grey, never a zero-offset glow.
- **Rest** (`0 16px 40px -30px rgba(33, 28, 22, 0.4)`): plates.
- **Lift** (`0 30px 55px -25px rgba(33, 28, 22, 0.45)`): plates on hover (with `translateY(-6px)`), the primary button on hover, the showcase.
- **Island** (`0 8px 30px -14px rgba(33, 28, 22, 0.35)`): the header pill.
Overlays use 20px backdrop blur over canvas at 82% (the plate label on hover).

## Shapes

Soft and concentric. Outer shell 1.75rem, inner well `1.75rem - 0.5rem`; showcase plates 1.5rem / 1.1rem. Buttons, the header and the eyebrow are full pills. Inputs are 0.875rem: rounded, but not pills.

## Components

- **Plate** (`.plate`): the double-bezel card. On hover-capable devices the label is a frosted panel that fades in over the whole plate; elsewhere the same text sits under the image as a caption. Capability decides this, not screen width. The whole plate is one link to the live site.
- **Island header** (`.island`): italic Fraunces wordmark, two text links, one ink pill.
- **Island button** (`.btn--island`): ink pill whose trailing arrow sits in a 2.25rem circle; on hover the button rises 2px and the circle nudges up-right.
- **Eyebrow pill** (`.eyebrow-pill`): one per page, above the hero headline.
- **Showcase** (`.showcase`): three rotated plates on independent floats (9s, 11s, 8s).
- **Grain** (`.grain`): one fixed layer at the root, `pointer-events: none`, never on a scrolling element.

## Do's and Don'ts

**Do**
- Let real screenshots or photographs carry every plate. Capture them at 1440×900 so 16:10 fits without cropping.
- Keep copy free of tech words; describe what a site does, not how it was built.
- Gate hover-only reveals behind `(hover: hover) and (pointer: fine)` and mirror them on keyboard focus.

**Don't**
- Don't use monospace, tags or numbered indices; they read as "code" to this audience.
- Don't add a second saturated colour to the interface.
- Don't fill anything with Digital Ink.
- Don't put a pill on large containers; pills are for controls.

**Watch out.** Both impeccable and taste-skill name "warm cream ground + Fraunces display" as the most common AI-generated look. Atelier is your live gallery, so it is documented as built. When you reuse it for a new client, keep the structure (plates, island, motion) and swap one of the two signature choices so the result stops reading as the default: replace Fraunces with a less common display face that has latin-ext (Brygada 1918, Gloock, Young Serif, Bodoni Moda), or move the canvas off cream (a cool paper such as `#f4f5f2`, or one of the families taste-skill rotates through: Forest, Black and Tan, Olive + Brick + Paper).
