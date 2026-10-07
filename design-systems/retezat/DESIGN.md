---
name: Retezat
description: Dark field-notebook system extracted from alberyt.xyz. Pine-green signal on a night ground, IBM Plex, square edges.
colors:
  bg: "#0a0d0b"
  surface: "#0f1310"
  surface-2: "#131815"
  surface-glass: "rgba(15, 19, 16, 0.72)"
  surface-glass-strong: "rgba(20, 25, 21, 0.84)"
  border: "#1f2722"
  border-strong: "#2e3a32"
  control: "#5c665f"
  text: "#d9dfda"
  text-2: "#b4bdb6"
  muted: "#8d978f"
  accent: "#4cd97b"
  accent-hover: "#72e597"
  accent-ink: "#0a0d0b"
  accent-dim: "#2c7a4a"
  accent-soft: "rgba(76, 217, 123, 0.07)"
  accent-line: "rgba(76, 217, 123, 0.28)"
  success: "#4cd97b"
  warning: "#e0b44c"
  danger: "#f2766b"
typography:
  display:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 11vw, 4.75rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: "0"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "7": "2rem"
  "8": "3rem"
  "9": "4rem"
  "10": "6rem"
  gutter: "1.25rem"
  section: "clamp(4rem, 10vh, 7rem)"
  container: "64rem"
  prose: "40rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "44px"
    padding: "0 1.15rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "rgba(10, 13, 11, 0.55)"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    height: "44px"
    padding: "0 1.15rem"
  card:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "1.5rem"
  badge:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.none}"
    padding: "0.18rem 0.5rem"
  input:
    backgroundColor: "rgba(10, 13, 11, 0.55)"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    height: "44px"
---

# Design System: Retezat

## Overview

**Creative North Star: "The Night Ridge Notebook"**

A field notebook kept on a ridge at night. The page is the dark green-black of the Retezat mountains after sunset, with a 1 m LiDAR terrain moving slowly behind the glass. Everything a reader needs sits on that glass in two voices: IBM Plex Sans for sentences, IBM Plex Mono for the things a notebook records (dates, keys, statuses, hostnames, tags). One pine green carries every signal: links, the primary action, live states, the caret after the name.

The system is honest about what it is: a technical person's site, built and hosted by that person. Mono is never a costume here; it marks data. Corners stay square, borders stay 1px, and depth comes from glass over the terrain, not from shadows. The one exception to the 1px rule is the win banner's 3px rail, and there is one per page.

**Mode:** Experience (the site itself is part of the proof) and Read (projects and logs are scanned, then read).
**Dials (taste-skill):** DESIGN_VARIANCE 6 · MOTION_INTENSITY 4 · VISUAL_DENSITY 4.
**Source of truth:** `retezat/tokens.css`. This file documents it; the CSS wins if they disagree.

**Key characteristics**
- Dark-first. A light "paper" theme exists for print and for pages that need it, opt-in only (`data-theme="light"`), never from the OS.
- Square everything. `--radius-*` are all 0.
- Two type voices, one family: Plex Sans for prose, Plex Mono for data.
- One accent, `#4cd97b`, used for signal only.
- Bilingual by design (EN/RO); Plex covers Romanian comma-below ș ț.

## Logo and icons

The alberyt mark: a **peak** (the A of Albert, and the Retezat ridge), cut by a **contour** band where an A's crossbar would be, and ended by a **cursor** block. The peak takes `text`, the cursor takes `accent`, and nothing else about it changes between systems. Retezat is alberyt.xyz's own system, so the mark leads here.

In Retezat the peak is Lichen (`#d9dfda`) and the cursor Pine Signal (`#4cd97b`); on the paper theme, `#0c120e` and `#157a3c`. It replaces the old "A_" text favicon and the pine block that stood before the header wordmark.

- **Header.** The small mark, then `alberyt.xyz` in Plex Mono 500 (a hostname, so mono under the Mono-Is-Data Rule). `alberyt-lockup-*` (`brand/dist/systems/retezat/`) is the same pairing drawn as one file, for places where HTML can't set the type (slides, social cards, print).
- **The caret.** The pine `_` after the hero name stays. It is the same cursor, set as type.

