---
name: Signal
description: Product UI system for dashboards, admin panels, webmail and check-in desks. Quiet cool surfaces, one cobalt for action, Geist and Geist Mono.
colors:
  bg: "#f6f7f9"
  surface: "#ffffff"
  surface-2: "#eff1f4"
  border: "#e1e4ea"
  border-strong: "#c7ccd5"
  control: "#868a92"
  text: "#0e1117"
  text-2: "#3c4350"
  muted: "#5c6472"
  accent: "#2f5cff"
  accent-hover: "#1e47e6"
  accent-ink: "#ffffff"
  accent-soft: "rgba(47, 92, 255, 0.09)"
  success: "#17784c"
  warning: "#965800"
  danger: "#c4302a"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.6rem + 1.6vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  data:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  "1": "0.125rem"
  "2": "0.25rem"
  "3": "0.375rem"
  "4": "0.5rem"
  "5": "0.75rem"
  "6": "1rem"
  "7": "1.25rem"
  "8": "1.5rem"
  "9": "2rem"
  "10": "3rem"
  gutter: "1rem"
  container: "80rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    height: "2rem"
    padding: "0 0.75rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "2rem"
    padding: "0 0.75rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "2rem"
  side-nav-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    height: "2rem"
  badge:
    rounded: "{rounded.pill}"
    padding: "0.22em 0.6em"
  toast:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
---

# Design System: Signal

## Overview

**Creative North Star: "The Instrument Panel"**

A well-made instrument panel: every surface quiet, every number readable at a glance, and colour reserved for the two things that matter, what you can do (cobalt) and what is wrong (red, amber). It is built for screens people operate for hours: the webmail on Resend, homelab and analytics dashboards, the TEDx check-in desk, admin panels for client sites.

Brand lives in precise details instead of decoration: Geist Mono figures that line up, a search field with its shortcut, status words next to every status dot, toasts that say exactly what happened and offer an undo.

**Mode:** Operate.
**Dials (taste-skill):** DESIGN_VARIANCE 3 · MOTION_INTENSITY 2 · VISUAL_DENSITY 8.
**Source of truth:** `signal/tokens.css`. The cobalt is the "digital ink" `#2f5cff` from the earlier "Albert Portfolio" Stitch system.

**Key characteristics**
- 14px base, 4px grid, 32px controls (44px on touch).
- One family: Geist for interface, Geist Mono for figures, IDs, times and keys.
- Borders, not shadows. Shadows only for things that float (menus, dialogs, toasts).
- Light and dark, both following the OS, with equal care.
- Every state designed: loading, empty, error, selected, disabled.

## Logo and icons

The alberyt mark: a **peak** (the A of Albert, and the Retezat ridge), cut by a **contour** band where an A's crossbar would be, and ended by a **cursor** block. The peak takes `text`, the cursor takes `accent`, and nothing else about it changes between systems.

In Signal the peak is Text (`#0e1117`) and the cursor Cobalt (`#2f5cff`); in dark, `#e8eaee` and `#7090ff`.

- **Sidebar.** The small mark before the app's name (`mail.alberyt.xyz`) in Geist 600. The mark links home, so the cobalt cursor stays inside the Colour-Means-State Rule ("act here").
- **Favicon.** `alberyt-favicon.svg`, the light tile. For a tool with its own icon, keep that icon and put the cursor in its bottom-right corner in Cobalt, as orar does with its poster.

**Using the files**

- **Sizes.** From 32px up use `alberyt-mark-*`. Below 32px use `alberyt-mark-small-*`, which drops the contour band so it doesn't clog.
- **Files.** `brand/dist/systems/signal/` holds this system's files: `-dark` files are for dark grounds, `-light` files for light ones; each is painted in this system's colours. In HTML, inline the SVG instead (`brand/dist/alberyt-mark.svg`, or the snippet in `core/components.css`): the peak is `fill: currentColor`, the cursor `fill: var(--mark-signal)`, which `core/components.css` sets to `accent`, so it follows the theme.
- **Clear space.** Leave at least one cursor width (about a quarter of the mark's height) on every side. Never outline, rotate, stretch or recolour the parts separately.
- **Tile and favicon.** `alberyt-tile-*` is the app icon (field `bg`, peak `text`, cursor `accent`, corners rounded as much as this system rounds its cards); `alberyt-favicon.svg` is the tile in this system's default theme with the small cut.

### Icons
17 interface icons drawn on the mark's 24-unit grid: a 2-unit stroke, square caps, mitred joins, and any solid part (a calendar's header band, a PDF label, the share nodes) drawn as the cursor's flat block. They are painted in `currentColor`, so in a page they take the colour of the text around them. Set them at 16, 20 or 24px; at 16px the stroke is 1.33px. Files: `brand/dist/icons/` (one SVG each, plus `sprite.svg`), and orar.alberyt.xyz uses it. At Signal's 32px controls set them at 16px; in the side nav, 16px before the label.