**Using the files**

- **Sizes.** From 32px up use `alberyt-mark-*`. Below 32px use `alberyt-mark-small-*`, which drops the contour band so it doesn't clog.
- **Files.** `brand/dist/systems/retezat/` holds this system's files: `-dark` files are for dark grounds, `-light` files for light ones; each is painted in this system's colours. In HTML, inline the SVG instead (`brand/dist/alberyt-mark.svg`, or the snippet in `core/components.css`): the peak is `fill: currentColor`, the cursor `fill: var(--mark-signal)`, which `core/components.css` sets to `accent`, so it follows the theme.
- **Clear space.** Leave at least one cursor width (about a quarter of the mark's height) on every side. Never outline, rotate, stretch or recolour the parts separately.
- **Tile and favicon.** `alberyt-tile-*` is the app icon (field `bg`, peak `text`, cursor `accent`, corners rounded as much as this system rounds its cards); `alberyt-favicon.svg` is the tile in this system's default theme with the small cut.

### Icons
17 interface icons drawn on the mark's 24-unit grid: a 2-unit stroke, square caps, mitred joins, and any solid part (a calendar's header band, a PDF label, the share nodes) drawn as the cursor's flat block. They are painted in `currentColor`, so in a page they take the colour of the text around them. Set them at 16, 20 or 24px; at 16px the stroke is 1.33px. Files: `brand/dist/icons/` (one SVG each, plus `sprite.svg`), and orar.alberyt.xyz uses it. Square caps and mitred joins are Retezat's square-everything rule applied to strokes.

## Colors

A green-tinted night palette: every neutral leans a few degrees toward the accent, so nothing reads as plain grey.

### Primary
- **Pine Signal** (`#4cd97b`): links, primary buttons, the live dot, chip keys, section indices, focus rings. Hover lifts to `#72e597`.
- **Pine Dim** (`#2c7a4a`): shipped status, timeline nodes, underline colour on prose links, text selection.

### Neutral
- **Night Ground** (`#0a0d0b`): page background. Also the ink on pine (button labels, win tag).
- **Glass** (`rgba(15, 19, 16, 0.72)`) and **Strong Glass** (`rgba(20, 25, 21, 0.84)`): cards, logs, trees, chips, the win banner. Always with an 8px backdrop blur.
- **Ridge Line** (`#1f2722`): hairlines and card borders. **Ridge Line Strong** (`#2e3a32`): rules, ghost button borders.
- **Control** (`#5c665f`): input and checkbox borders, the only border that must reach 3:1.
- **Lichen** (`#d9dfda`): body text. **Lichen Soft** (`#b4bdb6`): paragraphs on the terrain and card bodies. **Scree** (`#8d978f`): meta, labels and tags only, never running text.

### Light "paper" theme (opt-in, and print)
`--bg #f2f5f1`, `--surface #ffffff`, `--text #0c120e`, `--text-2 #2e3a32`, `--muted #536058`, `--accent #157a3c` (the pine darkened until it passes 4.5:1 on paper), `--accent-ink #ffffff`.

### Named Rules
**The One Signal Rule.** Green means "this is alive or actionable". Never use it for decoration, headings or large fills beyond the primary button and the win tag.
**The Glass-Needs-Terrain Rule.** Glass surfaces only make sense over the terrain (or another real backdrop). On a plain background, use `--surface` and drop the blur.

## Typography

**Display and body:** IBM Plex Sans (400, 500, 700), fallback `ui-sans-serif, system-ui`.
**Label and data:** IBM Plex Mono (400, 500), fallback `ui-monospace`.

**Character:** an engineer's typeface family used plainly. The sans carries tone; the mono carries facts.

### Hierarchy
- **Display** (700, `clamp(2.5rem, 11vw, 4.75rem)`, 1.02, -0.03em): the name in the hero, once. Followed by the pine `_` caret, which blinks four times and stops.
- **Headline** (700, `clamp(1.75rem, 1.35rem + 1.4vw, 2.25rem)`, 1.15, -0.02em): section titles inside `.sec-head`.
- **Title** (700, 1.1875rem): card titles, the bridge (contact) lede.
- **Lede** (400, `clamp(1.125rem, 1rem + 0.55vw, 1.3125rem)`, `--text-2`): the hero sentence, max 44rem.
- **Body** (400, 1.0625rem, 1.65): prose capped at `--prose` (40rem).
- **Label** (Mono 400, 0.8125rem): nav, dates, chip keys, hero meta. **Micro** (Mono, 0.75rem): badges (uppercase, 0.07em), card dates, tree notes.

### Named Rules
**The Mono-Is-Data Rule.** Mono marks things a log would record: dates, statuses, hostnames, keys, tags, commands. Headlines and paragraphs are always sans.

## Layout

A single 64rem column with a 1.25rem gutter and generous section padding (`clamp(4rem, 10vh, 7rem)`). Prose caps at 40rem. Content sits left-aligned over a full-bleed terrain canvas fixed behind the page.

- Sections open with `.sec-head`: index, title, a rule that fills the row, and right-aligned meta. The index mirrors the nav order (the nav numbers its links on mobile), which is the only reason the numbers are allowed.
- Lists are rows, not card grids: `.log` (dated rows with a status) and `.log--timeline` (the same rows on a rail).
- Two-column splits appear from 900px (`homelab`: log + tree; contact: who + how). Below 600px every row stacks.
- Header height 3.25rem (3.5rem from 900px); nav is a popover menu below 900px.

## Elevation & Depth

Flat glass over terrain. No resting shadows. Depth comes from the backdrop blur and the 1px ridge borders. The only shadow is a pine-tinted lift on hoverable cards (`0 12px 32px -14px rgba(76, 217, 123, 0.22)`, plus `translateY(-3px)` and a brighter border). Text set directly on the terrain gets a dark text-shadow (`.on-terrain`) so it stays legible over bright ridges; text on glass does not.

## Shapes

Square. Radius 0 on buttons, inputs, cards, badges, chips, the language toggle and status dots (dots are 6px squares, not circles). Rules are 1px. The win banner's left rail is 3px and is the only thick edge in the system.

## Components

- **Buttons** (`.btn`): mono 500 0.875rem, 44px tall, 1px border. Primary is pine on night; secondary is translucent night with a ridge border that turns pine on hover. A trailing arrow nudges 3px right on hover. Press: 1px down.
- **Chips** (`.chip`): key in pine mono, value in sans, glass background. `.chip--win` adds an inset pine edge.
- **Win banner** (`.win-banner`): the single strongest proof on the page. Strong glass, 3px pine rail, a solid pine `winner` tag.
- **Log** (`.log`, `.log__item`): date column (7.5rem), title and note, right-aligned aside. Status via `data-status` (active pulses three times when revealed; shipped and paused go muted).
- **Tree** (`.tree`): infrastructure as a file tree with ruled connectors; `--off` nodes are muted.
- **Language toggle** (`.lang-toggle`): two labels and a pine thumb that slides by `clip-path` with the snap easing.
- **Badges**: solid pine (winner), `--live` (pine outline with a square dot), `--muted` (private, dates).
- **Header**: sticky, 88% night with blur, the small alberyt mark and the mono wordmark, mono nav whose active link gets a 1px pine underline that scales in.

## Do's and Don'ts

**Do**
- Keep one signal colour. If something new needs emphasis, use weight or position.
- Put dates, versions, hosts and statuses in mono; everything else in sans.
- Use rows (`.log`) for lists of work, not grids of identical cards.
- Respect reduced motion: the terrain falls back to a still poster, the caret and pulses stop.
- Self-host Plex (as alberyt.xyz does) in production; the Google Fonts import in `tokens.css` is for portability.

**Don't**
- Don't round anything.
- Don't add a second accent hue. Warning and danger exist for real errors only.
- Don't use glass without a backdrop behind it.
- Don't add more 3px rails; the win banner owns the only one.
- Don't add eyebrows above section titles. The hero already spends the budget: one mono tag line above the name, one meta line under the buttons.
- Don't number sections unless the numbers match a visible nav order.