## Colors

Cool neutrals with a faint cobalt bias, one action colour, three semantic colours.

### Primary
- **Cobalt** (`#2f5cff`): primary buttons, links, the active nav item (on a 9% wash), selected rows, focus rings, checkboxes and switches. Hover `#1e47e6`. In dark: `#7090ff`.

### Semantic (not accents)
- **Green** `#17784c`, **Amber** `#965800`, **Red** `#c4302a`: delivered/healthy, queued/degraded, failed/bounced. Always paired with a word.

### Neutral
- **Panel** (`#f6f7f9`): app background. **Surface** (`#ffffff`): sidebars, bars, tables, cards. **Well** (`#eff1f4`): hover rows, segmented tracks.
- **Hairline** (`#e1e4ea`) and **Hairline Strong** (`#c7ccd5`); **Control** (`#868a92`) for input borders.
- **Text** (`#0e1117`), **Text 2** (`#3c4350`), **Muted** (`#5c6472`).

### Dark theme (follows the OS)
`--bg #0b0d10`, `--surface #121418`, `--surface-2 #191c21`, `--border #24282f`, `--text #e8eaee`, `--muted #8b939f`, `--accent #7090ff`, `--accent-ink #0b0d10`. Floating surfaces add a 1px white-4% ring instead of a heavier shadow.

### Named Rules
**The Colour-Means-State Rule.** Colour on a screen means "act here" (cobalt) or "something changed" (semantic). Nothing else gets colour.
**The Word-With-Every-Dot Rule.** A status dot is never alone; the state is also written ("Delivered", "Bounced").

## Typography

**Interface:** Geist (400 to 700), fallback `ui-sans-serif, system-ui`.
**Data:** Geist Mono (400 to 600), fallback `ui-monospace`.

**Character:** neutral and exact. Weight changes carry hierarchy; size changes are small.

### Hierarchy
- **Display** (600, 32px to 44px, -0.025em): page titles on empty or overview screens only.
- **Headline** (600, 1.375rem): panel and page headings. **Title** (600, 1.0625rem): card and dialog titles.
- **Body** (400, 0.875rem, 1.5): everything else. **Small** (0.8125rem): table cells, nav.
- **Label** (500, 0.75rem): field labels, stat labels, table headers (sentence case, not uppercase).
- **Data** (Geist Mono, 0.8125rem, tabular): times, counts, IDs, money, percentages. Stat values at 1.5rem.

### Named Rules
**The Mono-For-Figures Rule.** Any number a person compares (counts, times, money, IDs) is set in Geist Mono with tabular figures. Prose numbers stay in Geist.

## Layout

- **App shell** (`.app`): a 13.5rem sidebar and a main column with a 3rem top bar. Under 800px the sidebar becomes a top strip.
- **Content**: an 80rem max for settings and forms, full width for tables.
- **Density**: 0.5rem to 1rem padding inside panels, 1rem between them. Rows 2.25rem in dense tables.
- **Stats** sit in one bordered strip (1px gaps), not as separate floating cards.

## Elevation & Depth

Flat by default. Three levels: `--shadow-sm` (segmented thumb), `--shadow-md` (menus, popovers), `--shadow-lg` (dialogs, toasts). Cards and tables rely on 1px borders only.

## Shapes

Small and consistent: 4px (badges' inner bits, kbd), 6px (buttons, inputs, nav items), 8px (cards, tables, stats, toasts), 12px (the app frame, dialogs). Status dots and badges are round; nothing else is a pill.

## Components

- **Side nav** (`.side-nav`): 2rem items, counts in mono on the right, active item on a cobalt wash. Group labels in muted micro text.
- **Top bar** (`.app__bar`): search with a `/` shortcut hint, primary action on the far right.
- **Stats** (`.stats`, `.stat`): label, mono value, a delta that says direction and by how much ("+38 vs prior week").
- **Dense table** (`.table--dense`): hover rows, `aria-selected` rows on the cobalt wash, right-aligned mono numbers.
- **Status** (`.status[data-state]`): ok, warn, fail, busy (busy blinks, unless reduced motion).
- **Segmented** filters, **switches**, **kbd** keys.
- **Toast** (`.toast`): inverted, bottom right, one sentence and an Undo.
- **Empty state** (`.empty`): names what will appear here and how to add the first one.

## Do's and Don'ts

**Do**
- Design the empty, loading and error state of every table and panel.
- Keep labels in sentence case and name things by what users recognise ("Notifications", not "Webhook config").
- Put destructive actions behind a dialog that names exactly what will be lost.
- Make every hover affordance also reachable by keyboard.

**Don't**
- Don't build dashboards out of identical metric cards with big numbers and icons; use the stats strip.
- Don't use colour for categories (labels, tags) that already have names.
- Don't use shadows on cards that don't float.
- Don't animate data in on load; numbers appear where they are.
